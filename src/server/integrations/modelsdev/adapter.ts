import { PrismaClient } from "@/generated/prisma/client";
import { ModelsDevClient } from "./client";
import { ModelsDevSyncService } from "./sync.service";
import type {
  IngestionSourceAdapter,
  IngestionExecutionContext,
  SourceSyncResult,
} from "../../ingestion/contracts/types";

export class ModelsDevIngestionAdapter implements IngestionSourceAdapter {
  readonly sourceSlug = "modelsdev";
  private readonly syncService: ModelsDevSyncService;
  private readonly client: ModelsDevClient;

  constructor(prisma: PrismaClient) {
    this.client = new ModelsDevClient();
    this.syncService = new ModelsDevSyncService(prisma, this.client);
  }

  async validateAccess(): Promise<void> {
    try {
      // Light verification: fetch canonical models response
      await this.client.getCanonicalModels();
    } catch (err) {
      throw new Error(`Models.dev access validation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async execute(context: IngestionExecutionContext): Promise<SourceSyncResult> {
    const isDryRun = context.mode === "DRY_RUN";
    const modelsOnly = context.stage === "MODELS_ONLY";
    const providersOnly = context.stage === "PROVIDERS_ONLY";
    const endpointsOnly = context.stage === "ENDPOINTS_ONLY";

    const res = await this.syncService.synchronize({
      batchId: context.batchId,
      dryRun: isDryRun,
      limit: context.limit,
      modelsOnly,
      providersOnly,
      endpointsOnly,
    });

    const s = res.stats;
    return {
      sourceSlug: this.sourceSlug,
      syncRunId: res.syncRunId,
      status: res.status,
      modelsProcessed: s.modelsProcessed,
      modelsInserted: s.modelsInserted,
      modelsUpdated: s.modelsUpdated,
      modelsUnchanged: s.modelsUnchanged,
      providersProcessed: s.providersProcessed,
      providersInserted: s.providersInserted,
      providersUpdated: s.providersUpdated,
      providersUnchanged: s.providersUnchanged,
      endpointsProcessed: s.endpointsProcessed,
      endpointsInserted: s.endpointsInserted,
      endpointsUpdated: s.endpointsUpdated,
      endpointsUnchanged: s.endpointsUnchanged,
      endpointsUnresolved: s.endpointsUnresolved,
      pricingRecordsCreated: s.pricingRecordsCreated,
      rawRecordsCreated: s.rawSnapshotsCreated,
      conflictsDetected: s.conflictsDetected,
      itemsFailed: s.modelsFailed + s.providersFailed + s.endpointsFailed,
      itemsSkipped: s.modelsSkipped + s.providersSkipped + s.endpointsSkipped,
      errors: [],
      durationMs: res.durationMs,
    };
  }

  async syncModels(context: IngestionExecutionContext): Promise<Partial<SourceSyncResult>> {
    return this.execute({ ...context, stage: "MODELS_ONLY" });
  }

  async syncProviders(context: IngestionExecutionContext): Promise<Partial<SourceSyncResult>> {
    return this.execute({ ...context, stage: "PROVIDERS_ONLY" });
  }

  async syncEndpoints(context: IngestionExecutionContext): Promise<Partial<SourceSyncResult>> {
    return this.execute({ ...context, stage: "ENDPOINTS_ONLY" });
  }
}
