import { PrismaClient, Provider, Prisma } from "@/generated/prisma/client";
import type { NormalizedProvider } from "./types";

export type EntitySyncStatus = "inserted" | "updated" | "unchanged";

export class ProviderService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolves or creates a canonical Provider and links it via ProviderSourceMapping.
   * Performs fine-grained change detection to guarantee true idempotency (zero unnecessary updates).
   */
  async resolveOrCreateProvider(
    sourceId: string,
    normalized: NormalizedProvider,
    tx?: Prisma.TransactionClient
  ): Promise<{ provider: Provider; status: EntitySyncStatus }> {
    const db = tx || this.prisma;

    // 1. Check existing source mapping for Models.dev
    const existingMapping = await db.providerSourceMapping.findUnique({
      where: {
        sourceId_externalProviderId: {
          sourceId,
          externalProviderId: normalized.externalId,
        },
      },
      include: { provider: true },
    });

    if (existingMapping) {
      const provider = existingMapping.provider;

      // Check if any normalized fields have actually changed
      const isWebsiteChanged = normalized.website !== null && provider.website !== normalized.website;
      const isDocChanged = normalized.apiDocUrl !== null && provider.apiDocUrl !== normalized.apiDocUrl;
      const isNameChanged = provider.name !== normalized.name;
      const isHashChanged = existingMapping.payloadHash !== normalized.payloadHash;

      if (!isWebsiteChanged && !isDocChanged && !isNameChanged && !isHashChanged) {
        return { provider, status: "unchanged" };
      }

      // Fields changed -> update provider and mapping
      const updatedProvider = await db.provider.update({
        where: { id: provider.id },
        data: {
          name: normalized.name,
          website: normalized.website || provider.website,
          apiDocUrl: normalized.apiDocUrl || provider.apiDocUrl,
        },
      });

      await db.providerSourceMapping.update({
        where: { id: existingMapping.id },
        data: {
          payloadHash: normalized.payloadHash,
          lastFetchedAt: new Date(),
        },
      });

      return { provider: updatedProvider, status: "updated" };
    }

    // 2. Check if a canonical Provider exists with this slug (e.g. from OpenRouter or Seed)
    const existingProviderBySlug = await db.provider.findUnique({
      where: { slug: normalized.slug },
    });

    if (existingProviderBySlug) {
      // Create source mapping to link Models.dev to the existing provider
      await db.providerSourceMapping.create({
        data: {
          providerId: existingProviderBySlug.id,
          sourceId,
          externalProviderId: normalized.externalId,
          externalSlug: normalized.slug,
          payloadHash: normalized.payloadHash,
          lastFetchedAt: new Date(),
        },
      });

      // Update missing optional metadata without overwriting valid data
      const updatedProvider = await db.provider.update({
        where: { id: existingProviderBySlug.id },
        data: {
          website: existingProviderBySlug.website || normalized.website,
          apiDocUrl: existingProviderBySlug.apiDocUrl || normalized.apiDocUrl,
        },
      });

      return { provider: updatedProvider, status: "updated" };
    }

    // 3. Brand new provider: insert Provider and ProviderSourceMapping
    const newProvider = await db.provider.create({
      data: {
        slug: normalized.slug,
        name: normalized.name,
        website: normalized.website,
        apiDocUrl: normalized.apiDocUrl,
        providerType: "UNKNOWN",
        sourceMappings: {
          create: {
            sourceId,
            externalProviderId: normalized.externalId,
            externalSlug: normalized.slug,
            payloadHash: normalized.payloadHash,
            lastFetchedAt: new Date(),
          },
        },
      },
    });

    return { provider: newProvider, status: "inserted" };
  }
}
