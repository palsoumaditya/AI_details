import { PrismaClient, Model } from "@oneatlas/database";
import type { ExternalModelInput, MatchEvidence } from "./types";
import { createEvidence } from "./confidence";
import { normalizeModelIdentity } from "./normalizer";

export interface CanonicalMatchResult {
  isMatch: boolean;
  model?: Model;
  evidence: MatchEvidence[];
  sourceMappingFound: boolean;
}

export class CanonicalMatcher {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Strategy 2: Authoritative canonical_model_id.
   * When an upstream catalog supplies a canonical_model_id (e.g. Models.dev provider endpoint
   * pointing to an authoritative catalog entry):
   * 1. Resolves through ModelSourceMapping of the canonical ID.
   * 2. Checks canonical Model slug if direct mapping is not yet created.
   * 3. Attaches provider offering to the verified canonical model while preserving provider IDs.
   */
  async match(input: ExternalModelInput): Promise<CanonicalMatchResult> {
    if (!input.canonicalModelId || input.canonicalModelId.trim() === "") {
      return { isMatch: false, evidence: [], sourceMappingFound: false };
    }

    const canonicalId = input.canonicalModelId.trim();

    // 1. Look for ModelSourceMapping matching the authoritative canonicalModelId
    // First in the same source
    let mapping = await this.prisma.modelSourceMapping.findUnique({
      where: {
        sourceId_externalModelId: {
          sourceId: input.sourceId,
          externalModelId: canonicalId,
        },
      },
      include: { model: true },
    });

    if (mapping) {
      return {
        isMatch: true,
        model: mapping.model,
        sourceMappingFound: true,
        evidence: [
          createEvidence(
            "AUTHORITATIVE_CANONICAL_ID",
            `Resolved authoritative canonical_model_id '${canonicalId}' via existing ModelSourceMapping (${mapping.id}) to canonical model '${mapping.model.slug}' (${mapping.model.id})`
          ),
        ],
      };
    }

    // Next, check across all sources in ModelSourceMapping for this external ID
    mapping = await this.prisma.modelSourceMapping.findFirst({
      where: {
        externalModelId: canonicalId,
      },
      include: { model: true },
    });

    if (mapping) {
      return {
        isMatch: true,
        model: mapping.model,
        sourceMappingFound: true,
        evidence: [
          createEvidence(
            "AUTHORITATIVE_CANONICAL_ID",
            `Resolved authoritative canonical_model_id '${canonicalId}' via cross-source ModelSourceMapping (${mapping.id}) to canonical model '${mapping.model.slug}' (${mapping.model.id})`
          ),
        ],
      };
    }

    // 2. Direct slug lookup on Model table using derived normalized slug
    const normalized = normalizeModelIdentity({
      id: canonicalId,
      name: canonicalId,
    });

    const modelBySlug = await this.prisma.model.findUnique({
      where: { slug: normalized.normalizedSlug },
    });

    if (modelBySlug) {
      return {
        isMatch: true,
        model: modelBySlug,
        sourceMappingFound: false,
        evidence: [
          createEvidence(
            "AUTHORITATIVE_CANONICAL_ID",
            `Resolved authoritative canonical_model_id '${canonicalId}' to canonical model by slug '${modelBySlug.slug}' (${modelBySlug.id})`
          ),
        ],
      };
    }

    return {
      isMatch: false,
      evidence: [],
      sourceMappingFound: false,
    };
  }
}
