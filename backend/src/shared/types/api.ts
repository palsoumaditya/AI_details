/**
 * Standard API Response and DTO Contracts for OneAtlas.dev (Phase 4A)
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

/** Canonical AI Lab representation */
export interface AiLabDto {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  country: string | null;
  isVerified: boolean;
}

/** Canonical Provider Endpoint representation */
export interface ModelEndpointDto {
  id: string;
  provider: {
    id: string;
    slug: string;
    name: string;
    website: string | null;
    providerType: string;
  };
  contextWindow: number | null;
  maxOutputTokens: number | null;
  supportsStreaming: boolean;
  status: string;
  pricing: PricingDto | null;
}

/** Canonical Model Summary (Discovery & Catalog) */
export interface ModelSummaryDto {
  id: string;
  slug: string;
  name: string;
  family: string | null;
  description: string | null;
  status: "ACTIVE" | "DEPRECATED" | "EXPERIMENTAL";
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputModalities: string[];
  outputModalities: string[];
  isReasoning: boolean | null;
  isOpenWeight: boolean | null;
  releaseDate: string | null;
  lab: AiLabDto | null;
  startingPricePerMillion: string | null;
  endpointCount: number;
}

/** Canonical Model Detail (Full Profile) */
export interface ModelDetailDto extends ModelSummaryDto {
  architecture?: string | null;
  parameterCount?: string | null;
  quantization?: string | null;
  license?: string | null;
  endpoints: ModelEndpointDto[];
  provenanceSummary?: {
    lastSynchronizedAt: string | null;
    primarySource: string | null;
  };
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

/** Benchmark Definition & Score Representation */
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

export interface BenchmarkResultDto {
  benchmark: BenchmarkDto;
  score: string;
  recordedAt: string;
}

/** System Health & Readiness Representation */
export interface HealthCheckComponent {
  status: "up" | "down";
  latencyMs?: number;
  message?: string;
}

export interface HealthDto {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: HealthCheckComponent;
    api: HealthCheckComponent;
  };
}
