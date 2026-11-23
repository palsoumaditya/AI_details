import { createHash } from "crypto";
import { Prisma } from "@oneatlas/database";
import type {
  ModelsDevRawModel,
  ModelsDevRawProvider,
  ModelsDevRawProviderModel,
  ModelsDevRawCost,
  NormalizedCanonicalModel,
  NormalizedProvider,
  NormalizedEndpoint,
  NormalizedPricing,
} from "./types";

/**
 * Verified AI Lab namespace mapping.
 * Only map authoritative namespaces established by known lab records.
 * Ambiguous or arbitrary namespaces remain unresolved (null).
 */
export const VERIFIED_LAB_NAMESPACES: Record<string, string> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  deepmind: "google",
  meta: "meta",
  "meta-llama": "meta",
  mistral: "mistral",
  mistralai: "mistral",
  deepseek: "deepseek",
  "deepseek-ai": "deepseek",
};

/**
 * Recursively produces a canonical JSON string with sorted object keys.
 * Guarantees identical SHA-256 hashes for equivalent JSON payloads.
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalJsonStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const keyValues = keys.map(
    (key) =>
      `${JSON.stringify(key)}:${canonicalJsonStringify(
        (obj as Record<string, unknown>)[key]
      )}`
  );
  return `{${keyValues.join(",")}}`;
}

/**
 * Computes deterministic SHA-256 hash of any JSON payload.
 */
export function computePayloadHash(payload: unknown): string {
  const canonical = canonicalJsonStringify(payload);
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Derives a canonical slug from a Models.dev model ID.
 * e.g. "openai/gpt-4o" -> "gpt-4o"
 *      "sao10k/l3.3-euryale-70b" -> "l3.3-euryale-70b"
 */
export function deriveCanonicalSlug(id: string): string {
  const parts = id.split("/");
  const modelPart = parts.length > 1 ? parts[1] : parts[0];
  return modelPart.toLowerCase().replace(/[^a-z0-9_.-]/g, "-");
}

/**
 * Parses release date string (e.g. "2024-12-18") safely.
 */
function parseReleaseDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Normalizes Models.dev pricing costs into AI Details schema.
 * CRITICAL RULE: Models.dev cost values are ALREADY in USD per 1M tokens.
 * Do NOT multiply by 1,000,000!
 */
export function normalizePricing(cost?: ModelsDevRawCost | null): NormalizedPricing | null {
  if (!cost || typeof cost !== "object") return null;

  const hasAnyCost =
    cost.input !== undefined ||
    cost.output !== undefined ||
    cost.cache_read !== undefined ||
    cost.cache_write !== undefined;

  if (!hasAnyCost) return null;

  return {
    inputPricePerMillion:
      cost.input !== undefined && cost.input !== null
        ? new Prisma.Decimal(cost.input)
        : null,
    outputPricePerMillion:
      cost.output !== undefined && cost.output !== null
        ? new Prisma.Decimal(cost.output)
        : null,
    cacheReadPricePerMillion:
      cost.cache_read !== undefined && cost.cache_read !== null
        ? new Prisma.Decimal(cost.cache_read)
        : null,
    cacheWritePricePerMillion:
      cost.cache_write !== undefined && cost.cache_write !== null
        ? new Prisma.Decimal(cost.cache_write)
        : null,
    currency: "USD",
    pricingUnit: "1M_TOKENS",
  };
}

/**
 * Normalizes a provider-independent model from models.json.
 */
export function normalizeCanonicalModel(raw: ModelsDevRawModel): NormalizedCanonicalModel {
  const parts = raw.id.split("/");
  const authorNamespace = parts.length > 1 ? parts[0].toLowerCase() : null;
  const inferredLabSlug = authorNamespace ? VERIFIED_LAB_NAMESPACES[authorNamespace] || null : null;

  const inputModalities = raw.modalities?.input || ["text"];
  const outputModalities = raw.modalities?.output || ["text"];

  const isReasoning =
    Boolean(raw.reasoning) ||
    raw.id.includes("o1") ||
    raw.id.includes("o3") ||
    raw.id.includes("r1") ||
    raw.name.toLowerCase().includes("reasoning");

  const isOpenWeight =
    Boolean(raw.open_weights) ||
    Boolean(raw.weights && raw.weights.length > 0) ||
    authorNamespace === "meta" ||
    authorNamespace === "meta-llama" ||
    authorNamespace === "mistralai" ||
    authorNamespace === "deepseek";

  const capabilities = {
    attachment: raw.attachment ?? null,
    reasoning: raw.reasoning ?? null,
    tool_call: raw.tool_call ?? null,
    temperature: raw.temperature ?? null,
    weights: raw.weights ?? null,
    benchmarks: raw.benchmarks ?? null,
    last_updated: raw.last_updated ?? null,
  };

  const payloadHash = computePayloadHash(raw);

  return {
    externalId: raw.id,
    slug: deriveCanonicalSlug(raw.id),
    name: raw.name,
    description: raw.description || null,
    family: raw.family || null,
    releaseDate: parseReleaseDate(raw.release_date),
    knowledgeCutoff: raw.knowledge || null,
    license: raw.license || null,
    isReasoning,
    isOpenWeight,
    inputModalities,
    outputModalities,
    contextWindow: raw.limit?.context ?? null,
    maxOutputTokens: raw.limit?.output ?? null,
    capabilities: capabilities as unknown as Prisma.InputJsonValue,
    inferredLabSlug,
    rawPayload: raw as Record<string, unknown>,
    payloadHash,
  };
}

/**
 * Normalizes a provider from api.json.
 */
export function normalizeProvider(raw: ModelsDevRawProvider): NormalizedProvider {
  let website: string | null = null;
  if (raw.api) {
    try {
      website = new URL(raw.api).origin;
    } catch {
      website = null;
    }
  }

  return {
    externalId: raw.id,
    slug: raw.id.toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
    name: raw.name,
    website,
    apiDocUrl: raw.doc || null,
    envVars: raw.env || [],
    rawPayload: raw as Record<string, unknown>,
    payloadHash: computePayloadHash(raw),
  };
}

/**
 * Normalizes a provider-specific model offering from api.json.
 */
export function normalizeEndpoint(
  providerId: string,
  raw: ModelsDevRawProviderModel
): NormalizedEndpoint {
  const capabilities = {
    attachment: raw.attachment ?? null,
    reasoning: raw.reasoning ?? null,
    reasoning_options: raw.reasoning_options ?? null,
    tool_call: raw.tool_call ?? null,
    structured_output: raw.structured_output ?? null,
    temperature: raw.temperature ?? null,
    status: raw.status ?? null,
  };

  return {
    externalEndpointId: `${providerId}/${raw.id}`,
    providerExternalId: providerId,
    modelExternalId: raw.id,
    canonicalModelId: raw.canonical_model_id || null,
    endpointKey: raw.id,
    name: raw.name || null,
    contextWindow: raw.limit?.context ?? null,
    maxOutputTokens: raw.limit?.output ?? null,
    inputModalities: raw.modalities?.input && raw.modalities.input.length > 0 ? raw.modalities.input : ["text"],
    outputModalities: raw.modalities?.output && raw.modalities.output.length > 0 ? raw.modalities.output : ["text"],
    capabilities: capabilities as unknown as Prisma.InputJsonValue,
    pricing: normalizePricing(raw.cost),
    rawPayload: raw as Record<string, unknown>,
    payloadHash: computePayloadHash(raw),
  };
}
