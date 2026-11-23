/**
 * Shared Ingestion Contracts & Types for AI Details
 */

export type IngestionExecutionMode = "DRY_RUN" | "APPLY";

export type IngestionStage = "ALL" | "MODELS_ONLY" | "PROVIDERS_ONLY" | "ENDPOINTS_ONLY";

export interface IngestionLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug?(message: string, meta?: Record<string, unknown>): void;
}

export interface IngestionExecutionContext {
  batchId: string;
  runId?: string;
  mode: IngestionExecutionMode;
  stage: IngestionStage;
  limit?: number;
  abortSignal?: AbortSignal;
  logger: IngestionLogger;
  startedAt: Date;
}

export interface SourceSyncResult {
  sourceSlug: string;
  syncRunId?: string;
  status: "COMPLETED" | "PARTIAL" | "FAILED";
  modelsProcessed: number;
  modelsInserted: number;
  modelsUpdated: number;
  modelsUnchanged: number;
  providersProcessed: number;
  providersInserted: number;
  providersUpdated: number;
  providersUnchanged: number;
  endpointsProcessed: number;
  endpointsInserted: number;
  endpointsUpdated: number;
  endpointsUnchanged: number;
  endpointsUnresolved: number;
  pricingRecordsCreated: number;
  rawRecordsCreated: number;
  conflictsDetected: number;
  itemsFailed: number;
  itemsSkipped: number;
  errors: string[];
  durationMs: number;
}

export interface BatchAggregateCounters {
  totalModelsProcessed: number;
  totalModelsInserted: number;
  totalModelsUpdated: number;
  totalModelsUnchanged: number;
  totalProvidersProcessed: number;
  totalProvidersInserted: number;
  totalProvidersUpdated: number;
  totalProvidersUnchanged: number;
  totalEndpointsProcessed: number;
  totalEndpointsInserted: number;
  totalEndpointsUpdated: number;
  totalEndpointsUnchanged: number;
  totalEndpointsUnresolved: number;
  totalPricingRecordsCreated: number;
  totalRawRecordsCreated: number;
  totalConflictsDetected: number;
  totalItemsFailed: number;
  totalItemsSkipped: number;
}

export interface BatchSyncResult {
  batchId: string;
  status: "COMPLETED" | "PARTIAL" | "FAILED" | "CANCELLED";
  mode: IngestionExecutionMode;
  requestedSources: string[];
  sources: Record<string, SourceSyncResult>;
  aggregateCounters: BatchAggregateCounters;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  errors: string[];
}

/**
 * Standard Source Adapter contract implemented by each integration.
 */
export interface IngestionSourceAdapter {
  readonly sourceSlug: string;

  /**
   * Validates API credentials, network reachability, and source health.
   */
  validateAccess(): Promise<void>;

  /**
   * Executes the full or staged ingestion for this external source.
   */
  execute(context: IngestionExecutionContext): Promise<SourceSyncResult>;

  /**
   * Optional stage-specific execution methods for multi-source phased synchronization.
   */
  syncModels?(context: IngestionExecutionContext): Promise<Partial<SourceSyncResult>>;
  syncProviders?(context: IngestionExecutionContext): Promise<Partial<SourceSyncResult>>;
  syncEndpoints?(context: IngestionExecutionContext): Promise<Partial<SourceSyncResult>>;
}
