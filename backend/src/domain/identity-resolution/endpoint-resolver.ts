import {
  PrismaClient,
  Prisma,
  EndpointStatus,
} from "@oneatlas/database";
import type { EndpointResolutionInput, EndpointResolutionResult } from "./types";

/**
 * Resolves inference endpoint identifiers and links model provider endpoint relationships.
 *
 * Ensures strict integrity: an endpoint is never created or updated unless both the canonical
 * model and canonical provider have been authoritatively resolved.
 */
export class EndpointResolver {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolves canonical model and provider references, then creates or updates the ModelProviderEndpoint.
   *
   * @param input - Endpoint details including endpoint key, model external ID, and provider ID.
   * @param canonicalModelId - Verified canonical model ID (null if unresolved).
   * @param tx - Optional transaction client.
   * @returns EndpointResolutionResult indicating resolution status ('RESOLVED' or 'UNRESOLVED').
   */
  async resolveEndpoint(
    input: EndpointResolutionInput,
    canonicalModelId: string | null,
    tx?: Prisma.TransactionClient
  ): Promise<EndpointResolutionResult> {
    const db = tx || this.prisma;

    if (!canonicalModelId) {
      return {
        status: "UNRESOLVED",
        unresolvedReason: `Canonical model identity for model external ID '${input.modelExternalId}' is unresolved. Endpoint cannot be created without a verified canonical model.`,
      };
    }

    let providerId: string | null = null;
    const providerMapping = await db.providerSourceMapping.findUnique({
      where: {
        sourceId_externalProviderId: {
          sourceId: input.sourceId,
          externalProviderId: input.providerExternalId,
        },
      },
    });

    if (providerMapping) {
      providerId = providerMapping.providerId;
    } else {
      const providerSlug = input.providerExternalId.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      const provider = await db.provider.findUnique({ where: { slug: providerSlug } });
      if (provider) {
        providerId = provider.id;
      }
    }

    if (!providerId) {
      return {
        status: "UNRESOLVED",
        canonicalModelId,
        unresolvedReason: `Canonical provider identity for provider '${input.providerExternalId}' is unresolved.`,
      };
    }

    // Lookup existing endpoint record by model, provider, and unique endpoint key
    const existingEndpoint = await db.modelProviderEndpoint.findUnique({
      where: {
        modelId_providerId_endpointKey: {
          modelId: canonicalModelId,
          providerId,
          endpointKey: input.endpointKey,
        },
      },
      include: {
        sourceMappings: {
          where: { sourceId: input.sourceId },
        },
      },
    });

    let endpointId: string;
    let endpointSyncStatus: "inserted" | "updated" | "unchanged" = "inserted";

    if (existingEndpoint) {
      endpointId = existingEndpoint.id;

      const existingMapping = existingEndpoint.sourceMappings[0];
      const isHashUnchanged =
        input.payloadHash && existingMapping && existingMapping.payloadHash === input.payloadHash;

      const isContextChanged =
        input.contextWindow !== undefined &&
        input.contextWindow !== null &&
        existingEndpoint.contextWindow !== input.contextWindow;
      const isOutputChanged =
        input.maxOutputTokens !== undefined &&
        input.maxOutputTokens !== null &&
        existingEndpoint.maxOutputTokens !== input.maxOutputTokens;
      const isStatusChanged = input.status && existingEndpoint.status !== input.status;

      if (isHashUnchanged && !isContextChanged && !isOutputChanged && !isStatusChanged) {
        endpointSyncStatus = "unchanged";
      } else {
        await db.modelProviderEndpoint.update({
          where: { id: endpointId },
          data: {
            contextWindow: input.contextWindow ?? existingEndpoint.contextWindow,
            maxOutputTokens: input.maxOutputTokens ?? existingEndpoint.maxOutputTokens,
            status: input.status as EndpointStatus ?? existingEndpoint.status,
            isModerated: input.isModerated ?? existingEndpoint.isModerated,
            lastSeenAt: new Date(),
          },
        });
        endpointSyncStatus = "updated";
      }

      const externalEndpointId = `${input.providerExternalId}/${input.modelExternalId}`;
      await db.endpointSourceMapping.upsert({
        where: {
          sourceId_externalEndpointId: {
            sourceId: input.sourceId,
            externalEndpointId,
          },
        },
        update: {
          payloadHash: input.payloadHash,
          lastFetchedAt: new Date(),
        },
        create: {
          endpointId,
          sourceId: input.sourceId,
          externalEndpointId,
          payloadHash: input.payloadHash,
          lastFetchedAt: new Date(),
        },
      });
    } else {
      const newEndpoint = await db.modelProviderEndpoint.create({
        data: {
          modelId: canonicalModelId,
          providerId,
          endpointKey: input.endpointKey,
          name: input.name,
          contextWindow: input.contextWindow,
          maxOutputTokens: input.maxOutputTokens,
          capabilities: input.capabilities ?? Prisma.JsonNull,
          status: (input.status as EndpointStatus) || "ONLINE",
          isModerated: Boolean(input.isModerated),
          lastSeenAt: new Date(),
        },
      });

      endpointId = newEndpoint.id;
      endpointSyncStatus = "inserted";

      const externalEndpointId = `${input.providerExternalId}/${input.modelExternalId}`;
      await db.endpointSourceMapping.create({
        data: {
          endpointId,
          sourceId: input.sourceId,
          externalEndpointId,
          payloadHash: input.payloadHash,
          lastFetchedAt: new Date(),
        },
      });
    }

    return {
      status: "RESOLVED",
      endpointId,
      canonicalModelId,
      canonicalProviderId: providerId,
      endpointSyncStatus,
    };
  }
}
