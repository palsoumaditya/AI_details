import { PrismaClient, Model } from "@/generated/prisma/client";
import type { ExternalModelInput, MatchEvidence } from "./types";
import { createEvidence } from "./confidence";

export interface AliasMatchResult {
  isMatch: boolean;
  model?: Model;
  evidence: MatchEvidence[];
  isCollision?: boolean;
}

/**
 * Curated, auditable registry of verified cross-source model aliases.
 * Maps exact external identifier patterns to canonical Model slugs.
 * NOTE: These are strictly manually verified aliases, NEVER generated from fuzzy heuristics.
 */
export const VERIFIED_MODEL_ALIASES: Record<string, string> = {
  // Mistral / Pixtral aliases
  "mistralai/pixtral-large-2502": "pixtral-large-2502",
  "mistral/pixtral-large-2502": "pixtral-large-2502",

  // OpenAI aliases
  "openai/o1-mini": "o1-mini",
  "openai/o1-preview": "o1-preview",
  "openai/gpt-4o-mini": "gpt-4o-mini",
  "openai/gpt-4o": "gpt-4o",

  // Anthropic aliases
  "anthropic/claude-3.5-sonnet": "claude-3-5-sonnet",
  "anthropic/claude-3-5-sonnet-20241022": "claude-3-5-sonnet",
  "anthropic/claude-3-opus": "claude-3-opus",

  // DeepSeek aliases
  "deepseek/deepseek-r1": "deepseek-r1",
  "deepseek-ai/DeepSeek-R1": "deepseek-r1",
  "deepseek/deepseek-chat": "deepseek-v3",

  // Meta Llama 3.3 aliases
  "meta-llama/llama-3.3-70b-instruct": "llama-3-3-70b-instruct",
  "meta/llama-3.3-70b-instruct": "llama-3-3-70b-instruct",
};

export class AliasResolver {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Strategy 3: Verified explicit alias mappings.
   * Resolves known alias strings to canonical Model records.
   */
  async match(input: ExternalModelInput): Promise<AliasMatchResult> {
    const rawId = input.externalModelId.trim();
    const targetSlug = VERIFIED_MODEL_ALIASES[rawId];

    if (!targetSlug) {
      return { isMatch: false, evidence: [] };
    }

    const model = await this.prisma.model.findUnique({
      where: { slug: targetSlug },
    });

    if (model) {
      return {
        isMatch: true,
        model,
        evidence: [
          createEvidence(
            "EXPLICIT_ALIAS",
            `Resolved verified explicit alias '${rawId}' -> canonical slug '${targetSlug}' (${model.id})`
          ),
        ],
      };
    }

    return {
      isMatch: false,
      evidence: [],
    };
  }
}
