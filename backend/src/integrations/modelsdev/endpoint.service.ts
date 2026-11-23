import { PrismaClient, ModelProviderEndpoint, Prisma } from "@oneatlas/database";
import type { NormalizedEndpoint } from "./types";
import { deriveCanonicalSlug } from "./mapper";
import { VERIFIED_MODEL_ALIASES } from "../../domain/identity-resolution/alias-resolver";

export type EndpointSyncStatus = "inserted" | "updated" | "unchanged" | "unresolved";

const PROVIDER_SLUG_ALIASES: Record<string, string> = {
  anthropic: "anthropic-api",
  "anthropic-api": "anthropic",
  openai: "openai-api",
  "openai-api": "openai",
  togetherai: "together-ai",
  "together-ai": "togetherai",
  google: "google-vertex",
  "google-vertex": "google",
};

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

    // Strategy A: Explicit canonical_model_id from provider offering
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

    // Strategy B: Direct modelExternalId match in mappings or by slug
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

    // Strategy C: Provider-prefixed model ID (e.g. "anthropic/claude-3-5-sonnet-20241022" or "openai/gpt-4o")
    if (!canonicalModelId) {
      const prefixedId = `${normalized.providerExternalId}/${normalized.modelExternalId}`;
      const mapping = await db.modelSourceMapping.findUnique({
        where: {
          sourceId_externalModelId: {
            sourceId,
            externalModelId: prefixedId,
          },
        },
      });

      if (mapping) {
        canonicalModelId = mapping.modelId;
      } else {
        const slug = deriveCanonicalSlug(prefixedId);
        const model = await db.model.findUnique({ where: { slug } });
        if (model) {
          canonicalModelId = model.id;
        }
      }
    }

    // Strategy D: Verified alias mapping
    if (!canonicalModelId) {
      const aliasTarget =
        VERIFIED_MODEL_ALIASES[normalized.modelExternalId] ||
        VERIFIED_MODEL_ALIASES[`${normalized.providerExternalId}/${normalized.modelExternalId}`];

      if (aliasTarget) {
        const model = await db.model.findUnique({ where: { slug: aliasTarget } });
        if (model) {
          canonicalModelId = model.id;
        }
      }
    }

    // If still unresolved, preserve integrity (never guess or fabricate)
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
      let provider = await db.provider.findUnique({ where: { slug: providerSlug } });

      if (!provider && PROVIDER_SLUG_ALIASES[providerSlug]) {
        provider = await db.provider.findUnique({ where: { slug: PROVIDER_SLUG_ALIASES[providerSlug] } });
      }

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

    const inModalities = normalized.inputModalities && normalized.inputModalities.length > 0
      ? normalized.inputModalities
      : ["text"];
    const outModalities = normalized.outputModalities && normalized.outputModalities.length > 0
      ? normalized.outputModalities
      : ["text"];

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
          inputModalities: inModalities,
          outputModalities: outModalities,
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
        inputModalities: inModalities,
        outputModalities: outModalities,
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
