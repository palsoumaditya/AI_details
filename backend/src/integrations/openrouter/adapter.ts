import { PrismaClient } from "@oneatlas/database";
import { OpenRouterClient } from "./client";
import { OpenRouterSyncService } from "./sync.service";
import type {
  IngestionSourceAdapter,
  IngestionExecutionContext,
  SourceSyncResult,
} from "../../ingestion/contracts/types";

export class OpenRouterIngestionAdapter implements IngestionSourceAdapter {
  readonly sourceSlug = "openrouter";
  private readonly syncService: OpenRouterSyncService;
  private readonly client: OpenRouterClient;

  constructor(prisma: PrismaClient, customApiKey?: string) {
    this.client = new OpenRouterClient({ apiKey: customApiKey });
    this.syncService = new OpenRouterSyncService(prisma, this.client);
  }

  async validateAccess(): Promise<void> {
    try {
      // Light check: fetch 1 model page to verify network and API status
      await this.client.fetchModelsPage(0, 1);
    } catch (err) {
      throw new Error(`OpenRouter access validation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async execute(context: IngestionExecutionContext): Promise<SourceSyncResult> {
    const isDryRun = context.mode === "DRY_RUN";
    const modelsOnly = context.stage === "MODELS_ONLY";
    const providersOnly = context.stage === "PROVIDERS_ONLY";
    const endpointsOnly = context.stage === "ENDPOINTS_ONLY";

    const res = await this.syncService.sync({
      batchId: context.batchId,
      dryRun: isDryRun,
      limit: context.limit,
      modelsOnly,
      providersOnly,
      endpointsOnly,
      includeEndpoints: false, // granular endpoints require management key
    });

    return {
      sourceSlug: this.sourceSlug,
      syncRunId: res.syncRunId,
      status: res.status,
      modelsProcessed: res.modelsProcessed,
      modelsInserted: res.modelsInserted,
      modelsUpdated: res.modelsUpdated,
      modelsUnchanged: res.modelsUnchanged,
      providersProcessed: res.providersProcessed,
      providersInserted: res.providersInserted,
      providersUpdated: res.providersUpdated,
      providersUnchanged: res.providersUnchanged,
      endpointsProcessed: res.endpointsProcessed,
      endpointsInserted: res.endpointsInserted,
      endpointsUpdated: res.endpointsUpdated,
      endpointsUnchanged: res.endpointsUnchanged,
      endpointsUnresolved: 0,
      pricingRecordsCreated: res.pricingRecordsCreated,
      rawRecordsCreated: res.rawRecordsCreated,
      conflictsDetected: 0,
      itemsFailed: res.errors.length,
      itemsSkipped: 0,
      errors: res.errors,
      durationMs: res.durationMs,
    };
  }

  async syncModels(context: IngestionExecutionContext): Promise<Partial<SourceSyncResult>> {
    const res = await this.execute({ ...context, stage: "MODELS_ONLY" });
    return res;
  }

  async syncProviders(context: IngestionExecutionContext): Promise<Partial<SourceSyncResult>> {
    const res = await this.execute({ ...context, stage: "PROVIDERS_ONLY" });
    return res;
  }

  async syncEndpoints(context: IngestionExecutionContext): Promise<Partial<SourceSyncResult>> {
    const res = await this.execute({ ...context, stage: "ENDPOINTS_ONLY" });
    return res;
  }
}
