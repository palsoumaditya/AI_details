import { PrismaClient, Prisma, ModelProviderEndpoint } from "@/generated/prisma/client";
import { PricingService } from "./pricing.service";
import type { NormalizedEndpoint } from "./types";

export type EndpointSyncStatus = "inserted" | "updated" | "unchanged";

/**
 * Service for managing provider-specific model endpoints and linking pricing snapshots.
 */
export class EndpointService {
  private readonly pricingService: PricingService;

  constructor(private readonly prisma: PrismaClient) {
    this.pricingService = new PricingService(prisma);
  }

  /**
   * Upserts ModelProviderEndpoint, ensures EndpointSourceMapping exists,
   * detects fine-grained changes, and delegates pricing record persistence.
   */
  async resolveOrCreateEndpoint(
    modelId: string,
    providerId: string,
    sourceId: string,
    norm: NormalizedEndpoint,
    tx?: Prisma.TransactionClient
  ): Promise<{
    endpoint: ModelProviderEndpoint;
    status: EndpointSyncStatus;
    isNew: boolean;
    priceRecorded: boolean;
  }> {
    const db = tx || this.prisma;

    const existingEndpoint = await db.modelProviderEndpoint.findUnique({
      where: {
        modelId_providerId_endpointKey: {
          modelId,
          providerId,
          endpointKey: norm.endpointKey,
        },
      },
      include: {
        sourceMappings: {
          where: { sourceId },
        },
      },
    });

    let endpoint: ModelProviderEndpoint;
    let status: EndpointSyncStatus = "unchanged";

    const inputModalities = norm.inputModalities || [];
    const outputModalities = norm.outputModalities || [];

    if (!existingEndpoint) {
      endpoint = await db.modelProviderEndpoint.create({
        data: {
          modelId,
          providerId,
          endpointKey: norm.endpointKey,
          name: norm.name,
          contextWindow: norm.contextWindow,
          maxOutputTokens: norm.maxOutputTokens,
          inputModalities,
          outputModalities,
          status: norm.status,
          isModerated: norm.isModerated,
          lastSeenAt: new Date(),
          sourceMappings: {
            create: {
              sourceId,
              externalEndpointId: norm.endpointKey,
              payloadHash: norm.payloadHash,
              lastFetchedAt: new Date(),
            },
          },
        },
      });
      status = "inserted";
    } else {
      const hasMapping = existingEndpoint.sourceMappings.length > 0;
      const mappingHash = hasMapping ? existingEndpoint.sourceMappings[0].payloadHash : null;

      const isContextChanged =
        norm.contextWindow !== null && existingEndpoint.contextWindow !== norm.contextWindow;
      const isMaxOutputChanged =
        norm.maxOutputTokens !== null &&
        existingEndpoint.maxOutputTokens !== norm.maxOutputTokens;
      const isStatusChanged = existingEndpoint.status !== norm.status;
      const isModeratedChanged = existingEndpoint.isModerated !== norm.isModerated;
      const isModalitiesChanged =
        (inputModalities.length > 0 &&
          JSON.stringify(existingEndpoint.inputModalities) !== JSON.stringify(inputModalities)) ||
        (outputModalities.length > 0 &&
          JSON.stringify(existingEndpoint.outputModalities) !== JSON.stringify(outputModalities));
      const isHashChanged = hasMapping && mappingHash !== norm.payloadHash;

      if (
        !isContextChanged &&
        !isMaxOutputChanged &&
        !isStatusChanged &&
        !isModeratedChanged &&
        !isModalitiesChanged &&
        hasMapping &&
        !isHashChanged
      ) {
        endpoint = existingEndpoint;
        status = "unchanged";
      } else {
        endpoint = await db.modelProviderEndpoint.update({
          where: { id: existingEndpoint.id },
          data: {
            name: norm.name || existingEndpoint.name,
            contextWindow: norm.contextWindow ?? existingEndpoint.contextWindow,
            maxOutputTokens: norm.maxOutputTokens ?? existingEndpoint.maxOutputTokens,
            inputModalities:
              inputModalities.length > 0 ? inputModalities : existingEndpoint.inputModalities,
            outputModalities:
              outputModalities.length > 0 ? outputModalities : existingEndpoint.outputModalities,
            status: norm.status,
            isModerated: norm.isModerated,
            lastSeenAt: new Date(),
          },
        });
        status = "updated";
      }

      // Ensure EndpointSourceMapping exists and is up to date
      await db.endpointSourceMapping.upsert({
        where: {
          sourceId_externalEndpointId: {
            sourceId,
            externalEndpointId: norm.endpointKey,
          },
        },
        update: {
          endpointId: endpoint.id,
          payloadHash: norm.payloadHash,
          lastFetchedAt: new Date(),
        },
        create: {
          endpointId: endpoint.id,
          sourceId,
          externalEndpointId: norm.endpointKey,
          payloadHash: norm.payloadHash,
          lastFetchedAt: new Date(),
        },
      });
    }

    // Append historical pricing if changed
    const priceRecorded = await this.pricingService.recordPriceIfChanged(
      endpoint.id,
      sourceId,
      norm.pricing,
      db
    );

    return {
      endpoint,
      status,
      isNew: status === "inserted",
      priceRecorded,
    };
  }
}
