import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { OpenRouterClient } from "./client";
import { normalizeModel, normalizeProvider, normalizeEndpoint } from "./mapper";
import { ProviderService } from "./provider.service";
import { ModelService } from "./model.service";
import { EndpointService } from "./endpoint.service";
import type { SyncOptions, SyncResult } from "./types";

/**
 * OpenRouter Ingestion Synchronization Orchestrator.
 * Handles fetching, validation, normalization, deduplication, and atomic persistence.
 */
export class OpenRouterSyncService {
  private readonly client: OpenRouterClient;
  private readonly providerService: ProviderService;
  private readonly modelService: ModelService;
  private readonly endpointService: EndpointService;

  constructor(private readonly prisma: PrismaClient, client?: OpenRouterClient) {
    this.client = client || new OpenRouterClient();
    this.providerService = new ProviderService(prisma);
    this.modelService = new ModelService(prisma);
    this.endpointService = new EndpointService(prisma);
  }

  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const dryRun = Boolean(options.dryRun);
    const limit = options.limit;
    const includeEndpoints = Boolean(options.includeEndpoints);
    const endpointModelLimit = options.endpointModelLimit ?? 5;

    const result: SyncResult = {
      syncRunId: "",
      status: "COMPLETED",
      modelsProcessed: 0,
      modelsInserted: 0,
      modelsUpdated: 0,
      modelsUnchanged: 0,
      providersProcessed: 0,
      providersInserted: 0,
      providersUpdated: 0,
      providersUnchanged: 0,
      endpointsProcessed: 0,
      endpointsInserted: 0,
      endpointsUpdated: 0,
      endpointsUnchanged: 0,
      pricingRecordsCreated: 0,
      rawRecordsCreated: 0,
      errors: [],
      durationMs: 0,
    };

    console.log(`[OpenRouterSync] Starting sync (dryRun: ${dryRun}, limit: ${limit ?? "all"})...`);

    // 1. Ensure ExternalSource record exists for OpenRouter
    let source = await this.prisma.externalSource.findUnique({
      where: { slug: "openrouter" },
    });

    if (!source && !dryRun) {
      source = await this.prisma.externalSource.create({
        data: {
          slug: "openrouter",
          name: "OpenRouter API",
          baseUrl: "https://openrouter.ai/api/v1",
          website: "https://openrouter.ai",
          isActive: true,
        },
      });
    }

    const sourceId = source?.id || "mock-openrouter-source-id";

    // 2. Initialize SyncRun if not dryRun
    let syncRun: { id: string } | null = null;
    if (!dryRun) {
      syncRun = await this.prisma.syncRun.create({
        data: {
          sourceId,
          triggerType: "MANUAL",
          status: "STARTED",
          startedAt: new Date(),
        },
      });
      result.syncRunId = syncRun.id;
    } else {
      result.syncRunId = "dry-run-virtual-sync-id";
    }

    try {
      // 3. Fetch and Ingest Provider Catalog
      console.log("[OpenRouterSync] Fetching provider directory from OpenRouter...");
      const rawProviders = await this.client.fetchProviders();
      result.providersProcessed = rawProviders.length;
      console.log(`[OpenRouterSync] Fetched ${rawProviders.length} providers.`);

      // Also ensure standard OpenRouter provider exists
      let openRouterProviderId: string | null = null;
      if (!dryRun) {
        const orProvider = await this.prisma.provider.upsert({
          where: { slug: "openrouter-provider" },
          update: { name: "OpenRouter", providerType: "AGGREGATOR" },
          create: {
            slug: "openrouter-provider",
            name: "OpenRouter",
            providerType: "AGGREGATOR",
            website: "https://openrouter.ai",
          },
        });
        openRouterProviderId = orProvider.id;
      }

      for (const rawProv of rawProviders) {
        const normProv = normalizeProvider(rawProv);

        if (!dryRun) {
          const { status } = await this.providerService.resolveOrCreateProvider(
            sourceId,
            normProv
          );

          if (status === "inserted") result.providersInserted++;
          else if (status === "updated") result.providersUpdated++;
          else result.providersUnchanged++;

          // Record raw provenance snapshot if changed
          const rawCreated = await this.persistRawRecordIfNew(
            sourceId,
            syncRun?.id,
            "provider",
            normProv.externalId,
            normProv.rawPayload,
            normProv.payloadHash
          );
          if (rawCreated) result.rawRecordsCreated++;
        } else {
          result.providersInserted++;
        }
      }

      // 4. Fetch and Ingest Model Catalog
      console.log("[OpenRouterSync] Fetching models catalog from OpenRouter...");
      const rawModels = await this.client.fetchAllModels({
        limit: limit ? Math.min(limit, 1000) : 1000,
        maxPages: limit ? Math.ceil(limit / 1000) : 10,
      });

      const modelsToProcess = limit ? rawModels.slice(0, limit) : rawModels;
      result.modelsProcessed = modelsToProcess.length;
      console.log(`[OpenRouterSync] Fetched ${modelsToProcess.length} models for processing.`);

      for (const rawModel of modelsToProcess) {
        const normModel = normalizeModel(rawModel);

        if (!dryRun) {
          const { model, status } = await this.modelService.resolveOrCreateModel(
            sourceId,
            normModel
          );

          if (status === "inserted") result.modelsInserted++;
          else if (status === "updated") result.modelsUpdated++;
          else result.modelsUnchanged++;

          // Record raw model provenance snapshot if changed
          const rawCreated = await this.persistRawRecordIfNew(
            sourceId,
            syncRun?.id,
            "model",
            normModel.externalId,
            normModel.rawPayload,
            normModel.payloadHash
          );
          if (rawCreated) result.rawRecordsCreated++;

          // Map catalog-level top_provider / gateway pricing to OpenRouter Provider endpoint
          if (openRouterProviderId && normModel.pricing) {
            const gatewayEndpointKey = `openrouter/${normModel.externalId}`;
            const normGatewayEndpoint = {
              endpointKey: gatewayEndpointKey,
              name: `OpenRouter | ${normModel.name}`,
              providerExternalSlug: "openrouter",
              contextWindow: normModel.contextWindow,
              maxOutputTokens: null,
              inputModalities: normModel.inputModalities,
              outputModalities: normModel.outputModalities,
              status: "ONLINE" as const,
              isModerated: false,
              pricing: normModel.pricing,
              rawPayload: normModel.rawPayload,
              payloadHash: normModel.payloadHash,
            };

            const { status: epStatus, priceRecorded } =
              await this.endpointService.resolveOrCreateEndpoint(
                model.id,
                openRouterProviderId,
                sourceId,
                normGatewayEndpoint
              );

            result.endpointsProcessed++;
            if (epStatus === "inserted") result.endpointsInserted++;
            else if (epStatus === "updated") result.endpointsUpdated++;
            else result.endpointsUnchanged++;
            if (priceRecorded) result.pricingRecordsCreated++;
          }
        } else {
          result.modelsInserted++;
          if (normModel.pricing) {
            result.endpointsProcessed++;
            result.endpointsInserted++;
            result.pricingRecordsCreated++;
          }
        }
      }

      // 5. Optional Detailed Endpoints Ingestion (requires management permissions)
      if (includeEndpoints && !dryRun) {
        console.log(
          `[OpenRouterSync] Fetching detailed provider endpoints for top ${endpointModelLimit} models...`
        );
        const endpointTargets = modelsToProcess.slice(0, endpointModelLimit);

        for (const targetModel of endpointTargets) {
          try {
            const endpointsResp = await this.client.fetchModelEndpoints(targetModel.id);

            if (endpointsResp.status === "FORBIDDEN") {
              const warningMsg =
                "HTTP 403 Forbidden on /endpoints: Management key permissions required for granular endpoint listing. Basic model catalog ingestion succeeded.";
              console.warn(`[OpenRouterSync] ${warningMsg}`);
              result.status = "PARTIAL";
              if (!result.errors.includes(warningMsg)) {
                result.errors.push(warningMsg);
              }
              break; // Don't hammer forbidden endpoint
            }

            if (endpointsResp.status === "AUTHORIZED" && endpointsResp.endpoints.length > 0) {
              // Resolve Model
              const canonicalMapping = await this.prisma.modelSourceMapping.findUnique({
                where: {
                  sourceId_externalModelId: {
                    sourceId,
                    externalModelId: targetModel.id,
                  },
                },
              });

              if (!canonicalMapping) continue;

              for (const rawEp of endpointsResp.endpoints) {
                const normEp = normalizeEndpoint(rawEp, targetModel.id);

                // Find or create provider
                const providerMapping = await this.prisma.providerSourceMapping.findUnique({
                  where: {
                    sourceId_externalProviderId: {
                      sourceId,
                      externalProviderId: normEp.providerExternalSlug,
                    },
                  },
                });

                const providerId = providerMapping?.providerId || openRouterProviderId;
                if (!providerId) continue;

                const { status: epStatus, priceRecorded } =
                  await this.endpointService.resolveOrCreateEndpoint(
                    canonicalMapping.modelId,
                    providerId,
                    sourceId,
                    normEp
                  );

                result.endpointsProcessed++;
                if (epStatus === "inserted") result.endpointsInserted++;
                else if (epStatus === "updated") result.endpointsUpdated++;
                else result.endpointsUnchanged++;
                if (priceRecorded) result.pricingRecordsCreated++;

                // Record raw endpoint payload snapshot
                const rawEpCreated = await this.persistRawRecordIfNew(
                  sourceId,
                  syncRun?.id,
                  "endpoint",
                  normEp.endpointKey,
                  normEp.rawPayload,
                  normEp.payloadHash
                );
                if (rawEpCreated) result.rawRecordsCreated++;
              }
            }
          } catch (epError: unknown) {
            const errMsg = epError instanceof Error ? epError.message : String(epError);
            console.warn(`[OpenRouterSync] Error fetching endpoints for ${targetModel.id}:`, errMsg);
            result.errors.push(`Endpoints error for ${targetModel.id}: ${errMsg}`);
          }
        }
      }

      result.durationMs = Date.now() - startTime;

      // 6. Finalize SyncRun
      if (!dryRun && syncRun) {
        const finalStatus =
          result.errors.length > 0 && result.modelsInserted === 0
            ? "FAILED"
            : result.status;

        await this.prisma.syncRun.update({
          where: { id: syncRun.id },
          data: {
            status: finalStatus,
            itemsProcessed: result.modelsProcessed + result.providersProcessed,
            itemsInserted: result.modelsInserted + result.providersInserted + result.endpointsInserted,
            itemsUpdated: result.modelsUpdated + result.providersUpdated + result.endpointsUpdated,
            itemsUnchanged: result.modelsUnchanged + result.providersUnchanged + result.endpointsUnchanged,
            errorSummary: result.errors.length > 0 ? result.errors.join("; ") : null,
            errorDetails: result.errors.length > 0 ? (result.errors as unknown as Prisma.InputJsonValue) : undefined,
            completedAt: new Date(),
          },
        });
      }

      console.log(`[OpenRouterSync] Sync finished with status ${result.status} in ${result.durationMs}ms.`);
      return result;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[OpenRouterSync] Critical error during synchronization:", errorMsg);
      result.status = "FAILED";
      result.errors.push(errorMsg);
      result.durationMs = Date.now() - startTime;

      if (!dryRun && syncRun) {
        await this.prisma.syncRun.update({
          where: { id: syncRun.id },
          data: {
            status: "FAILED",
            errorSummary: errorMsg,
            completedAt: new Date(),
          },
        }).catch(() => {});
      }

      return result;
    }
  }

  /**
   * Persists a RawSourceRecord only if a distinct payload hash does not already exist.
   */
  private async persistRawRecordIfNew(
    sourceId: string,
    syncRunId: string | undefined,
    entityType: string,
    externalId: string,
    payload: Record<string, unknown>,
    payloadHash: string
  ): Promise<boolean> {
    try {
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

      if (existing) return false;

      await this.prisma.rawSourceRecord.create({
        data: {
          sourceId,
          syncRunId: syncRunId || null,
          entityType,
          externalId,
          payload: payload as unknown as Prisma.InputJsonValue,
          payloadHash,
          fetchedAt: new Date(),
        },
      });

      return true;
    } catch {
      // Ignore concurrent race conflicts gracefully
      return false;
    }
  }
}
