import type {
  HealthDto,
  ModelCatalogItemDto,
  ModelDetailDto,
  ProviderDto,
  AiLabDto,
  BenchmarkDto,
  BenchmarkResultDto,
  PaginationMeta,
  PricingHistoryResult,
  ProviderDirectoryResult,
  ProviderDetailResult,
  AiLabDirectoryResult,
  AiLabDetailResult,
  ModelComparisonDto,
} from "../../shared/types/api";
import type {
  ModelsCatalogQuery,
  ModelsCatalogInputQuery,
  PricingHistoryQuery,
  PricingHistoryInputQuery,
  ProvidersInputQuery,
  ProviderEndpointsInputQuery,
  LabsInputQuery,
  LabModelsInputQuery,
  CompareRequest,
} from "../../shared/schemas/api";

/**
 * Backend Query Service Contracts (Phase 4A, 4B, 4C, 4D)
 *
 * Defines explicit boundaries between HTTP Route Handlers and Backend Services.
 * These interfaces enforce DTO serialization and prevent direct Prisma queries in route handlers.
 */

export interface IHealthService {
  getLiveness(): Promise<{
    status: "ok";
    timestamp: string;
    version: string;
    uptimeSeconds: number;
  }>;

  getReadiness(timeoutMs?: number): Promise<HealthDto>;
}

export interface ModelsCatalogResult {
  models: ModelCatalogItemDto[];
  pagination: PaginationMeta;
  appliedFilters: ModelsCatalogQuery;
}

export interface IModelsQueryService {
  getModelsCatalog(params: ModelsCatalogInputQuery): Promise<ModelsCatalogResult>;
  getModelBySlug(slug: string): Promise<ModelDetailDto | null>;
  getModelPricingHistory(slug: string, query: PricingHistoryInputQuery): Promise<PricingHistoryResult | null>;
}

export interface IModelDetailQueryService {
  getModelDetails(slug: string): Promise<ModelDetailDto | null>;
  getModelPricingHistory(slug: string, query: PricingHistoryInputQuery): Promise<PricingHistoryResult | null>;
}

export interface IProvidersQueryService {
  listProviders(params?: ProvidersInputQuery): Promise<ProviderDirectoryResult>;
  getProviderBySlug(slug: string, endpointQuery?: ProviderEndpointsInputQuery): Promise<ProviderDetailResult | null>;
}

export interface ILabsQueryService {
  listLabs(params?: LabsInputQuery): Promise<AiLabDirectoryResult>;
  getLabBySlug(slug: string, modelQuery?: LabModelsInputQuery): Promise<AiLabDetailResult | null>;
}

export interface ICompareQueryService {
  compareModels(request: CompareRequest): Promise<ModelComparisonDto>;
}

export interface IRankingsQueryService {
  getRankings(params: {
    benchmarkSlug: string;
    category?: string;
  }): Promise<{ benchmark: BenchmarkDto; results: BenchmarkResultDto[] }>;
}
