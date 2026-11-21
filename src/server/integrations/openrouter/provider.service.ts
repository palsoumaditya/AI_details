import { PrismaClient, Prisma, Provider } from "@/generated/prisma/client";
import type { NormalizedProvider } from "./types";

/**
 * Service for resolving and persisting external inference providers.
 */
export class ProviderService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolves or creates a canonical Provider and links ProviderSourceMapping.
   */
  async resolveOrCreateProvider(
    sourceId: string,
    norm: NormalizedProvider,
    tx?: Prisma.TransactionClient
  ): Promise<{ provider: Provider; isNew: boolean }> {
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
      // Update lastFetchedAt and payloadHash
      await db.providerSourceMapping.update({
        where: { id: existingMapping.id },
        data: {
          lastFetchedAt: new Date(),
          payloadHash: norm.payloadHash,
          externalSlug: norm.slug,
        },
      });

      return { provider: existingMapping.provider, isNew: false };
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

    return { provider, isNew };
  }
}
