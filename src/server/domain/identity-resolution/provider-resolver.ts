import { PrismaClient, Provider, Prisma } from "@/generated/prisma/client";

export interface NormalizedProviderInput {
  externalId: string;
  slug: string;
  name: string;
  website?: string | null;
  apiDocUrl?: string | null;
  providerType?: "DIRECT" | "CLOUD" | "AGGREGATOR" | "HOSTING" | "UNKNOWN";
  rawPayload?: Record<string, unknown>;
  payloadHash?: string | null;
}

export type ProviderResolutionStatus = "inserted" | "updated" | "unchanged";

export class ProviderResolver {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolves or creates a canonical Provider and links ProviderSourceMapping.
   *
   * CRITICAL IDEMPOTENCY FIX:
   * Cross-source shared providers (e.g. 'chutes', 'tenstorrent' present in both OpenRouter and Models.dev)
   * must not trigger perpetual updates when two sources observe slightly different websites.
   * If the source's own payloadHash is identical, the mapping and provider are unchanged.
   */
  async resolveOrCreateProvider(
    sourceId: string,
    norm: NormalizedProviderInput,
    tx?: Prisma.TransactionClient
  ): Promise<{ provider: Provider; status: ProviderResolutionStatus }> {
    const db = tx || this.prisma;

    // 1. Check existing ProviderSourceMapping for this exact source + externalProviderId
    const existingMapping = await db.providerSourceMapping.findUnique({
      where: {
        sourceId_externalProviderId: {
          sourceId,
          externalProviderId: norm.externalId,
        },
      },
      include: { provider: true },
    });

    if (existingMapping) {
      const provider = existingMapping.provider;

      // If source payloadHash hasn't changed, this source has NO new data -> UNCHANGED
      if (norm.payloadHash && existingMapping.payloadHash === norm.payloadHash) {
        return { provider, status: "unchanged" };
      }

      // If hash changed or absent, inspect whether core fields actually changed
      const isNameChanged = provider.name !== norm.name;
      const isWebsiteChanged = norm.website !== null && provider.website !== norm.website;
      const isDocChanged = norm.apiDocUrl !== null && provider.apiDocUrl !== norm.apiDocUrl;

      if (!isNameChanged && !isWebsiteChanged && !isDocChanged) {
        // Hash changed but normalized values identical -> update mapping hash only
        await db.providerSourceMapping.update({
          where: { id: existingMapping.id },
          data: {
            payloadHash: norm.payloadHash,
            lastFetchedAt: new Date(),
          },
        });
        return { provider, status: "unchanged" };
      }

      // Fields changed -> update provider and mapping
      const updatedProvider = await db.provider.update({
        where: { id: provider.id },
        data: {
          name: norm.name || provider.name,
          website: provider.website || norm.website,
          apiDocUrl: provider.apiDocUrl || norm.apiDocUrl,
        },
      });

      await db.providerSourceMapping.update({
        where: { id: existingMapping.id },
        data: {
          payloadHash: norm.payloadHash,
          lastFetchedAt: new Date(),
        },
      });

      return { provider: updatedProvider, status: "updated" };
    }

    // 2. Check canonical Provider by slug (cross-source provider linking)
    const existingProviderBySlug = await db.provider.findUnique({
      where: { slug: norm.slug },
    });

    if (existingProviderBySlug) {
      // Create source mapping for this new source to the existing canonical provider
      await db.providerSourceMapping.create({
        data: {
          providerId: existingProviderBySlug.id,
          sourceId,
          externalProviderId: norm.externalId,
          externalSlug: norm.slug,
          payloadHash: norm.payloadHash,
          lastFetchedAt: new Date(),
        },
      });

      // Non-destructive update: only fill missing fields
      const needsWebsite = !existingProviderBySlug.website && norm.website;
      const needsDoc = !existingProviderBySlug.apiDocUrl && norm.apiDocUrl;

      if (needsWebsite || needsDoc) {
        const updatedProvider = await db.provider.update({
          where: { id: existingProviderBySlug.id },
          data: {
            website: existingProviderBySlug.website || norm.website,
            apiDocUrl: existingProviderBySlug.apiDocUrl || norm.apiDocUrl,
          },
        });
        return { provider: updatedProvider, status: "updated" };
      }

      return { provider: existingProviderBySlug, status: "unchanged" };
    }

    // 3. Brand new provider: insert Provider and ProviderSourceMapping
    const newProvider = await db.provider.create({
      data: {
        slug: norm.slug,
        name: norm.name,
        website: norm.website,
        apiDocUrl: norm.apiDocUrl,
        providerType: norm.providerType || "DIRECT",
        isActive: true,
      },
    });

    await db.providerSourceMapping.create({
      data: {
        providerId: newProvider.id,
        sourceId,
        externalProviderId: norm.externalId,
        externalSlug: norm.slug,
        payloadHash: norm.payloadHash,
        lastFetchedAt: new Date(),
      },
    });

    return { provider: newProvider, status: "inserted" };
  }
}
