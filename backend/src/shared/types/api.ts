/**
 * Standard API Response and DTO Contracts for AI Details (Phase 4A & 4B)
 *
 * Strict separation between external response representations and internal database models.
 */

// ==========================================
// RESPONSE ENVELOPES
// ==========================================

export interface ApiResponseMeta {
  requestId: string;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ApiResponseMeta;
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: ApiResponseMeta & {
    pagination: PaginationMeta;
  };
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
  meta: ApiResponseMeta;
}

export type ApiResponse<T> =
  | ApiSuccessResponse<T>
  | ApiPaginatedResponse<T>
  | ApiErrorResponse;

// ==========================================
// DATA TRANSFER OBJECTS (DTOs)
// ==========================================

/** High-precision monetary serialization */
export interface PricingDto {
  inputPricePerMillion: string | null;
  outputPricePerMillion: string | null;
  cacheReadPricePerMillion?: string | null;
  currency: "USD";
  pricingUnit: "1M_TOKENS";
  effectiveAt?: string;
}

/** Individual Pricing Offer with Provider & Source Attribution */
export interface PricingOfferDto {
  amount: string;
  currency: "USD";
  unit: "1M_TOKENS";
  provider: {
    name: string;
    slug: string;
  };
  source: string;
  observedAt: string;
}

/** Model Pricing Summary for Catalog Views */
export interface ModelCatalogPricingSummaryDto {
  lowestInput: PricingOfferDto | null;
  lowestOutput: PricingOfferDto | null;
  availableProviderCount: number;
}

/** Individual Endpoint Pricing Offer */
export interface EndpointPricingOfferDto {
  source: {
    slug: string;
    name: string;
  } | null;
  inputPricePerMillion: string | null;
  outputPricePerMillion: string | null;
  cacheReadPricePerMillion: string | null;
  cacheWritePricePerMillion: string | null;
  currency: string;
  pricingUnit: string;
  observedAt: string;
}

/** Canonical AI Lab representation */
export interface AiLabDto {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  logoUrl?: string | null;
  country: string | null;
  isVerified?: boolean;
}

/** Verified Model-to-Lab Association */
export interface ModelLabDto {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  logoUrl: string | null;
  country: string | null;
  relationshipType: "CREATOR" | "PUBLISHER" | "COLLABORATOR";
}

/** Canonical Provider Endpoint representation (Phase 4C) */
export interface ModelEndpointDto {
  id: string;
  endpointKey: string;
  name: string | null;
  status: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputModalities: string[];
  outputModalities: string[];
  capabilities: Record<string, unknown> | null;
  isModerated: boolean;
  lastSeenAt: string | null;
  provider: {
    id: string;
    slug: string;
    name: string;
    website: string | null;
    logoUrl: string | null;
    providerType: string;
  };
  sourceMappings: Array<{
    source: string;
    observedAt: string | null;
  }>;
  pricing: EndpointPricingOfferDto[];
}

/** Canonical Model Item for Discovery Catalog (Phase 4B) */
export interface ModelCatalogItemDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  family: string | null;
  releaseDate: string | null;
  knowledgeCutoff: string | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  isReasoning: boolean | null;
  isOpenWeight: boolean | null;
  inputModalities: string[];
  outputModalities: string[];
  labs: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  pricing: ModelCatalogPricingSummaryDto;
}

/** Canonical Model Summary (Legacy alias for compatibility) */
export type ModelSummaryDto = ModelCatalogItemDto;

/** Field-Level Provenance DTO (Phase 4C) */
export interface FieldProvenanceDto {
  fieldKey: string;
  sourceSlug: string;
  sourceName: string;
  sourceExternalId: string | null;
  confidence: number | null;
  selectedAt: string;
}

/** Data Quality Summary DTO (Phase 4C) */
export interface DataQualitySummaryDto {
  status: "VERIFIED" | "PARTIAL" | "CONFLICTED" | "UNKNOWN";
  lastMetadataUpdate: string | null;
  hasConflicts: boolean;
  conflictCount: number;
  warnings: string[];
}

/** Inference Provider Representation */
export interface ProviderDto {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  providerType: "DIRECT" | "CLOUD" | "AGGREGATOR" | "HOSTING" | "UNKNOWN";
  isActive: boolean;
  supportedModelsCount?: number;
}

/** Benchmark Definition Representation */
export interface BenchmarkDto {
  id: string;
  slug: string;
  name: string;
  category: "REASONING" | "CODING" | "KNOWLEDGE" | "GENERAL" | "MULTIMODAL";
  version: string;
  metricName: string;
  metricUnit: string;
  scoreRangeMax: number | null;
}

/** Detailed Benchmark Result representation (Phase 4C) */
export interface BenchmarkResultDto {
  id: string;
  benchmark: {
    slug: string;
    name: string;
    version: string;
    category: string;
    metricName: string;
    metricUnit: string;
    higherIsBetter: boolean;
  };
  result: {
    value: string;
    evaluationDate: string | null;
    modelVersion: string | null;
    sampleSize: number | null;
    sourceUrl: string | null;
    notes: string | null;
  };
  source: {
    slug: string;
    name: string;
  };
}

/** Canonical Model Detail Full Profile (Phase 4C) */
export interface ModelDetailDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  family: string | null;
  architectureType: string | null;
  releaseDate: string | null;
  knowledgeCutoff: string | null;
  lastUpdated: string;
  license: string | null;
  isReasoning: boolean | null;
  isOpenWeight: boolean | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputModalities: string[];
  outputModalities: string[];
  capabilities: Record<string, unknown> | null;
  status: string;
  labs: ModelLabDto[];
  endpoints: ModelEndpointDto[];
  pricingSummary: ModelCatalogPricingSummaryDto;
  benchmarks: BenchmarkResultDto[];
  provenance: Record<string, FieldProvenanceDto>;
  dataQuality: DataQualitySummaryDto;
}

/** Pricing History Record Representation (Phase 4C) */
export interface PricingHistoryRecordDto {
  id: string;
  endpointId: string;
  endpointKey: string;
  provider: {
    id: string;
    slug: string;
    name: string;
  };
  source: {
    slug: string;
    name: string;
  } | null;
  inputPricePerMillion: string | null;
  outputPricePerMillion: string | null;
  cacheReadPricePerMillion: string | null;
  cacheWritePricePerMillion: string | null;
  currency: string;
  pricingUnit: string;
  observedAt: string;
}

/** Pricing History Query Result (Phase 4C) */
export interface PricingHistoryResult {
  records: PricingHistoryRecordDto[];
  pagination: PaginationMeta;
  appliedFilters: {
    slug: string;
    provider?: string;
    source?: string;
    endpoint?: string;
    from?: string;
    to?: string;
    sort: "newest" | "oldest";
    page: number;
    limit: number;
  };
}

/** System Health & Readiness Representation */
export interface HealthCheckComponent {
  status: "up" | "down";
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface HealthDto {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: HealthCheckComponent;
    api: HealthCheckComponent;
    cache?: HealthCheckComponent;
  };
}

// ==========================================
// PROVIDER & AI LAB DIRECTORY DTOs (Phase 4D)
// ==========================================

/** Item DTO for Provider Directory Collection */
export interface ProviderDirectoryItemDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  providerType: string;
  endpointCount: number;
  onlineEndpointCount: number;
  offlineEndpointCount: number;
  unknownEndpointCount: number;
  modelCount: number;
  onlineModelCount: number;
  supportedInputModalities: string[];
  supportedOutputModalities: string[];
  lastSeenAt: string | null;
}

/** Provider Endpoint Item for Provider Detail View */
export interface ProviderEndpointItemDto {
  id: string;
  endpointKey: string;
  name: string | null;
  status: string;
  model: {
    id: string;
    slug: string;
    name: string;
    family: string | null;
  };
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputModalities: string[];
  outputModalities: string[];
  capabilities: Record<string, unknown> | null;
  isModerated: boolean;
  lastSeenAt: string | null;
}

/** Full Provider Detail DTO with Paginated Endpoints */
export interface ProviderDetailDto {
  provider: ProviderDirectoryItemDto;
  endpoints: ProviderEndpointItemDto[];
  pagination: PaginationMeta;
}

/** Result shape for Provider Directory Query Service */
export interface ProviderDirectoryResult {
  providers: ProviderDirectoryItemDto[];
  pagination: PaginationMeta;
  appliedFilters: {
    q?: string;
    providerType?: string;
    hasEndpoints?: boolean;
    hasOnlineEndpoints?: boolean;
    sort: string;
    page: number;
    limit: number;
  };
}

/** Result shape for Provider Detail Query Service */
export interface ProviderDetailResult {
  provider: ProviderDirectoryItemDto;
  endpoints: ProviderEndpointItemDto[];
  pagination: PaginationMeta;
  appliedFilters: {
    slug: string;
    status?: string;
    inputModality?: string;
    outputModality?: string;
    page: number;
    limit: number;
  };
}

/** Item DTO for AI Lab Directory Collection */
export interface AiLabDirectoryItemDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  country: string | null;
  modelCount: number;
  creatorModelCount: number;
  publisherModelCount: number;
  collaboratorModelCount: number;
}

/** Family Distribution Group for AI Lab Detail */
export interface FamilyDistributionItemDto {
  family: string | null;
  modelCount: number;
}

/** Model Item associated with an AI Lab */
export interface AiLabModelItemDto {
  id: string;
  slug: string;
  name: string;
  family: string | null;
  releaseDate: string | null;
  status: string;
  isReasoning: boolean | null;
  isOpenWeight: boolean | null;
  relationshipTypes: string[];
}

/** Full AI Lab Detail DTO with Family Distribution and Paginated Models */
export interface AiLabDetailDto {
  lab: AiLabDirectoryItemDto;
  familyDistribution: FamilyDistributionItemDto[];
  models: AiLabModelItemDto[];
  pagination: PaginationMeta;
}

/** Result shape for AI Lab Directory Query Service */
export interface AiLabDirectoryResult {
  labs: AiLabDirectoryItemDto[];
  pagination: PaginationMeta;
  appliedFilters: {
    q?: string;
    country?: string;
    sort: string;
    page: number;
    limit: number;
  };
}

/** Result shape for AI Lab Detail Query Service */
export interface AiLabDetailResult {
  lab: AiLabDirectoryItemDto;
  familyDistribution: FamilyDistributionItemDto[];
  models: AiLabModelItemDto[];
  pagination: PaginationMeta;
  appliedFilters: {
    slug: string;
    relationshipType?: string;
    family?: string;
    page: number;
    limit: number;
  };
}

// ==========================================
// MODEL COMPARISON DTOs (Phase 4E / Task 5)
// ==========================================

export interface ComparisonBenchmarkScoreDto {
  value: string;
  numValue: number;
  evaluationDate?: string | null;
  modelVersion?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  sourceName?: string;
  isLeader?: boolean;
}

export interface ComparisonBenchmarkRowDto {
  benchmark: {
    slug: string;
    name: string;
    version: string;
    category: string;
    metricName: string;
    metricUnit: string;
    higherIsBetter: boolean;
  };
  scores: Record<string, ComparisonBenchmarkScoreDto | null>;
  bestModelSlug: string | null;
}

export interface ModelComparisonSpecsSummaryDto {
  cheapestInputSlug: string | null;
  cheapestOutputSlug: string | null;
  largestContextSlug: string | null;
  maxOutputTokensLeaderSlug: string | null;
}

export interface ModelComparisonMatrixDto {
  benchmarks: ComparisonBenchmarkRowDto[];
  specsSummary?: ModelComparisonSpecsSummaryDto;
}

export interface ModelComparisonDto {
  models: ModelDetailDto[];
  comparisonMatrix: ModelComparisonMatrixDto;
}

// ==========================================
// RANKINGS & BENCHMARK LEADERBOARD DTOs (Phase 4F / Task 6)
// ==========================================

export interface BenchmarkDirectoryItemDto {
  id: string;
  slug: string;
  name: string;
  version: string;
  category: string;
  metricName: string;
  metricUnit: string;
  higherIsBetter: boolean;
  description: string | null;
  evaluatedModelCount: number;
  latestEvaluationDate: string | null;
}

export interface RankedModelItemDto {
  rank: number;
  model: {
    id: string;
    slug: string;
    name: string;
    family: string | null;
    isReasoning?: boolean | null;
    isOpenWeight?: boolean | null;
  };
  lab: {
    id: string;
    slug: string;
    name: string;
  } | null;
  score: string;
  numScore: number;
  metricUnit: string;
  evaluationDate: string | null;
  modelVersion: string | null;
  sampleSize: number | null;
  source: {
    slug: string;
    name: string;
  } | null;
}

export interface RankingsDirectoryResult {
  benchmarks: BenchmarkDirectoryItemDto[];
  categories: { category: string; count: number }[];
  totalBenchmarks: number;
  totalEvaluatedModels: number;
  appliedFilters: {
    category?: string;
    q?: string;
  };
}

export interface BenchmarkLeaderboardResult {
  benchmark: BenchmarkDirectoryItemDto;
  rankings: RankedModelItemDto[];
  pagination: PaginationMeta;
  appliedFilters: {
    benchmarkSlug: string;
    q?: string;
    lab?: string;
    page: number;
    limit: number;
    sort?: string;
  };
}

