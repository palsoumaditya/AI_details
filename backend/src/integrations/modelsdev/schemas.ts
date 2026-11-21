import { z } from "zod";

/**
 * Zod validation schemas for Models.dev API v1 endpoints.
 * Enforces strict typing on identity and numerical fields,
 * while allowing forward-compatible optional metadata.
 */

export const modelsDevModalitySchema = z
  .object({
    input: z.array(z.string()).nullish(),
    output: z.array(z.string()).nullish(),
  })
  .nullish();

export const modelsDevLimitSchema = z
  .object({
    context: z.number().int().nullish(),
    output: z.number().int().nullish(),
  })
  .nullish();

export const modelsDevWeightSchema = z
  .object({
    label: z.string().nullish(),
    url: z.string().nullish(),
  })
  .passthrough();

export const modelsDevBenchmarkSchema = z
  .object({
    name: z.string().nullish(),
    score: z.number().nullish(),
    metric: z.string().nullish(),
    source: z.string().nullish(),
  })
  .passthrough();

export const modelsDevCanonicalModelSchema = z
  .object({
    id: z.string().min(1, "Model ID is required"),
    name: z.string().min(1, "Model name is required"),
    description: z.string().nullish(),
    family: z.string().nullish(),
    attachment: z.boolean().nullish(),
    reasoning: z.boolean().nullish(),
    tool_call: z.boolean().nullish(),
    temperature: z.boolean().nullish(),
    knowledge: z.string().nullish(),
    release_date: z.string().nullish(),
    last_updated: z.string().nullish(),
    modalities: modelsDevModalitySchema,
    open_weights: z.boolean().nullish(),
    limit: modelsDevLimitSchema,
    license: z.string().nullish(),
    weights: z.array(modelsDevWeightSchema).nullish(),
    benchmarks: z.array(modelsDevBenchmarkSchema).nullish(),
  })
  .passthrough();

export const modelsDevPricingSchema = z
  .object({
    input: z.number().nullish(),
    output: z.number().nullish(),
    cache_read: z.number().nullish(),
    cache_write: z.number().nullish(),
    reasoning: z.number().nullish(),
    input_audio: z.number().nullish(),
    output_audio: z.number().nullish(),
  })
  .passthrough()
  .nullish();

export const modelsDevProviderModelSchema = z
  .object({
    id: z.string().min(1, "Provider model ID is required"),
    name: z.string().nullish(),
    description: z.string().nullish(),
    family: z.string().nullish(),
    attachment: z.boolean().nullish(),
    reasoning: z.boolean().nullish(),
    reasoning_options: z.array(z.unknown()).nullish(),
    tool_call: z.boolean().nullish(),
    structured_output: z.boolean().nullish(),
    temperature: z.boolean().nullish(),
    knowledge: z.string().nullish(),
    release_date: z.string().nullish(),
    last_updated: z.string().nullish(),
    modalities: modelsDevModalitySchema,
    open_weights: z.boolean().nullish(),
    limit: modelsDevLimitSchema,
    cost: modelsDevPricingSchema,
    canonical_model_id: z.string().nullish(),
    status: z.string().nullish(),
  })
  .passthrough();

export const modelsDevProviderSchema = z
  .object({
    id: z.string().min(1, "Provider ID is required"),
    name: z.string().min(1, "Provider name is required"),
    npm: z.string().nullish(),
    api: z.string().nullish(),
    doc: z.string().nullish(),
    env: z.array(z.string()).nullish(),
    models: z.record(z.string(), modelsDevProviderModelSchema).nullish(),
  })
  .passthrough();

export const modelsDevModelsResponseSchema = z.record(
  z.string(),
  modelsDevCanonicalModelSchema
);

export const modelsDevProvidersResponseSchema = z.record(
  z.string(),
  modelsDevProviderSchema
);

export const modelsDevCatalogResponseSchema = z
  .object({
    providers: z.record(z.string(), modelsDevProviderSchema).nullish(),
    models: z.record(z.string(), modelsDevCanonicalModelSchema).nullish(),
  })
  .passthrough();
