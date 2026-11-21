import { PrismaClient, Prisma } from "@oneatlas/database";
import type { NormalizedPricing } from "./types";

/**
 * Service for managing immutable historical pricing records for Models.dev.
 * Compares incoming prices with the latest active price specifically for this sourceId
 * and modelProviderEndpointId using Decimal.equals().
 */
export class PricingService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Appends a new PricingRecord for an endpoint if the pricing from this source has changed or is new.
   * Returns true if a new record was created, false if unchanged.
   */
  async recordPriceIfChanged(
    endpointId: string,
    sourceId: string,
    pricing: NormalizedPricing | null,
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    if (!pricing) return false;

    const db = tx || this.prisma;

    // Retrieve the most recent price record specifically for this endpoint AND this sourceId
    const latestPrice = await db.pricingRecord.findFirst({
      where: {
        modelProviderEndpointId: endpointId,
        sourceId,
      },
      orderBy: { observedAt: "desc" },
    });

    if (latestPrice) {
      const isInputEqual = this.areDecimalsEqual(
        latestPrice.inputPricePerMillion,
        pricing.inputPricePerMillion
      );
      const isOutputEqual = this.areDecimalsEqual(
        latestPrice.outputPricePerMillion,
        pricing.outputPricePerMillion
      );
      const isCacheReadEqual = this.areDecimalsEqual(
        latestPrice.cacheReadPricePerMillion,
        pricing.cacheReadPricePerMillion
      );
      const isCacheWriteEqual = this.areDecimalsEqual(
        latestPrice.cacheWritePricePerMillion,
        pricing.cacheWritePricePerMillion
      );

      // If all prices are identical to the source's last observation, do not insert duplicate
      if (isInputEqual && isOutputEqual && isCacheReadEqual && isCacheWriteEqual) {
        return false;
      }
    }

    // Insert new historical price record
    await db.pricingRecord.create({
      data: {
        modelProviderEndpointId: endpointId,
        sourceId,
        inputPricePerMillion: pricing.inputPricePerMillion,
        outputPricePerMillion: pricing.outputPricePerMillion,
        cacheReadPricePerMillion: pricing.cacheReadPricePerMillion,
        cacheWritePricePerMillion: pricing.cacheWritePricePerMillion,
        currency: pricing.currency,
        pricingUnit: pricing.pricingUnit,
        observedAt: new Date(),
      },
    });

    return true;
  }

  private areDecimalsEqual(
    a: Prisma.Decimal | null | undefined,
    b: Prisma.Decimal | null | undefined
  ): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.equals(b);
  }
}
