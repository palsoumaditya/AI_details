import type { ExternalModelInput, NormalizedIdentity } from "./types";

/**
 * Known publisher aliases across catalogs.
 */
export const PUBLISHER_ALIASES: Record<string, string> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  deepseek: "deepseek",
  meta: "meta",
  "meta-llama": "meta",
  mistralai: "mistral",
  mistral: "mistral",
  qwen: "qwen",
  alibaba: "qwen",
  minimax: "minimax",
  minimaxai: "minimax",
  cohere: "cohere",
  tencent: "tencent",
  baidu: "baidu",
  xai: "xai",
  zhipuai: "zhipuai",
  "zai-org": "zhipuai",
  sao10k: "sao10k",
};

/**
 * Regular expressions for identifying key model architectural attributes.
 */
const PARAMETER_COUNT_REGEX = /\b(\d+(?:\.\d+)?)[bB]\b/;
const QUANTIZATION_REGEX = /\b(q[2-8]_[kK]_[sSmMlLiI]|q[2-8]_[0-9]|fp[48]|fp16|int[48]|bf16|awq|gptq)\b/i;
const INSTRUCT_REGEX = /\b(instruct|chat|it|rl|dpo|sft)\b/i;
const VERSION_REGEX = /\b(?:v|version)?(\d+(?:\.\d+)+)\b/i;

/**
 * Deterministic normalization layer for AI model comparison.
 * IMPORTANT: Preserves original identifiers while providing comparison-ready normalized tokens.
 */
export function normalizeModelIdentity(input: ExternalModelInput | { id: string; name: string; family?: string | null }): NormalizedIdentity {
  const originalId = "externalModelId" in input ? input.externalModelId : input.id;
  const name = input.name || "";
  const family = ("family" in input ? input.family : null) || null;

  // 1. Publisher Namespace extraction
  let publisherNamespace: string | null = null;
  let remainingId = originalId;

  if (originalId.includes("/")) {
    const parts = originalId.split("/");
    const rawPub = parts[0].toLowerCase().trim();
    publisherNamespace = PUBLISHER_ALIASES[rawPub] || rawPub;
    remainingId = parts.slice(1).join("-");
  }

  // 2. Base slug derivation
  const rawCompareString = `${remainingId} ${name}`.toLowerCase();

  // 3. Extract parameter count
  const paramMatch = rawCompareString.match(PARAMETER_COUNT_REGEX);
  const parameterCount = paramMatch ? `${paramMatch[1].toLowerCase()}b` : null;

  // 4. Extract quantization
  const quantMatch = rawCompareString.match(QUANTIZATION_REGEX);
  const quantization = quantMatch ? quantMatch[1].toLowerCase() : null;

  // 5. Extract instruction type
  const instructMatch = rawCompareString.match(INSTRUCT_REGEX);
  const instructType = instructMatch ? instructMatch[1].toLowerCase() : (rawCompareString.includes("base") ? "base" : null);

  // 6. Extract version
  const versionMatch = rawCompareString.match(VERSION_REGEX);
  const version = versionMatch ? versionMatch[1] : null;

  // 7. Reasoning designation
  const isReasoning =
    ("isReasoning" in input && Boolean(input.isReasoning)) ||
    rawCompareString.includes("reasoning") ||
    rawCompareString.includes("think") ||
    /\bo[13]\b/.test(rawCompareString) ||
    /\br1\b/.test(rawCompareString);

  // 8. Open weight status
  const isOpenWeight = "isOpenWeight" in input ? Boolean(input.isOpenWeight) : false;

  // 9. Normalized Slug for deterministic index lookup
  const normalizedSlug = remainingId
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    originalId,
    normalizedSlug,
    publisherNamespace,
    baseModelName: remainingId,
    family: family ? family.toLowerCase().trim() : null,
    parameterCount,
    quantization,
    instructType,
    version,
    isReasoning,
    isOpenWeight,
  };
}
