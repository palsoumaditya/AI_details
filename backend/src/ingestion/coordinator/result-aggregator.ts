import type {
  SourceSyncResult,
  BatchSyncResult,
  BatchAggregateCounters,
  IngestionExecutionMode,
} from "../contracts/types";

export class ResultAggregator {
  /**
   * Aggregates individual source results into a unified parent BatchSyncResult.
   */
  static aggregate(
    batchId: string,
    mode: IngestionExecutionMode,
    requestedSources: string[],
    sourceResults: SourceSyncResult[],
    startedAt: Date,
    completedAt: Date
  ): BatchSyncResult {
    const sourcesMap: Record<string, SourceSyncResult> = {};
    const allErrors: string[] = [];

    const aggregateCounters: BatchAggregateCounters = {
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
      totalItemsFailed: 0,
      totalItemsSkipped: 0,
    };

    let completedCount = 0;
    let failedCount = 0;
    let partialCount = 0;

    for (const res of sourceResults) {
      sourcesMap[res.sourceSlug] = res;
      allErrors.push(...res.errors);

      if (res.status === "COMPLETED") completedCount++;
      else if (res.status === "FAILED") failedCount++;
      else partialCount++;

      aggregateCounters.totalModelsProcessed += res.modelsProcessed;
      aggregateCounters.totalModelsInserted += res.modelsInserted;
      aggregateCounters.totalModelsUpdated += res.modelsUpdated;
      aggregateCounters.totalModelsUnchanged += res.modelsUnchanged;

      aggregateCounters.totalProvidersProcessed += res.providersProcessed;
      aggregateCounters.totalProvidersInserted += res.providersInserted;
      aggregateCounters.totalProvidersUpdated += res.providersUpdated;
      aggregateCounters.totalProvidersUnchanged += res.providersUnchanged;

      aggregateCounters.totalEndpointsProcessed += res.endpointsProcessed;
      aggregateCounters.totalEndpointsInserted += res.endpointsInserted;
      aggregateCounters.totalEndpointsUpdated += res.endpointsUpdated;
      aggregateCounters.totalEndpointsUnchanged += res.endpointsUnchanged;
      aggregateCounters.totalEndpointsUnresolved += res.endpointsUnresolved;

      aggregateCounters.totalPricingRecordsCreated += res.pricingRecordsCreated;
      aggregateCounters.totalRawRecordsCreated += res.rawRecordsCreated;
      aggregateCounters.totalConflictsDetected += res.conflictsDetected;
      aggregateCounters.totalItemsFailed += res.itemsFailed;
      aggregateCounters.totalItemsSkipped += res.itemsSkipped;
    }

    let batchStatus: "COMPLETED" | "PARTIAL" | "FAILED" = "COMPLETED";

    if (failedCount === sourceResults.length && sourceResults.length > 0) {
      batchStatus = "FAILED";
    } else if (failedCount > 0 || partialCount > 0) {
      batchStatus = "PARTIAL";
    }

    const durationMs = completedAt.getTime() - startedAt.getTime();

    return {
      batchId,
      status: batchStatus,
      mode,
      requestedSources,
      sources: sourcesMap,
      aggregateCounters,
      startedAt,
      completedAt,
      durationMs,
      errors: allErrors,
    };
  }
}
