import { PrismaClient, Prisma, Provider } from "@oneatlas/database";
import type { NormalizedProvider } from "./types";

export type ProviderSyncStatus = "inserted" | "updated" | "unchanged";

/**
 * Service for resolving and persisting external inference providers.
 */
export class ProviderService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolves or creates a canonical Provider and links ProviderSourceMapping.
   * Enforces fine-grained change detection for true idempotency.
   */
  async resolveOrCreateProvider(
    sourceId: string,
    norm: NormalizedProvider,
    tx?: Prisma.TransactionClient
  ): Promise<{ provider: Provider; isNew: boolean; status: ProviderSyncStatus }> {
    const db = tx || this.prisma;

    // 1. Check existing ProviderSourceMapping
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

      // If source payloadHash is unchanged, this source has no new data -> UNCHANGED (zero SQL updates)
      if (norm.payloadHash && existingMapping.payloadHash === norm.payloadHash) {
        return { provider, isNew: false, status: "unchanged" };
      }

      // If hash changed, check if normalized fields changed
      const isNameChanged = provider.name !== norm.name;
      const isWebsiteChanged = norm.website !== null && provider.website !== norm.website;

      if (!isNameChanged && !isWebsiteChanged) {
        // Hash changed but values identical -> update mapping hash only
        await db.providerSourceMapping.update({
          where: { id: existingMapping.id },
          data: {
            payloadHash: norm.payloadHash,
            externalSlug: norm.slug,
            lastFetchedAt: new Date(),
          },
        });
        return { provider, isNew: false, status: "unchanged" };
      }

      // Fields changed -> update provider and mapping
      const updatedProvider = await db.provider.update({
        where: { id: provider.id },
        data: {
          name: norm.name || provider.name,
          website: provider.website || norm.website,
        },
      });

      await db.providerSourceMapping.update({
        where: { id: existingMapping.id },
        data: {
          lastFetchedAt: new Date(),
          payloadHash: norm.payloadHash,
          externalSlug: norm.slug,
        },
      });

      return { provider: updatedProvider, isNew: false, status: "updated" };
    }

    // 2. Check canonical provider by known alias or slug
    const canonicalAliasMap: Record<string, string> = {
      openai: "openai-api",
      anthropic: "anthropic-api",
      google: "google-vertex",
      together: "together-ai",
      groq: "groq",
      openrouter: "openrouter-provider",
    };

    const targetSlug = canonicalAliasMap[norm.slug] || norm.slug;

    let provider = await db.provider.findUnique({
      where: { slug: targetSlug },
    });

    let isNew = false;
    let status: ProviderSyncStatus = "inserted";

    if (!provider) {
      provider = await db.provider.create({
        data: {
          slug: norm.slug,
          name: norm.name,
          website: norm.website,
          providerType: "UNKNOWN",
          isActive: true,
        },
      });
      isNew = true;
      status = "inserted";
    } else {
      status = "updated";
    }

    // 3. Create the ProviderSourceMapping
    await db.providerSourceMapping.create({
      data: {
        sourceId,
        providerId: provider.id,
        externalProviderId: norm.externalId,
        externalSlug: norm.slug,
        payloadHash: norm.payloadHash,
        lastFetchedAt: new Date(),
      },
    });

    return { provider, isNew, status };
  }
}
