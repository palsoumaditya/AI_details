import { PrismaClient, AiLab, Prisma } from "@oneatlas/database";

/**
 * Authoritative mapping of organization namespaces, slug prefixes, and families to canonical AI Lab slugs.
 */
export const CANONICAL_LAB_MAPPINGS: Record<string, string> = {
  // OpenAI
  openai: "openai",
  "~openai": "openai",
  gpt: "openai",

  // Anthropic
  anthropic: "anthropic",
  "~anthropic": "anthropic",
  claude: "anthropic",

  // Google DeepMind
  google: "google",
  "~google": "google",
  deepmind: "google",
  "google-deepmind": "google",
  gemini: "google",
  gemma: "google",

  // Meta AI
  meta: "meta",
  "meta-llama": "meta",
  llama: "meta",

  // Mistral AI
  mistral: "mistral",
  mistralai: "mistral",
  pixtral: "mistral",
  codestral: "mistral",

  // DeepSeek
  deepseek: "deepseek",
  "~deepseek": "deepseek",
  "deepseek-ai": "deepseek",

  // xAI
  xai: "xai",
  "x-ai": "xai",
  "~x-ai": "xai",
  grok: "xai",

  // Qwen / Alibaba
  qwen: "qwen",
  alibaba: "qwen",

  // Cohere
  cohere: "cohere",
  command: "cohere",
};

export class LabResolver {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolves the canonical AI Lab slug for a given external model ID, name, or family.
   */
  resolveLabSlug(
    externalId: string,
    name?: string | null,
    family?: string | null
  ): string | null {
    // 1. Author prefix from external ID (e.g. "anthropic/claude-3-5-sonnet" -> "anthropic")
    const parts = externalId.split("/");
    if (parts.length > 1) {
      const author = parts[0].toLowerCase().trim();
      if (CANONICAL_LAB_MAPPINGS[author]) {
        return CANONICAL_LAB_MAPPINGS[author];
      }
    }

    // 2. Family match
    if (family) {
      const famLower = family.toLowerCase().trim();
      if (CANONICAL_LAB_MAPPINGS[famLower]) {
        return CANONICAL_LAB_MAPPINGS[famLower];
      }
      if (famLower.includes("claude")) return "anthropic";
      if (famLower.includes("gpt") || famLower.includes("o1") || famLower.includes("o3")) return "openai";
      if (famLower.includes("gemini") || famLower.includes("gemma")) return "google";
      if (famLower.includes("llama")) return "meta";
      if (famLower.includes("deepseek")) return "deepseek";
      if (famLower.includes("mistral") || famLower.includes("pixtral")) return "mistral";
      if (famLower.includes("grok")) return "xai";
      if (famLower.includes("qwen")) return "qwen";
    }

    // 3. Name or slug heuristics
    const text = `${externalId} ${name || ""}`.toLowerCase();
    if (/\b(claude)\b/.test(text)) return "anthropic";
    if (/\b(deepseek)\b/.test(text)) return "deepseek";
    if (/\b(llama|meta-llama)\b/.test(text) && !text.includes("sao10k")) return "meta";
    if (/\b(gpt-4|gpt-3|gpt-5|o1-|o3-|o4-)\b/.test(text)) return "openai";
    if (/\b(gemini|gemma)\b/.test(text) && !text.includes("bge-")) return "google";
    if (/\b(mistral|codestral|pixtral)\b/.test(text)) return "mistral";
    if (/\b(grok)\b/.test(text)) return "xai";

    return null;
  }

  /**
   * Links a canonical Model to its creator AI Lab idempotently.
   */
  async linkModelToLab(
    modelId: string,
    labSlug: string,
    db: Prisma.TransactionClient | PrismaClient = this.prisma
  ): Promise<boolean> {
    const lab = await db.aiLab.findUnique({
      where: { slug: labSlug },
    });

    if (!lab) return false;

    await db.modelLab.upsert({
      where: {
        modelId_aiLabId_relationshipType: {
          modelId,
          aiLabId: lab.id,
          relationshipType: "CREATOR",
        },
      },
      update: {},
      create: {
        modelId,
        aiLabId: lab.id,
        relationshipType: "CREATOR",
      },
    });

    return true;
  }
}
