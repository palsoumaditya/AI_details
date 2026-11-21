import { Prisma } from "@oneatlas/database";

/**
 * OpenRouter raw and normalized data contract types.
 */

export interface OpenRouterRawPricing {
  prompt?: string | number | null;
  completion?: string | number | null;
  request?: string | number | null;
  image?: string | number | null;
  input_cache_read?: string | number | null;
  input_cache_write?: string | number | null;
  discount?: number | null;
}

export interface OpenRouterRawArchitecture {
  modality?: string | null;
  tokenizer?: string | null;
  instruct_type?: string | null;
  input_modalities?: string[] | null;
  output_modalities?: string[] | null;
}

export interface OpenRouterRawTopProvider {
  context_length?: number | null;
  max_completion_tokens?: number | null;
  is_moderated?: boolean | null;
}

export interface OpenRouterRawModelItem {
  id: string;
  name: string;
  canonical_slug?: string | null;
  description?: string | null;
  created?: number | null;
  context_length?: number | null;
  architecture?: OpenRouterRawArchitecture | null;
  pricing?: OpenRouterRawPricing | null;
  top_provider?: OpenRouterRawTopProvider | null;
  per_request_limits?: Record<string, unknown> | null;
  supported_parameters?: string[] | null;
  hugging_face_id?: string | null;
  links?: Record<string, string> | null;
  expiration_date?: string | null;
  knowledge_cutoff?: string | null;
  reasoning?: {
    default_enabled?: boolean | null;
    default_effort?: string | null;
    mandatory?: boolean | null;
    supported_efforts?: string[] | null;
  } | null;
}

export interface OpenRouterRawProviderItem {
  name: string;
  slug: string;
  privacy_policy_url?: string | null;
  terms_of_service_url?: string | null;
  status_page_url?: string | null;
  headquarters?: string | null;
  datacenters?: string[] | null;
}

export interface OpenRouterRawEndpointItem {
  name: string;
  model_id?: string | null;
  model_name?: string | null;
  provider_name?: string | null;
  tag?: string | null;
  context_length?: number | null;
  max_completion_tokens?: number | null;
  max_prompt_tokens?: number | null;
  pricing?: OpenRouterRawPricing | null;
  quantization?: string | null;
  status?: number | string | null;
  uptime_last_1d?: number | null;
  uptime_last_30m?: number | null;
  uptime_last_5m?: number | null;
  throughput_last_30m?: number | null;
  latency_last_30m?: number | null;
  supported_parameters?: string[] | null;
  is_moderated?: boolean | null;
}

export interface OpenRouterRawModelEndpointsResponse {
  data: {
    id: string;
    name?: string | null;
    endpoints?: OpenRouterRawEndpointItem[] | null;
  };
}

// Normalized Data Types
export interface NormalizedPricing {
  inputPricePerMillion: Prisma.Decimal | null;
  outputPricePerMillion: Prisma.Decimal | null;
  cacheReadPricePerMillion: Prisma.Decimal | null;
  cacheWritePricePerMillion: Prisma.Decimal | null;
  currency: string;
  pricingUnit: string;
}

export interface NormalizedModel {
  externalId: string;
  slug: string;
  name: string;
  description: string | null;
  contextWindow: number | null;
  inputModalities: string[];
  outputModalities: string[];
  architectureType: string | null;
  isReasoning: boolean;
  isOpenWeight: boolean;
  capabilities: Prisma.InputJsonValue | null;
  inferredLabSlug: string | null;
  pricing: NormalizedPricing | null;
  rawPayload: Record<string, unknown>;
  payloadHash: string;
}

export interface NormalizedProvider {
  externalId: string;
  name: string;
  slug: string;
  website: string | null;
  privacyPolicyUrl: string | null;
  termsOfServiceUrl: string | null;
  statusPageUrl: string | null;
  headquarters: string | null;
  datacenters: string[];
  rawPayload: Record<string, unknown>;
  payloadHash: string;
}

export interface NormalizedEndpoint {
  endpointKey: string;
  name: string;
  providerExternalSlug: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputModalities?: string[];
  outputModalities?: string[];
  status: "ONLINE" | "OFFLINE" | "DEPRECATED" | "UNKNOWN";
  isModerated: boolean;
  pricing: NormalizedPricing | null;
  rawPayload: Record<string, unknown>;
  payloadHash: string;
}

export interface SyncOptions {
  batchId?: string;
  dryRun?: boolean;
  limit?: number;
  modelsOnly?: boolean;
  providersOnly?: boolean;
  endpointsOnly?: boolean;
  includeEndpoints?: boolean;
  endpointModelLimit?: number;
}

export interface SyncResult {
  syncRunId: string;
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
  pricingRecordsCreated: number;
  rawRecordsCreated: number;
  errors: string[];
  durationMs: number;
}
