import { PrismaClient, ModelProviderEndpoint, Prisma } from "@oneatlas/database";
import type { NormalizedEndpoint } from "./types";
import { deriveCanonicalSlug } from "./mapper";

export type EndpointSyncStatus = "inserted" | "updated" | "unchanged" | "unresolved";

export class EndpointService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolves canonical Model and Provider, then creates or updates ModelProviderEndpoint
   * and links it via EndpointSourceMapping.
   */
  async resolveOrCreateEndpoint(
    sourceId: string,
    normalized: NormalizedEndpoint,
    tx?: Prisma.TransactionClient
  ): Promise<{ endpoint?: ModelProviderEndpoint; status: EndpointSyncStatus }> {
    const db = tx || this.prisma;

    // 1. Resolve canonical Model
    let canonicalModelId: string | null = null;

    // Try explicit canonical_model_id first
    if (normalized.canonicalModelId) {
      const mapping = await db.modelSourceMapping.findUnique({
        where: {
          sourceId_externalModelId: {
            sourceId,
            externalModelId: normalized.canonicalModelId,
          },
        },
      });

      if (mapping) {
        canonicalModelId = mapping.modelId;
      } else {
        const slug = deriveCanonicalSlug(normalized.canonicalModelId);
        const model = await db.model.findUnique({ where: { slug } });
        if (model) {
          canonicalModelId = model.id;
        }
      }
    }

    // Fallback to modelExternalId if no canonical_model_id or not found yet
    if (!canonicalModelId) {
      const mapping = await db.modelSourceMapping.findUnique({
        where: {
          sourceId_externalModelId: {
            sourceId,
            externalModelId: normalized.modelExternalId,
          },
        },
      });

      if (mapping) {
        canonicalModelId = mapping.modelId;
      } else {
        const slug = deriveCanonicalSlug(normalized.modelExternalId);
        const model = await db.model.findUnique({ where: { slug } });
        if (model) {
          canonicalModelId = model.id;
        }
      }
    }

    // If still unresolved, do NOT attach to a guessed model
    if (!canonicalModelId) {
      return { status: "unresolved" };
    }

    // 2. Resolve Provider
    let providerId: string | null = null;
    const providerMapping = await db.providerSourceMapping.findUnique({
      where: {
        sourceId_externalProviderId: {
          sourceId,
          externalProviderId: normalized.providerExternalId,
        },
      },
    });

    if (providerMapping) {
      providerId = providerMapping.providerId;
    } else {
      const providerSlug = normalized.providerExternalId.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      const provider = await db.provider.findUnique({ where: { slug: providerSlug } });
      if (provider) {
        providerId = provider.id;
      }
    }

    if (!providerId) {
      return { status: "unresolved" };
    }

    // 3. Resolve or create ModelProviderEndpoint
    const existingEndpoint = await db.modelProviderEndpoint.findUnique({
      where: {
        modelId_providerId_endpointKey: {
          modelId: canonicalModelId,
          providerId,
          endpointKey: normalized.endpointKey,
        },
      },
      include: {
        sourceMappings: {
          where: { sourceId },
        },
      },
    });

    if (existingEndpoint) {
      const isContextChanged =
        normalized.contextWindow !== null &&
        existingEndpoint.contextWindow !== normalized.contextWindow;
      const isMaxOutputChanged =
        normalized.maxOutputTokens !== null &&
        existingEndpoint.maxOutputTokens !== normalized.maxOutputTokens;
      const isNameChanged =
        normalized.name !== null && existingEndpoint.name !== normalized.name;
      const hasMapping = existingEndpoint.sourceMappings.length > 0;
      const isHashChanged =
        hasMapping &&
        existingEndpoint.sourceMappings[0].payloadHash !== normalized.payloadHash;

      if (!isContextChanged && !isMaxOutputChanged && !isNameChanged && hasMapping && !isHashChanged) {
        return { endpoint: existingEndpoint, status: "unchanged" };
      }

      // Update endpoint
      const updatedEndpoint = await db.modelProviderEndpoint.update({
        where: { id: existingEndpoint.id },
        data: {
          name: normalized.name || existingEndpoint.name,
          contextWindow: normalized.contextWindow ?? existingEndpoint.contextWindow,
          maxOutputTokens: normalized.maxOutputTokens ?? existingEndpoint.maxOutputTokens,
          capabilities: normalized.capabilities
            ? (normalized.capabilities as Prisma.InputJsonValue)
            : (existingEndpoint.capabilities as Prisma.InputJsonValue) ?? Prisma.DbNull,
          lastSeenAt: new Date(),
        },
      });

      // Ensure EndpointSourceMapping exists and is updated
      await db.endpointSourceMapping.upsert({
        where: {
          sourceId_externalEndpointId: {
            sourceId,
            externalEndpointId: normalized.externalEndpointId,
          },
        },
        update: {
          payloadHash: normalized.payloadHash,
          lastFetchedAt: new Date(),
        },
        create: {
          endpointId: existingEndpoint.id,
          sourceId,
          externalEndpointId: normalized.externalEndpointId,
          payloadHash: normalized.payloadHash,
          lastFetchedAt: new Date(),
        },
      });

      return { endpoint: updatedEndpoint, status: "updated" };
    }

    // Create new endpoint and EndpointSourceMapping
    const newEndpoint = await db.modelProviderEndpoint.create({
      data: {
        modelId: canonicalModelId,
        providerId,
        endpointKey: normalized.endpointKey,
        name: normalized.name,
        contextWindow: normalized.contextWindow,
        maxOutputTokens: normalized.maxOutputTokens,
        capabilities: normalized.capabilities
          ? (normalized.capabilities as Prisma.InputJsonValue)
          : Prisma.DbNull,
        status: "ONLINE",
        lastSeenAt: new Date(),
        sourceMappings: {
          create: {
            sourceId,
            externalEndpointId: normalized.externalEndpointId,
            payloadHash: normalized.payloadHash,
            lastFetchedAt: new Date(),
          },
        },
      },
    });

    return { endpoint: newEndpoint, status: "inserted" };
  }
}
