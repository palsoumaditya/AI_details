import {
  PrismaClient,
  Prisma,
  EndpointStatus,
} from "@/generated/prisma/client";
import type { EndpointResolutionInput, EndpointResolutionResult } from "./types";

export class EndpointResolver {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolves canonical Provider and canonical Model, then creates or updates ModelProviderEndpoint
   * and links it via EndpointSourceMapping.
   *
   * STRICT SAFETY:
   * If either canonical Model or canonical Provider cannot be authoritatively resolved,
   * the endpoint remains unresolved. It is NEVER attached to a guessed or random model.
   */
  async resolveEndpoint(
    input: EndpointResolutionInput,
    canonicalModelId: string | null,
    tx?: Prisma.TransactionClient
  ): Promise<EndpointResolutionResult> {
    const db = tx || this.prisma;

    // 1. Model resolution check
    if (!canonicalModelId) {
      return {
        status: "UNRESOLVED",
        unresolvedReason: `Canonical model identity for model external ID '${input.modelExternalId}' is unresolved. Endpoint cannot be created without a verified canonical model.`,
      };
    }

    // 2. Resolve canonical Provider
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

    // 3. Resolve or create ModelProviderEndpoint (modelId + providerId + endpointKey)
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

      // Check change detection
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

      // Upsert EndpointSourceMapping
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
      // Create new ModelProviderEndpoint
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

      // Create EndpointSourceMapping
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
