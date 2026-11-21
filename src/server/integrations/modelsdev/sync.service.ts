import { PrismaClient, SyncStatus, Prisma } from "@/generated/prisma/client";
import { ModelsDevClient } from "./client";
import {
  normalizeCanonicalModel,
  normalizeProvider,
  normalizeEndpoint,
} from "./mapper";
import { ModelService } from "./model.service";
import { ProviderService } from "./provider.service";
import { EndpointService } from "./endpoint.service";
import { PricingService } from "./pricing.service";
import type { ModelsDevSyncOptions, ModelsDevSyncStats } from "./types";

export class ModelsDevSyncService {
  private readonly client: ModelsDevClient;
  private readonly modelService: ModelService;
  private readonly providerService: ProviderService;
  private readonly endpointService: EndpointService;
  private readonly pricingService: PricingService;

  constructor(
    private readonly prisma: PrismaClient,
    client?: ModelsDevClient
  ) {
    this.client = client || new ModelsDevClient();
    this.modelService = new ModelService(prisma);
    this.providerService = new ProviderService(prisma);
    this.endpointService = new EndpointService(prisma);
    this.pricingService = new PricingService(prisma);
  }

  /**
   * Coordinates full or partial synchronization of Models.dev data.
   */
  async sync(options: ModelsDevSyncOptions = {}): Promise<{
    syncRunId?: string;
    stats: ModelsDevSyncStats;
    status: SyncStatus;
    durationMs: number;
  }> {
    const startTime = Date.now();
    const stats: ModelsDevSyncStats = {
      modelsProcessed: 0,
      modelsInserted: 0,
      modelsUpdated: 0,
      modelsUnchanged: 0,
      modelsSkipped: 0,
      modelsFailed: 0,

      providersProcessed: 0,
      providersInserted: 0,
      providersUpdated: 0,
      providersUnchanged: 0,
      providersSkipped: 0,
      providersFailed: 0,

      endpointsProcessed: 0,
      endpointsInserted: 0,
      endpointsUpdated: 0,
      endpointsUnchanged: 0,
      endpointsUnresolved: 0,
      endpointsSkipped: 0,
      endpointsFailed: 0,

      pricingRecordsCreated: 0,
      rawSnapshotsCreated: 0,
      conflictsDetected: 0,
    };

    let syncRunId: string | undefined;
    let sourceId: string | undefined;

    // 1. Ensure Models.dev ExternalSource exists
    if (!options.dryRun) {
      const source = await this.prisma.externalSource.upsert({
        where: { slug: "modelsdev" },
        update: { isActive: true },
        create: {
          slug: "modelsdev",
          name: "Models.dev API",
          baseUrl: "https://models.dev",
          website: "https://models.dev",
          isActive: true,
        },
      });
      sourceId = source.id;

      const syncRun = await this.prisma.syncRun.create({
        data: {
          sourceId,
          triggerType: "MANUAL",
          status: "STARTED",
        },
      });
      syncRunId = syncRun.id;
    }

    try {
      // 2. Sync Providers if requested
      const shouldSyncProviders = !options.modelsOnly && !options.endpointsOnly;
      if (shouldSyncProviders) {
        await this.syncProvidersInternal(options, stats, sourceId, syncRunId);
      }

      // 3. Sync Canonical Models if requested
      const shouldSyncModels = !options.providersOnly && !options.endpointsOnly;
      if (shouldSyncModels) {
        await this.syncCanonicalModelsInternal(options, stats, sourceId, syncRunId);
      }

      // 4. Sync Provider Endpoints & Pricing if requested
      const shouldSyncEndpoints = !options.providersOnly && !options.modelsOnly;
      if (shouldSyncEndpoints) {
        await this.syncEndpointsInternal(options, stats, sourceId, syncRunId);
      }

      const hasFailures =
        stats.modelsFailed > 0 ||
        stats.providersFailed > 0 ||
        stats.endpointsFailed > 0 ||
        stats.endpointsUnresolved > 0;

      const finalStatus: SyncStatus = hasFailures ? "PARTIAL" : "COMPLETED";

      if (syncRunId && sourceId) {
        await this.prisma.syncRun.update({
          where: { id: syncRunId },
          data: {
            status: finalStatus,
            itemsProcessed:
              stats.modelsProcessed + stats.providersProcessed + stats.endpointsProcessed,
            itemsInserted:
              stats.modelsInserted + stats.providersInserted + stats.endpointsInserted,
            itemsUpdated:
              stats.modelsUpdated + stats.providersUpdated + stats.endpointsUpdated,
            itemsUnchanged:
              stats.modelsUnchanged + stats.providersUnchanged + stats.endpointsUnchanged,
            itemsSkipped:
              stats.modelsSkipped + stats.providersSkipped + stats.endpointsSkipped,
            itemsFailed:
              stats.modelsFailed + stats.providersFailed + stats.endpointsFailed + stats.endpointsUnresolved,
            completedAt: new Date(),
          },
        });
      }

      return {
        syncRunId,
        stats,
        status: finalStatus,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      if (syncRunId) {
        await this.prisma.syncRun.update({
          where: { id: syncRunId },
          data: {
            status: "FAILED",
            errorSummary: error instanceof Error ? error.message : String(error),
            completedAt: new Date(),
          },
        });
      }
      throw error;
    }
  }

  private async syncProvidersInternal(
    options: ModelsDevSyncOptions,
    stats: ModelsDevSyncStats,
    sourceId?: string,
    syncRunId?: string
  ): Promise<void> {
    const rawProviders = await this.client.getProviders();
    const providerEntries = Object.entries(rawProviders);
    const limit = options.limit ?? providerEntries.length;

    for (let i = 0; i < Math.min(providerEntries.length, limit); i++) {
      const [, raw] = providerEntries[i];
      stats.providersProcessed++;

      try {
        const normalized = normalizeProvider(raw);

        if (options.dryRun) {
          stats.providersInserted++;
          continue;
        }

        const res = await this.providerService.resolveOrCreateProvider(sourceId!, normalized);
        if (res.status === "inserted") stats.providersInserted++;
        else if (res.status === "updated") stats.providersUpdated++;
        else stats.providersUnchanged++;

        // Raw source snapshot deduplication
        await this.persistRawSnapshot(
          sourceId!,
          syncRunId,
          "PROVIDER",
          normalized.externalId,
          normalized.rawPayload,
          normalized.payloadHash,
          stats
        );
      } catch (err) {
        stats.providersFailed++;
        console.error(`[ModelsDevSync] Failed provider ${raw.id}:`, err);
      }
    }
  }

  private async syncCanonicalModelsInternal(
    options: ModelsDevSyncOptions,
    stats: ModelsDevSyncStats,
    sourceId?: string,
    syncRunId?: string
  ): Promise<void> {
    const rawModels = await this.client.getCanonicalModels();
    const modelEntries = Object.entries(rawModels);
    const limit = options.limit ?? modelEntries.length;

    for (let i = 0; i < Math.min(modelEntries.length, limit); i++) {
      const [, raw] = modelEntries[i];
      stats.modelsProcessed++;

      try {
        const normalized = normalizeCanonicalModel(raw);

        if (options.dryRun) {
          stats.modelsInserted++;
          continue;
        }

        const res = await this.modelService.resolveOrCreateCanonicalModel(sourceId!, normalized);
        if (res.status === "inserted") stats.modelsInserted++;
        else if (res.status === "updated") stats.modelsUpdated++;
        else stats.modelsUnchanged++;

        // Raw source snapshot deduplication
        await this.persistRawSnapshot(
          sourceId!,
          syncRunId,
          "MODEL",
          normalized.externalId,
          normalized.rawPayload,
          normalized.payloadHash,
          stats
        );
      } catch (err) {
        stats.modelsFailed++;
        console.error(`[ModelsDevSync] Failed canonical model ${raw.id}:`, err);
      }
    }
  }

  private async syncEndpointsInternal(
    options: ModelsDevSyncOptions,
    stats: ModelsDevSyncStats,
    sourceId?: string,
    syncRunId?: string
  ): Promise<void> {
    const rawProviders = await this.client.getProviders();
    const providerEntries = Object.entries(rawProviders);
    let totalEndpointsProcessed = 0;
    const limit = options.limit ?? 100000;

    for (const [providerId, provider] of providerEntries) {
      if (!provider.models) continue;
      const modelEntries = Object.entries(provider.models);

      for (const [, pModel] of modelEntries) {
        if (totalEndpointsProcessed >= limit) break;
        totalEndpointsProcessed++;
        stats.endpointsProcessed++;

        try {
          const normalized = normalizeEndpoint(providerId, pModel);

          if (options.dryRun) {
            stats.endpointsInserted++;
            if (normalized.pricing) stats.pricingRecordsCreated++;
            continue;
          }

          const res = await this.endpointService.resolveOrCreateEndpoint(sourceId!, normalized);
          if (res.status === "inserted") {
            stats.endpointsInserted++;
          } else if (res.status === "updated") {
            stats.endpointsUpdated++;
          } else if (res.status === "unchanged") {
            stats.endpointsUnchanged++;
          } else if (res.status === "unresolved") {
            stats.endpointsUnresolved++;
            continue;
          }

          // Ingest pricing if available
          if (res.endpoint && normalized.pricing) {
            const priceCreated = await this.pricingService.recordPriceIfChanged(
              res.endpoint.id,
              sourceId!,
              normalized.pricing
            );
            if (priceCreated) stats.pricingRecordsCreated++;
          }

          // Raw snapshot
          await this.persistRawSnapshot(
            sourceId!,
            syncRunId,
            "ENDPOINT",
            normalized.externalEndpointId,
            normalized.rawPayload,
            normalized.payloadHash,
            stats
          );
        } catch (err) {
          stats.endpointsFailed++;
          console.error(`[ModelsDevSync] Failed endpoint ${providerId}/${pModel.id}:`, err);
        }
      }

      if (totalEndpointsProcessed >= limit) break;
    }
  }

  private async persistRawSnapshot(
    sourceId: string,
    syncRunId: string | undefined,
    entityType: string,
    externalId: string,
    payload: Record<string, unknown>,
    payloadHash: string,
    stats: ModelsDevSyncStats
  ): Promise<void> {
    const existing = await this.prisma.rawSourceRecord.findUnique({
      where: {
        sourceId_entityType_externalId_payloadHash: {
          sourceId,
          entityType,
          externalId,
          payloadHash,
        },
      },
    });

    if (!existing) {
      await this.prisma.rawSourceRecord.create({
        data: {
          sourceId,
          syncRunId,
          entityType,
          externalId,
          payload: payload as unknown as Prisma.InputJsonValue,
          payloadHash,
          fetchedAt: new Date(),
        },
      });
      stats.rawSnapshotsCreated++;
    }
  }
}
