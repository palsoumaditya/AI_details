import { PrismaClient, Prisma, ModelProviderEndpoint } from "@/generated/prisma/client";
import { PricingService } from "./pricing.service";
import type { NormalizedEndpoint } from "./types";

/**
 * Service for managing provider-specific model endpoints and linking pricing snapshots.
 */
export class EndpointService {
  private readonly pricingService: PricingService;

  constructor(private readonly prisma: PrismaClient) {
    this.pricingService = new PricingService(prisma);
  }

  /**
   * Upserts ModelProviderEndpoint and delegates pricing record persistence.
   */
  async resolveOrCreateEndpoint(
    modelId: string,
    providerId: string,
    sourceId: string,
    norm: NormalizedEndpoint,
    tx?: Prisma.TransactionClient
  ): Promise<{ endpoint: ModelProviderEndpoint; isNew: boolean; priceRecorded: boolean }> {
    const db = tx || this.prisma;

    let isNew = false;
    let endpoint = await db.modelProviderEndpoint.findUnique({
      where: {
        modelId_providerId_endpointKey: {
          modelId,
          providerId,
          endpointKey: norm.endpointKey,
        },
      },
    });

    if (!endpoint) {
      endpoint = await db.modelProviderEndpoint.create({
        data: {
          modelId,
          providerId,
          endpointKey: norm.endpointKey,
          name: norm.name,
          contextWindow: norm.contextWindow,
          maxOutputTokens: norm.maxOutputTokens,
          status: norm.status,
          isModerated: norm.isModerated,
          lastSeenAt: new Date(),
        },
      });
      isNew = true;
    } else {
      endpoint = await db.modelProviderEndpoint.update({
        where: { id: endpoint.id },
        data: {
          contextWindow: norm.contextWindow ?? endpoint.contextWindow,
          maxOutputTokens: norm.maxOutputTokens ?? endpoint.maxOutputTokens,
          status: norm.status,
          lastSeenAt: new Date(),
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

    return { endpoint, isNew, priceRecorded };
  }
}
