import type {
  HealthDto,
  ModelSummaryDto,
  ModelDetailDto,
  ProviderDto,
  AiLabDto,
  BenchmarkDto,
  BenchmarkResultDto,
  PaginationMeta,
} from "../../shared/types/api";
import type {
  ModelsQueryFilter,
  CompareRequest,
} from "../../shared/schemas/api";

/**
 * Backend Query Service Contracts (Phase 4A)
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

export interface IModelsQueryService {
  listModels(
    params: ModelsQueryFilter
  ): Promise<{ data: ModelSummaryDto[]; pagination: PaginationMeta }>;

  getModelBySlug(slug: string): Promise<ModelDetailDto | null>;
}

export interface IProvidersQueryService {
  listProviders(): Promise<ProviderDto[]>;
  getProviderBySlug(slug: string): Promise<ProviderDto | null>;
}

export interface ILabsQueryService {
  listLabs(): Promise<AiLabDto[]>;
  getLabBySlug(slug: string): Promise<AiLabDto | null>;
}

export interface ICompareQueryService {
  compareModels(request: CompareRequest): Promise<{
    models: ModelDetailDto[];
    comparisonMatrix: Record<string, unknown>;
  }>;
}

export interface IRankingsQueryService {
  getRankings(params: {
    benchmarkSlug: string;
    category?: string;
  }): Promise<{ benchmark: BenchmarkDto; results: BenchmarkResultDto[] }>;
}
