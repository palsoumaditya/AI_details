import { createHash } from "node:crypto";
import { Prisma } from "@oneatlas/database";
import type {
  OpenRouterRawPricing,
  OpenRouterRawModelItem,
  OpenRouterRawProviderItem,
  OpenRouterRawEndpointItem,
  NormalizedPricing,
  NormalizedModel,
  NormalizedProvider,
  NormalizedEndpoint,
} from "./types";

/**
 * Deterministic JSON stringifier to ensure consistent hashing across key orders.
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalJsonStringify).join(",")}]`;
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalJsonStringify((obj as Record<string, unknown>)[k])}`
  );
  return `{${entries.join(",")}}`;
}

/**
 * Computes SHA-256 hash of a payload object.
 */
export function computePayloadHash(payload: unknown): string {
  const serialized = canonicalJsonStringify(payload);
  return createHash("sha256").update(serialized).digest("hex");
}

/**
 * Safe conversion of OpenRouter per-token pricing into USD per 1 Million Tokens
 * using Prisma.Decimal to prevent floating-point rounding errors.
 */
export function normalizePricing(raw?: OpenRouterRawPricing | null): NormalizedPricing | null {
  if (!raw) return null;

  const toPricePerMillion = (val?: string | number | null): Prisma.Decimal | null => {
    if (val === undefined || val === null) return null;
    const strVal = String(val).trim();
    if (strVal === "" || isNaN(Number(strVal))) return null;

    try {
      // Multiply per-token cost by 1,000,000 using exact Decimal arithmetic
      return new Prisma.Decimal(strVal).mul(1_000_000);
    } catch {
      return null;
    }
  };

  const inputPrice = toPricePerMillion(raw.prompt);
  const outputPrice = toPricePerMillion(raw.completion);
  const cacheReadPrice = toPricePerMillion(raw.input_cache_read);
  const cacheWritePrice = toPricePerMillion(raw.input_cache_write);

  // If no pricing dimensions are specified, return null
  if (
    inputPrice === null &&
    outputPrice === null &&
    cacheReadPrice === null &&
    cacheWritePrice === null
  ) {
    return null;
  }

  return {
    inputPricePerMillion: inputPrice,
    outputPricePerMillion: outputPrice,
    cacheReadPricePerMillion: cacheReadPrice,
    cacheWritePricePerMillion: cacheWritePrice,
    currency: "USD",
    pricingUnit: "1M_TOKENS",
  };
}

/**
 * Known AI Lab namespace mappings for verified organizations.
 */
const KNOWN_LAB_NAMESPACES: Record<string, string> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  "meta-llama": "meta",
  meta: "meta",
  mistralai: "mistral",
  mistral: "mistral",
  deepseek: "deepseek",
  qwen: "qwen",
  cohere: "cohere",
  amazon: "amazon",
};

/**
 * Derives a canonical slug from an OpenRouter model ID.
 * (e.g. "openai/gpt-4o" -> "gpt-4o", "anthropic/claude-3.5-sonnet" -> "claude-3-5-sonnet")
 */
export function deriveCanonicalSlug(id: string, canonicalSlug?: string | null): string {
  if (canonicalSlug && canonicalSlug.trim() !== "") {
    const parts = canonicalSlug.split("/");
    const base = parts.length > 1 ? parts.slice(1).join("-") : parts[0];
    return base.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
  }

  const parts = id.split("/");
  const base = parts.length > 1 ? parts.slice(1).join("-") : parts[0];
  return base.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
}

/**
 * Normalizes a raw OpenRouter model item into AI Details Model specifications.
 */
export function normalizeModel(raw: OpenRouterRawModelItem): NormalizedModel {
  const [author] = raw.id.split("/");
  const inferredLabSlug = KNOWN_LAB_NAMESPACES[author.toLowerCase()] || null;

  const inputModalities = raw.architecture?.input_modalities || ["text"];
  const outputModalities = raw.architecture?.output_modalities || ["text"];

  const isReasoning =
    Boolean(raw.reasoning?.default_enabled) ||
    Boolean(raw.reasoning?.mandatory) ||
    Boolean(raw.name.toLowerCase().includes("reasoning")) ||
    raw.id.includes("o1") ||
    raw.id.includes("o3") ||
    raw.id.includes("r1");

  const isOpenWeight =
    Boolean(raw.hugging_face_id) ||
    author.toLowerCase() === "meta-llama" ||
    author.toLowerCase() === "mistralai" ||
    author.toLowerCase() === "deepseek" ||
    author.toLowerCase() === "qwen";

  const capabilities = {
    tokenizer: raw.architecture?.tokenizer || null,
    instruct_type: raw.architecture?.instruct_type || null,
    supported_parameters: raw.supported_parameters || [],
    reasoning: raw.reasoning || null,
    per_request_limits: raw.per_request_limits || null,
  };

  const payloadHash = computePayloadHash(raw);

  return {
    externalId: raw.id,
    slug: deriveCanonicalSlug(raw.id, raw.canonical_slug),
    name: raw.name,
    description: raw.description || null,
    contextWindow: raw.context_length ?? null,
    inputModalities,
    outputModalities,
    architectureType: raw.architecture?.modality || null,
    isReasoning,
    isOpenWeight,
    capabilities: capabilities as unknown as Prisma.InputJsonValue,
    inferredLabSlug,
    pricing: normalizePricing(raw.pricing),
    rawPayload: raw as unknown as Record<string, unknown>,
    payloadHash,
  };
}

/**
 * Normalizes raw OpenRouter provider item into Provider specifications.
 */
export function normalizeProvider(raw: OpenRouterRawProviderItem): NormalizedProvider {
  return {
    externalId: raw.slug,
    slug: raw.slug.toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
    name: raw.name,
    website: raw.privacy_policy_url
      ? new URL(raw.privacy_policy_url).origin
      : null,
    privacyPolicyUrl: raw.privacy_policy_url || null,
    termsOfServiceUrl: raw.terms_of_service_url || null,
    statusPageUrl: raw.status_page_url || null,
    headquarters: raw.headquarters || null,
    datacenters: raw.datacenters || [],
    rawPayload: raw as unknown as Record<string, unknown>,
    payloadHash: computePayloadHash(raw),
  };
}

/**
 * Normalizes a raw OpenRouter provider endpoint.
 */
export function normalizeEndpoint(
  raw: OpenRouterRawEndpointItem,
  modelExternalId: string
): NormalizedEndpoint {
  const providerExternalSlug =
    raw.tag?.toLowerCase() ||
    raw.provider_name?.toLowerCase().replace(/[^a-z0-9_-]/g, "-") ||
    "openrouter";

  let status: "ONLINE" | "OFFLINE" | "DEPRECATED" | "UNKNOWN" = "ONLINE";
  if (raw.status !== null && raw.status !== undefined) {
    if (raw.status === 0 || raw.status === "0") status = "ONLINE";
    else if (raw.status === -1 || raw.status === "-1") status = "OFFLINE";
    else if (typeof raw.status === "string" && raw.status.toLowerCase() === "online") status = "ONLINE";
    else if (typeof raw.status === "string" && raw.status.toLowerCase() === "offline") status = "OFFLINE";
    else status = "UNKNOWN";
  }

  const endpointKey = `${providerExternalSlug}/${modelExternalId}`;

  return {
    endpointKey,
    name: raw.name || `${raw.provider_name || providerExternalSlug} Endpoint`,
    providerExternalSlug,
    contextWindow: raw.context_length ?? null,
    maxOutputTokens: raw.max_completion_tokens ?? null,
    status,
    isModerated: Boolean(raw.is_moderated),
    pricing: normalizePricing(raw.pricing),
    rawPayload: raw as unknown as Record<string, unknown>,
    payloadHash: computePayloadHash(raw),
  };
}
