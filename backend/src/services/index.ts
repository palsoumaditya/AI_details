/**
 * @oneatlas/backend — Services public API (Phase 4A & 4B)
 */

export * from "./contracts/index";
export { HealthService, healthService } from "./health.service";
export { ModelsQueryService, modelsQueryService } from "./models-query.service";
export { ModelDetailQueryService, modelDetailQueryService } from "./model-detail-query.service";
export { ProviderDirectoryQueryService, providerDirectoryQueryService } from "./provider-directory-query.service";
export { LabDirectoryQueryService, labDirectoryQueryService } from "./lab-directory-query.service";
export { CompareQueryService, compareQueryService } from "./compare-query.service";
export { RankingsQueryService, rankingsQueryService } from "./rankings-query.service";
export {
  CacheService,
  cacheService,
  getCacheService,
} from "./cache.service";
export type { CacheMetrics, CacheOptions } from "./cache.service";

