import { PrismaClient, Prisma, Model } from "@oneatlas/database";
import type { NormalizedModel } from "./types";
import { LabResolver } from "../../domain/identity-resolution/lab-resolver";

export type ModelSyncStatus = "inserted" | "updated" | "unchanged";

/**
 * Service for resolving, deduplicating, and persisting canonical AI models.
 */
export class ModelService {
  private readonly labResolver: LabResolver;

  constructor(private readonly prisma: PrismaClient) {
    this.labResolver = new LabResolver(prisma);
  }

  /**
   * Resolves or creates a canonical Model and associates ModelSourceMapping and ModelLab.
   * Enforces fine-grained change detection for true idempotency (zero redundant SQL updates).
   */
  async resolveOrCreateModel(
    sourceId: string,
    norm: NormalizedModel,
    tx?: Prisma.TransactionClient
  ): Promise<{ model: Model; isNew: boolean; status: ModelSyncStatus }> {
    const db = tx || this.prisma;

    const labSlug =
      norm.inferredLabSlug ||
      this.labResolver.resolveLabSlug(norm.externalId, norm.name, norm.architectureType);

    // 1. Check existing ModelSourceMapping
    const existingMapping = await db.modelSourceMapping.findUnique({
      where: {
        sourceId_externalModelId: {
          sourceId,
          externalModelId: norm.externalId,
        },
      },
      include: { model: true },
    });

    if (existingMapping) {
      const model = existingMapping.model;

      // Always link AI Lab if known
      if (labSlug) {
        await this.labResolver.linkModelToLab(model.id, labSlug, db);
      }

      // If source payloadHash is unchanged, this source has no new data -> UNCHANGED
      if (norm.payloadHash && existingMapping.payloadHash === norm.payloadHash) {
        return { model, isNew: false, status: "unchanged" };
      }

      // If hash changed, check if normalized fields changed
      const isContextChanged =
        norm.contextWindow !== null &&
        norm.contextWindow !== undefined &&
        model.contextWindow !== norm.contextWindow;
      const isReasoningChanged = norm.isReasoning !== model.isReasoning;
      const isOpenWeightChanged = norm.isOpenWeight !== model.isOpenWeight;

      if (!isContextChanged && !isReasoningChanged && !isOpenWeightChanged) {
        await db.modelSourceMapping.update({
          where: { id: existingMapping.id },
          data: {
            payloadHash: norm.payloadHash,
            externalSlug: norm.slug,
            lastFetchedAt: new Date(),
          },
        });
        return { model, isNew: false, status: "unchanged" };
      }

      const updatedModel = await db.model.update({
        where: { id: model.id },
        data: {
          contextWindow: norm.contextWindow ?? model.contextWindow,
          isReasoning: norm.isReasoning || model.isReasoning,
          isOpenWeight: norm.isOpenWeight || model.isOpenWeight,
        },
      });

      await db.modelSourceMapping.update({
        where: { id: existingMapping.id },
        data: {
          lastFetchedAt: new Date(),
          payloadHash: norm.payloadHash,
          externalSlug: norm.slug,
        },
      });

      return { model: updatedModel, isNew: false, status: "updated" };
    }

    // 2. Check if canonical model already exists by slug
    let model = await db.model.findUnique({
      where: { slug: norm.slug },
    });

    let isNew = false;
    let status: ModelSyncStatus = "inserted";

    if (!model) {
      model = await db.model.create({
        data: {
          slug: norm.slug,
          name: norm.name,
          description: norm.description,
          contextWindow: norm.contextWindow,
          inputModalities: norm.inputModalities,
          outputModalities: norm.outputModalities,
          architectureType: norm.architectureType,
          isReasoning: norm.isReasoning,
          isOpenWeight: norm.isOpenWeight,
          capabilities: norm.capabilities ?? undefined,
          status: "ACTIVE",
        },
      });
      isNew = true;
      status = "inserted";
    } else {
      status = "updated";
    }

    // 3. Link to AI Lab via ModelLab if lab is recognized
    if (labSlug) {
      await this.labResolver.linkModelToLab(model.id, labSlug, db);
    }

    // 4. Create ModelSourceMapping
    await db.modelSourceMapping.create({
      data: {
        sourceId,
        modelId: model.id,
        externalModelId: norm.externalId,
        externalSlug: norm.slug,
        payloadHash: norm.payloadHash,
        lastFetchedAt: new Date(),
      },
    });

    return { model, isNew, status };
  }
}
