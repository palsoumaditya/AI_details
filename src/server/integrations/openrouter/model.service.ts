import { PrismaClient, Prisma, Model } from "@/generated/prisma/client";
import type { NormalizedModel } from "./types";

/**
 * Service for resolving, deduplicating, and persisting canonical AI models.
 */
export class ModelService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolves or creates a canonical Model and associates ModelSourceMapping and ModelLab.
   */
  async resolveOrCreateModel(
    sourceId: string,
    norm: NormalizedModel,
    tx?: Prisma.TransactionClient
  ): Promise<{ model: Model; isNew: boolean }> {
    const db = tx || this.prisma;

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
      await db.modelSourceMapping.update({
        where: { id: existingMapping.id },
        data: {
          lastFetchedAt: new Date(),
          payloadHash: norm.payloadHash,
          externalSlug: norm.slug,
        },
      });

      return { model: existingMapping.model, isNew: false };
    }

    // 2. Check if canonical model already exists by slug
    let model = await db.model.findUnique({
      where: { slug: norm.slug },
    });

    let isNew = false;
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
    }

    // 3. Link to AI Lab via ModelLab if lab is recognized
    if (norm.inferredLabSlug) {
      const lab = await db.aiLab.findUnique({
        where: { slug: norm.inferredLabSlug },
      });

      if (lab) {
        await db.modelLab.upsert({
          where: {
            modelId_aiLabId_relationshipType: {
              modelId: model.id,
              aiLabId: lab.id,
              relationshipType: "CREATOR",
            },
          },
          update: {},
          create: {
            modelId: model.id,
            aiLabId: lab.id,
            relationshipType: "CREATOR",
          },
        });
      }
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

    return { model, isNew };
  }
}
