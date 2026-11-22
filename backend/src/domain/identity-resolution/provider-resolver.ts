import { PrismaClient, Provider, Prisma } from "@oneatlas/database";

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

/**
 * Resolves or registers canonical providers and maintains provider source mappings.
 *
 * Ensures cross-source idempotency: shared inference providers discovered across multiple sources
 * (e.g., OpenRouter and Models.dev) are matched by slug to prevent perpetual churn or duplicate entities.
 */
export class ProviderResolver {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolves an incoming provider definition against canonical records or registers a new provider.
   *
   * @param sourceId - Database identifier for the originating external source.
   * @param norm - Normalized provider details including slug, name, and optional documentation URL.
   * @param tx - Optional transaction client to participate in an outer transaction.
   * @returns Canonical provider entity and resolution status ('inserted', 'updated', or 'unchanged').
   */
  async resolveOrCreateProvider(
    sourceId: string,
    norm: NormalizedProviderInput,
    tx?: Prisma.TransactionClient
  ): Promise<{ provider: Provider; status: ProviderResolutionStatus }> {
    const db = tx || this.prisma;

    // Check for an existing verified mapping between this source and provider ID
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

      // Unchanged payload hash indicates no updates are needed
      if (norm.payloadHash && existingMapping.payloadHash === norm.payloadHash) {
        return { provider, status: "unchanged" };
      }

      // Check for actual field differences when hashes mismatch or are absent
      const isNameChanged = provider.name !== norm.name;
      const isWebsiteChanged = norm.website !== null && provider.website !== norm.website;
      const isDocChanged = norm.apiDocUrl !== null && provider.apiDocUrl !== norm.apiDocUrl;

      if (!isNameChanged && !isWebsiteChanged && !isDocChanged) {
        await db.providerSourceMapping.update({
          where: { id: existingMapping.id },
          data: {
            payloadHash: norm.payloadHash,
            lastFetchedAt: new Date(),
          },
        });
        return { provider, status: "unchanged" };
      }

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

    // Match by slug across existing canonical providers to link multi-source providers
    const existingProviderBySlug = await db.provider.findUnique({
      where: { slug: norm.slug },
    });

    if (existingProviderBySlug) {
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

      // Fill in previously missing metadata non-destructively
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

    // Insert brand-new canonical provider and corresponding source mapping
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
