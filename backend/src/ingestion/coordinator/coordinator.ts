import { PrismaClient, SyncTriggerType } from "@oneatlas/database";
import { AdvisoryLockService, LockHandle } from "./advisory-lock.service";
import { BatchService } from "./batch.service";
import { AdapterRegistry } from "./adapter-registry";
import { ExecutionPlan } from "./execution-plan";
import { ResultAggregator } from "./result-aggregator";
import { classifyError } from "./error-handler";
import type {
  IngestionExecutionMode,
  IngestionStage,
  IngestionLogger,
  BatchSyncResult,
  SourceSyncResult,
  IngestionExecutionContext,
} from "../contracts/types";

export interface CoordinatorRunOptions {
  sources?: string[];
  mode?: IngestionExecutionMode;
  stage?: IngestionStage;
  limit?: number;
  triggerType?: SyncTriggerType;
  logger?: IngestionLogger;
  abortSignal?: AbortSignal;
}

export class IngestionCoordinator {
  private readonly lockService: AdvisoryLockService;
  private readonly batchService: BatchService;
  private readonly registry: AdapterRegistry;

  constructor(
    private readonly prisma: PrismaClient,
    registry?: AdapterRegistry,
    customDirectUrl?: string
  ) {
    this.batchService = new BatchService(prisma);
    this.registry = registry || new AdapterRegistry();
    this.lockService = new AdvisoryLockService(customDirectUrl);
  }

  getRegistry(): AdapterRegistry {
    return this.registry;
  }

  /**
   * Main entrypoint: Orchestrates catalog synchronization.
   */
  async run(options: CoordinatorRunOptions = {}): Promise<BatchSyncResult> {
    const mode = options.mode || "APPLY";
    const stage = options.stage || "ALL";
    const startedAt = new Date();
    const logger: IngestionLogger = options.logger || {
      info: (msg, meta) => console.log(`[Coordinator INFO] ${msg}`, meta ? JSON.stringify(meta) : ""),
      warn: (msg, meta) => console.warn(`[Coordinator WARN] ${msg}`, meta ? JSON.stringify(meta) : ""),
      error: (msg, meta) => console.error(`[Coordinator ERROR] ${msg}`, meta ? JSON.stringify(meta) : ""),
    };

    // 1. Resolve and validate requested sources
    const requestedSourceSlugs =
      options.sources && options.sources.length > 0
        ? options.sources.map((s) => s.toLowerCase().trim())
        : this.registry.getAvailableSlugs();

    const adapters = this.registry.getRequestedAdapters(requestedSourceSlugs);
    logger.info(`Resolved ${adapters.length} adapters for execution: [${adapters.map((a) => a.sourceSlug).join(", ")}]`);

    // 2. Validate adapter access
    for (const adapter of adapters) {
      try {
        await adapter.validateAccess();
      } catch (accessErr) {
        logger.error(`Validation failed for adapter '${adapter.sourceSlug}'`, { error: String(accessErr) });
        throw accessErr;
      }
    }

    let lockHandle: LockHandle | null = null;
    let batchId = `virtual-batch-${Date.now()}`;

    try {
      // 3. Acquire Global Advisory Lock (Apply mode only)
      if (mode === "APPLY") {
        lockHandle = await this.lockService.acquireGlobalLock(logger);

        // 4. Create Parent SyncBatch record in PostgreSQL
        const batchRecord = await this.batchService.createBatch(
          requestedSourceSlugs,
          options.triggerType || "MANUAL"
        );
        batchId = batchRecord.id;
        logger.info(`Created SyncBatch record: ${batchId}`);
      } else {
        logger.info(`Dry-run mode: Skipping advisory lock and persistent SyncBatch creation.`);
      }

      // 5. Establish Execution Context
      const context: IngestionExecutionContext = {
        batchId,
        mode,
        stage,
        limit: options.limit,
        abortSignal: options.abortSignal,
        logger,
        startedAt,
      };

      // 6. Execute Multi-Source Synchronization Plan
      let sourceResults: SourceSyncResult[] = [];
      if (adapters.length > 1 && stage === "ALL") {
        sourceResults = await ExecutionPlan.executePhasedMultiSource(adapters, context);
      } else {
        for (const adapter of adapters) {
          logger.info(`Executing adapter: ${adapter.sourceSlug}`);
          const res = await adapter.execute(context);
          sourceResults.push(res);
        }
      }

      // 7. Aggregate Results
      const completedAt = new Date();
      const batchResult = ResultAggregator.aggregate(
        batchId,
        mode,
        requestedSourceSlugs,
        sourceResults,
        startedAt,
        completedAt
      );

      // 8. Finalize Batch Record in DB
      if (mode === "APPLY") {
        await this.batchService.finalizeBatch(batchId, batchResult);
        logger.info(`Finalized SyncBatch ${batchId} with status: ${batchResult.status}`);
      }

      return batchResult;
    } catch (err) {
      const classified = classifyError(err);
      logger.error(`Ingestion coordinator failed: ${classified.message}`, {
        category: classified.category,
      });

      const completedAt = new Date();
      const failedResult: BatchSyncResult = {
        batchId,
        status: "FAILED",
        mode,
        requestedSources: requestedSourceSlugs,
        sources: {},
        aggregateCounters: {
          totalModelsProcessed: 0,
          totalModelsInserted: 0,
          totalModelsUpdated: 0,
          totalModelsUnchanged: 0,
          totalProvidersProcessed: 0,
          totalProvidersInserted: 0,
          totalProvidersUpdated: 0,
          totalProvidersUnchanged: 0,
          totalEndpointsProcessed: 0,
          totalEndpointsInserted: 0,
          totalEndpointsUpdated: 0,
          totalEndpointsUnchanged: 0,
          totalEndpointsUnresolved: 0,
          totalPricingRecordsCreated: 0,
          totalRawRecordsCreated: 0,
          totalConflictsDetected: 0,
          totalItemsFailed: 1,
          totalItemsSkipped: 0,
        },
        startedAt,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        errors: [classified.message],
      };

      if (mode === "APPLY") {
        await this.batchService.finalizeBatch(batchId, failedResult).catch(() => {});
      }

      throw classified;
    } finally {
      // 9. Always release advisory lock
      if (lockHandle) {
        await lockHandle.release().catch((relErr) => {
          logger.warn("Error releasing global advisory lock", { error: String(relErr) });
        });
      }
    }
  }
}
