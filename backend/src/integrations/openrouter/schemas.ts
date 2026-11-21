import { z } from "zod";

/**
 * Zod validation schemas for OpenRouter API contracts.
 * Handles string numbers, nullability, missing fields, and forward-compatible metadata.
 */

export const openRouterPricingSchema = z
  .object({
    prompt: z.union([z.string(), z.number()]).nullish(),
    completion: z.union([z.string(), z.number()]).nullish(),
    request: z.union([z.string(), z.number()]).nullish(),
    image: z.union([z.string(), z.number()]).nullish(),
    input_cache_read: z.union([z.string(), z.number()]).nullish(),
    input_cache_write: z.union([z.string(), z.number()]).nullish(),
    discount: z.number().nullish(),
  })
  .passthrough();

export const openRouterArchitectureSchema = z
  .object({
    modality: z.string().nullish(),
    tokenizer: z.string().nullish(),
    instruct_type: z.string().nullish(),
    input_modalities: z.array(z.string()).nullish(),
    output_modalities: z.array(z.string()).nullish(),
  })
  .passthrough();

export const openRouterTopProviderSchema = z
  .object({
    context_length: z.number().nullish(),
    max_completion_tokens: z.number().nullish(),
    is_moderated: z.boolean().nullish(),
  })
  .passthrough();

export const openRouterModelItemSchema = z
  .object({
    id: z.string().min(1, "Model ID is required"),
    name: z.string().default("Unknown Model"),
    canonical_slug: z.string().nullish(),
    description: z.string().nullish(),
    created: z.number().nullish(),
    context_length: z.number().nullish(),
    architecture: openRouterArchitectureSchema.nullish(),
    pricing: openRouterPricingSchema.nullish(),
    top_provider: openRouterTopProviderSchema.nullish(),
    per_request_limits: z.record(z.string(), z.unknown()).nullish(),
    supported_parameters: z.array(z.string()).nullish(),
    hugging_face_id: z.string().nullish(),
    links: z.record(z.string(), z.string()).nullish(),
    expiration_date: z.string().nullish(),
    knowledge_cutoff: z.string().nullish(),
    reasoning: z
      .object({
        default_enabled: z.boolean().nullish(),
        default_effort: z.string().nullish(),
        mandatory: z.boolean().nullish(),
        supported_efforts: z.array(z.string()).nullish(),
      })
      .nullish(),
  })
  .passthrough();

export const openRouterModelsResponseSchema = z.object({
  data: z.array(openRouterModelItemSchema),
  total_count: z.number().optional(),
  links: z.record(z.string(), z.unknown()).optional(),
});

export const openRouterProviderItemSchema = z
  .object({
    name: z.string().min(1, "Provider name is required"),
    slug: z.string().min(1, "Provider slug is required"),
    privacy_policy_url: z.string().nullish(),
    terms_of_service_url: z.string().nullish(),
    status_page_url: z.string().nullish(),
    headquarters: z.string().nullish(),
    datacenters: z.array(z.string()).nullish(),
  })
  .passthrough();

export const openRouterProvidersResponseSchema = z.object({
  data: z.array(openRouterProviderItemSchema),
});

export const openRouterEndpointItemSchema = z
  .object({
    name: z.string().default("Endpoint"),
    model_id: z.string().nullish(),
    model_name: z.string().nullish(),
    provider_name: z.string().nullish(),
    tag: z.string().nullish(),
    context_length: z.number().nullish(),
    max_completion_tokens: z.number().nullish(),
    max_prompt_tokens: z.number().nullish(),
    pricing: openRouterPricingSchema.nullish(),
    quantization: z.string().nullish(),
    status: z.union([z.number(), z.string()]).nullish(),
    uptime_last_1d: z.number().nullish(),
    uptime_last_30m: z.number().nullish(),
    uptime_last_5m: z.number().nullish(),
    throughput_last_30m: z.number().nullish(),
    latency_last_30m: z.number().nullish(),
    supported_parameters: z.array(z.string()).nullish(),
    is_moderated: z.boolean().nullish(),
  })
  .passthrough();

export const openRouterModelEndpointsResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    name: z.string().nullish(),
    endpoints: z.array(openRouterEndpointItemSchema).nullish(),
  }),
});
