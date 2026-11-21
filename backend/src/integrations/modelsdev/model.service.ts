import { PrismaClient, Model, Prisma } from "@oneatlas/database";
import type { NormalizedCanonicalModel } from "./types";
import type { EntitySyncStatus } from "./provider.service";

export class ModelService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolves or creates a canonical Model and links it via ModelSourceMapping.
   * Performs fine-grained change detection to guarantee true idempotency (zero unnecessary updates).
   */
  async resolveOrCreateCanonicalModel(
    sourceId: string,
    normalized: NormalizedCanonicalModel,
    tx?: Prisma.TransactionClient
  ): Promise<{ model: Model; status: EntitySyncStatus }> {
    const db = tx || this.prisma;

    // 1. Check existing source mapping for Models.dev
    const existingMapping = await db.modelSourceMapping.findUnique({
      where: {
        sourceId_externalModelId: {
          sourceId,
          externalModelId: normalized.externalId,
        },
      },
      include: { model: true },
    });

    if (existingMapping) {
      const model = existingMapping.model;

      // Check if any fields have changed
      const isNameChanged = model.name !== normalized.name;
      const isDescChanged = normalized.description !== null && model.description !== normalized.description;
      const isFamilyChanged = normalized.family !== null && model.family !== normalized.family;
      const isLicenseChanged = normalized.license !== null && model.license !== normalized.license;
      const isKnowledgeChanged = normalized.knowledgeCutoff !== null && model.knowledgeCutoff !== normalized.knowledgeCutoff;
      const isContextChanged = normalized.contextWindow !== null && model.contextWindow !== normalized.contextWindow;
      const isMaxOutputChanged = normalized.maxOutputTokens !== null && model.maxOutputTokens !== normalized.maxOutputTokens;
      const isHashChanged = existingMapping.payloadHash !== normalized.payloadHash;

      if (
        !isNameChanged &&
        !isDescChanged &&
        !isFamilyChanged &&
        !isLicenseChanged &&
        !isKnowledgeChanged &&
        !isContextChanged &&
        !isMaxOutputChanged &&
        !isHashChanged
      ) {
        return { model, status: "unchanged" };
      }

      // Fields changed -> update canonical model and mapping
      const updatedModel = await db.model.update({
        where: { id: model.id },
        data: {
          name: normalized.name,
          description: normalized.description || model.description,
          family: normalized.family || model.family,
          license: normalized.license || model.license,
          knowledgeCutoff: normalized.knowledgeCutoff || model.knowledgeCutoff,
          releaseDate: model.releaseDate || normalized.releaseDate,
          contextWindow: normalized.contextWindow ?? model.contextWindow,
          maxOutputTokens: normalized.maxOutputTokens ?? model.maxOutputTokens,
          capabilities: normalized.capabilities
            ? (normalized.capabilities as Prisma.InputJsonValue)
            : (model.capabilities as Prisma.InputJsonValue) ?? Prisma.DbNull,
        },
      });

      await db.modelSourceMapping.update({
        where: { id: existingMapping.id },
        data: {
          payloadHash: normalized.payloadHash,
          lastFetchedAt: new Date(),
        },
      });

      return { model: updatedModel, status: "updated" };
    }

    // 2. Check if a canonical Model exists with this exact slug (e.g. from OpenRouter)
    const existingModelBySlug = await db.model.findUnique({
      where: { slug: normalized.slug },
    });

    if (existingModelBySlug) {
      // Reconcile cross-source: link Models.dev mapping to the existing model
      await db.modelSourceMapping.create({
        data: {
          modelId: existingModelBySlug.id,
          sourceId,
          externalModelId: normalized.externalId,
          externalSlug: normalized.slug,
          payloadHash: normalized.payloadHash,
          lastFetchedAt: new Date(),
        },
      });

      // Enrich missing canonical fields according to field ownership policy
      const updatedModel = await db.model.update({
        where: { id: existingModelBySlug.id },
        data: {
          family: existingModelBySlug.family || normalized.family,
          license: existingModelBySlug.license || normalized.license,
          knowledgeCutoff: existingModelBySlug.knowledgeCutoff || normalized.knowledgeCutoff,
          releaseDate: existingModelBySlug.releaseDate || normalized.releaseDate,
          isOpenWeight: existingModelBySlug.isOpenWeight || normalized.isOpenWeight,
          capabilities: existingModelBySlug.capabilities
            ? (existingModelBySlug.capabilities as Prisma.InputJsonValue)
            : (normalized.capabilities as Prisma.InputJsonValue) ?? Prisma.DbNull,
        },
      });

      // Link AI Lab if not already linked
      if (normalized.inferredLabSlug) {
        await this.linkAiLab(existingModelBySlug.id, normalized.inferredLabSlug, db);
      }

      return { model: updatedModel, status: "updated" };
    }

    // 3. Brand new model: create Model and ModelSourceMapping
    let targetSlug = normalized.slug;
    const slugExists = await db.model.findUnique({ where: { slug: targetSlug } });
    if (slugExists) {
      targetSlug = `${normalized.slug}-${Date.now().toString(36)}`;
    }

    const newModel = await db.model.create({
      data: {
        slug: targetSlug,
        name: normalized.name,
        description: normalized.description,
        family: normalized.family,
        releaseDate: normalized.releaseDate,
        knowledgeCutoff: normalized.knowledgeCutoff,
        license: normalized.license,
        isReasoning: normalized.isReasoning,
        isOpenWeight: normalized.isOpenWeight,
        inputModalities: normalized.inputModalities,
        outputModalities: normalized.outputModalities,
        contextWindow: normalized.contextWindow,
        maxOutputTokens: normalized.maxOutputTokens,
        capabilities: normalized.capabilities
          ? (normalized.capabilities as Prisma.InputJsonValue)
          : Prisma.DbNull,
        sourceMappings: {
          create: {
            sourceId,
            externalModelId: normalized.externalId,
            externalSlug: normalized.slug,
            payloadHash: normalized.payloadHash,
            lastFetchedAt: new Date(),
          },
        },
      },
    });

    if (normalized.inferredLabSlug) {
      await this.linkAiLab(newModel.id, normalized.inferredLabSlug, db);
    }

    return { model: newModel, status: "inserted" };
  }

  /**
   * Links a model to an AI Lab with CREATOR role when authoritative.
   */
  private async linkAiLab(
    modelId: string,
    labSlug: string,
    db: Prisma.TransactionClient | PrismaClient
  ): Promise<void> {
    const lab = await db.aiLab.findUnique({
      where: { slug: labSlug },
    });

    if (!lab) return;

    await db.modelLab.upsert({
      where: {
        modelId_aiLabId_relationshipType: {
          modelId,
          aiLabId: lab.id,
          relationshipType: "CREATOR",
        },
      },
      update: {},
      create: {
        modelId,
        aiLabId: lab.id,
        relationshipType: "CREATOR",
      },
    });
  }
}
