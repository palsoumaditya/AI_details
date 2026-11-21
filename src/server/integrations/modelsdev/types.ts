import { Prisma } from "@/generated/prisma/client";

/**
 * Raw Models.dev API contracts and normalized OneAtlas domain types.
 */

// ==========================================
// RAW MODELs.DEV RESPONSE TYPES
// ==========================================

export interface ModelsDevRawModality {
  input?: string[] | null;
  output?: string[] | null;
}

export interface ModelsDevRawLimit {
  context?: number | null;
  output?: number | null;
}

export interface ModelsDevRawWeight {
  label?: string | null;
  url?: string | null;
}

export interface ModelsDevRawBenchmark {
  name?: string | null;
  score?: number | null;
  metric?: string | null;
  source?: string | null;
}

export interface ModelsDevRawModel {
  id: string;
  name: string;
  description?: string | null;
  family?: string | null;
  attachment?: boolean | null;
  reasoning?: boolean | null;
  tool_call?: boolean | null;
  temperature?: boolean | null;
  knowledge?: string | null;
  release_date?: string | null;
  last_updated?: string | null;
  modalities?: ModelsDevRawModality | null;
  open_weights?: boolean | null;
  limit?: ModelsDevRawLimit | null;
  license?: string | null;
  weights?: ModelsDevRawWeight[] | null;
  benchmarks?: ModelsDevRawBenchmark[] | null;
  [key: string]: unknown;
}

export interface ModelsDevRawCost {
  input?: number | null;
  output?: number | null;
  cache_read?: number | null;
  cache_write?: number | null;
  reasoning?: number | null;
  input_audio?: number | null;
  output_audio?: number | null;
  [key: string]: unknown;
}

export interface ModelsDevRawProviderModel {
  id: string;
  name?: string | null;
  description?: string | null;
  family?: string | null;
  attachment?: boolean | null;
  reasoning?: boolean | null;
  reasoning_options?: unknown[] | null;
  tool_call?: boolean | null;
  structured_output?: boolean | null;
  temperature?: boolean | null;
  knowledge?: string | null;
  release_date?: string | null;
  last_updated?: string | null;
  modalities?: ModelsDevRawModality | null;
  open_weights?: boolean | null;
  limit?: ModelsDevRawLimit | null;
  cost?: ModelsDevRawCost | null;
  canonical_model_id?: string | null;
  status?: string | null;
  [key: string]: unknown;
}

export interface ModelsDevRawProvider {
  id: string;
  name: string;
  npm?: string | null;
  api?: string | null;
  doc?: string | null;
  env?: string[] | null;
  models?: Record<string, ModelsDevRawProviderModel> | null;
  [key: string]: unknown;
}

export type ModelsDevRawModelsResponse = Record<string, ModelsDevRawModel>;
export type ModelsDevRawProvidersResponse = Record<string, ModelsDevRawProvider>;

export interface ModelsDevRawCatalogResponse {
  providers?: Record<string, ModelsDevRawProvider> | null;
  models?: Record<string, ModelsDevRawModel> | null;
}

// ==========================================
// NORMALIZED ONEATLAS DOMAIN TYPES
// ==========================================

export interface NormalizedPricing {
  inputPricePerMillion: Prisma.Decimal | null;
  outputPricePerMillion: Prisma.Decimal | null;
  cacheReadPricePerMillion: Prisma.Decimal | null;
  cacheWritePricePerMillion: Prisma.Decimal | null;
  currency: string;
  pricingUnit: string;
}

export interface NormalizedCanonicalModel {
  externalId: string;
  slug: string;
  name: string;
  description: string | null;
  family: string | null;
  releaseDate: Date | null;
  knowledgeCutoff: string | null;
  license: string | null;
  isReasoning: boolean;
  isOpenWeight: boolean;
  inputModalities: string[];
  outputModalities: string[];
  contextWindow: number | null;
  maxOutputTokens: number | null;
  capabilities: Prisma.InputJsonValue | null;
  inferredLabSlug: string | null;
  rawPayload: Record<string, unknown>;
  payloadHash: string;
}

export interface NormalizedProvider {
  externalId: string;
  slug: string;
  name: string;
  website: string | null;
  apiDocUrl: string | null;
  envVars: string[];
  rawPayload: Record<string, unknown>;
  payloadHash: string;
}

export interface NormalizedEndpoint {
  externalEndpointId: string;
  providerExternalId: string;
  modelExternalId: string;
  canonicalModelId: string | null;
  endpointKey: string;
  name: string | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  capabilities: Prisma.InputJsonValue | null;
  pricing: NormalizedPricing | null;
  rawPayload: Record<string, unknown>;
  payloadHash: string;
}

export interface ModelsDevSyncOptions {
  dryRun?: boolean;
  limit?: number;
  modelsOnly?: boolean;
  providersOnly?: boolean;
  endpointsOnly?: boolean;
}

export interface ModelsDevSyncStats {
  modelsProcessed: number;
  modelsInserted: number;
  modelsUpdated: number;
  modelsUnchanged: number;
  modelsSkipped: number;
  modelsFailed: number;

  providersProcessed: number;
  providersInserted: number;
  providersUpdated: number;
  providersUnchanged: number;
  providersSkipped: number;
  providersFailed: number;

  endpointsProcessed: number;
  endpointsInserted: number;
  endpointsUpdated: number;
  endpointsUnchanged: number;
  endpointsUnresolved: number;
  endpointsSkipped: number;
  endpointsFailed: number;

  pricingRecordsCreated: number;
  rawSnapshotsCreated: number;
  conflictsDetected: number;
}
