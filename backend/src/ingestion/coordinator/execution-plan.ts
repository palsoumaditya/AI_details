import type {
  IngestionExecutionContext,
  SourceSyncResult,
  IngestionSourceAdapter,
} from "../contracts/types";

export class ExecutionPlan {
  /**
   * Executes multi-source synchronization in the safe phased order defined in Section 6:
   * Stage 1: Models.dev Canonical Models
   * Stage 2: OpenRouter Model Catalog
   * Stage 3: Provider Catalogs (Models.dev & OpenRouter)
   * Stage 4: Models.dev Provider Offerings (now resolvable against full canonical models)
   * Stage 5: OpenRouter Provider Endpoints
   */
  static async executePhasedMultiSource(
    adapters: IngestionSourceAdapter[],
    context: IngestionExecutionContext
  ): Promise<SourceSyncResult[]> {
    const logger = context.logger;
    const adapterMap = new Map(adapters.map((a) => [a.sourceSlug.toLowerCase(), a]));

    const mdAdapter = adapterMap.get("modelsdev");
    const orAdapter = adapterMap.get("openrouter");

    // If only one source requested or neither, run sequentially per adapter
    if (!mdAdapter || !orAdapter) {
      const results: SourceSyncResult[] = [];
      for (const adapter of adapters) {
        logger.info(`Executing full synchronization for single source: ${adapter.sourceSlug}`);
        const res = await adapter.execute(context);
        results.push(res);
      }
      return results;
    }

    // Staged Multi-Source Execution
    logger.info("Starting safe phased multi-source synchronization plan...");

    // Stage 1: Models.dev Canonical Model Catalog
    logger.info("[Stage 1/5] Ingesting Models.dev canonical models catalog...");
    const mdModelsRes = await mdAdapter.syncModels!(context);

    // Stage 2: OpenRouter Model Catalog
    logger.info("[Stage 2/5] Ingesting OpenRouter model catalog with identity resolution...");
    const orModelsRes = await orAdapter.syncModels!(context);

    // Stage 3: Provider Catalogs
    logger.info("[Stage 3/5] Ingesting provider directories (Models.dev & OpenRouter)...");
    const mdProvRes = await mdAdapter.syncProviders!(context);
    const orProvRes = await orAdapter.syncProviders!(context);

    // Stage 4: Models.dev Provider Offerings (Resolving endpoints against full canonical catalog)
    logger.info("[Stage 4/5] Ingesting Models.dev provider endpoints & resolving against complete canonical catalog...");
    const mdEndpointsRes = await mdAdapter.syncEndpoints!(context);

    // Stage 5: OpenRouter Provider Endpoints
    logger.info("[Stage 5/5] Ingesting OpenRouter provider endpoints...");
    const orEndpointsRes = await orAdapter.syncEndpoints!(context);

    // Combine Stage results for each source
    const mdTotal: SourceSyncResult = {
      sourceSlug: "modelsdev",
      syncRunId: mdEndpointsRes.syncRunId || mdModelsRes.syncRunId || mdProvRes.syncRunId,
      status:
        mdEndpointsRes.status === "FAILED" || mdModelsRes.status === "FAILED" || mdProvRes.status === "FAILED"
          ? "FAILED"
          : (mdEndpointsRes.status === "PARTIAL" || mdModelsRes.status === "PARTIAL" || mdProvRes.status === "PARTIAL"
              ? "PARTIAL"
              : "COMPLETED"),
      modelsProcessed: (mdModelsRes.modelsProcessed || 0),
      modelsInserted: (mdModelsRes.modelsInserted || 0),
      modelsUpdated: (mdModelsRes.modelsUpdated || 0),
      modelsUnchanged: (mdModelsRes.modelsUnchanged || 0),
      providersProcessed: (mdProvRes.providersProcessed || 0),
      providersInserted: (mdProvRes.providersInserted || 0),
      providersUpdated: (mdProvRes.providersUpdated || 0),
      providersUnchanged: (mdProvRes.providersUnchanged || 0),
      endpointsProcessed: (mdEndpointsRes.endpointsProcessed || 0),
      endpointsInserted: (mdEndpointsRes.endpointsInserted || 0),
      endpointsUpdated: (mdEndpointsRes.endpointsUpdated || 0),
      endpointsUnchanged: (mdEndpointsRes.endpointsUnchanged || 0),
      endpointsUnresolved: (mdEndpointsRes.endpointsUnresolved || 0),
      pricingRecordsCreated: (mdEndpointsRes.pricingRecordsCreated || 0),
      rawRecordsCreated:
        (mdModelsRes.rawRecordsCreated || 0) +
        (mdProvRes.rawRecordsCreated || 0) +
        (mdEndpointsRes.rawRecordsCreated || 0),
      conflictsDetected:
        (mdModelsRes.conflictsDetected || 0) +
        (mdProvRes.conflictsDetected || 0) +
        (mdEndpointsRes.conflictsDetected || 0),
      itemsFailed:
        (mdModelsRes.itemsFailed || 0) +
        (mdProvRes.itemsFailed || 0) +
        (mdEndpointsRes.itemsFailed || 0),
      itemsSkipped:
        (mdModelsRes.itemsSkipped || 0) +
        (mdProvRes.itemsSkipped || 0) +
        (mdEndpointsRes.itemsSkipped || 0),
      errors: [
        ...(mdModelsRes.errors || []),
        ...(mdProvRes.errors || []),
        ...(mdEndpointsRes.errors || []),
      ],
      durationMs:
        (mdModelsRes.durationMs || 0) +
        (mdProvRes.durationMs || 0) +
        (mdEndpointsRes.durationMs || 0),
    };

    const orTotal: SourceSyncResult = {
      sourceSlug: "openrouter",
      syncRunId: orEndpointsRes.syncRunId || orModelsRes.syncRunId || orProvRes.syncRunId,
      status:
        orEndpointsRes.status === "FAILED" || orModelsRes.status === "FAILED" || orProvRes.status === "FAILED"
          ? "FAILED"
          : (orEndpointsRes.status === "PARTIAL" || orModelsRes.status === "PARTIAL" || orProvRes.status === "PARTIAL"
              ? "PARTIAL"
              : "COMPLETED"),
      modelsProcessed: (orModelsRes.modelsProcessed || 0),
      modelsInserted: (orModelsRes.modelsInserted || 0),
      modelsUpdated: (orModelsRes.modelsUpdated || 0),
      modelsUnchanged: (orModelsRes.modelsUnchanged || 0),
      providersProcessed: (orProvRes.providersProcessed || 0),
      providersInserted: (orProvRes.providersInserted || 0),
      providersUpdated: (orProvRes.providersUpdated || 0),
      providersUnchanged: (orProvRes.providersUnchanged || 0),
      endpointsProcessed: (orEndpointsRes.endpointsProcessed || 0) + (orModelsRes.endpointsProcessed || 0),
      endpointsInserted: (orEndpointsRes.endpointsInserted || 0) + (orModelsRes.endpointsInserted || 0),
      endpointsUpdated: (orEndpointsRes.endpointsUpdated || 0) + (orModelsRes.endpointsUpdated || 0),
      endpointsUnchanged: (orEndpointsRes.endpointsUnchanged || 0) + (orModelsRes.endpointsUnchanged || 0),
      endpointsUnresolved: 0,
      pricingRecordsCreated:
        (orEndpointsRes.pricingRecordsCreated || 0) +
        (orModelsRes.pricingRecordsCreated || 0),
      rawRecordsCreated:
        (orModelsRes.rawRecordsCreated || 0) +
        (orProvRes.rawRecordsCreated || 0) +
        (orEndpointsRes.rawRecordsCreated || 0),
      conflictsDetected: 0,
      itemsFailed:
        (orModelsRes.itemsFailed || 0) +
        (orProvRes.itemsFailed || 0) +
        (orEndpointsRes.itemsFailed || 0),
      itemsSkipped:
        (orModelsRes.itemsSkipped || 0) +
        (orProvRes.itemsSkipped || 0) +
        (orEndpointsRes.itemsSkipped || 0),
      errors: [
        ...(orModelsRes.errors || []),
        ...(orProvRes.errors || []),
        ...(orEndpointsRes.errors || []),
      ],
      durationMs:
        (orModelsRes.durationMs || 0) +
        (orProvRes.durationMs || 0) +
        (orEndpointsRes.durationMs || 0),
    };

    return [mdTotal, orTotal];
  }
}
