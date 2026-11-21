import type {
  ResolutionResult,
  CandidateMatch,
  MatchEvidence,
  FieldConflict,
  MatchingStrategyName,
} from "./types";

export interface DecisionInput {
  strategy: MatchingStrategyName;
  canonicalModelId?: string;
  canonicalModelSlug?: string;
  evidence: MatchEvidence[];
  conflicts?: FieldConflict[];
  candidates?: CandidateMatch[];
  unresolvedReason?: string;
}

export class DecisionEngine {
  /**
   * Applies the OneAtlas canonical resolution policy.
   *
   * STRICT POLICY:
   * Only exact source mappings (Strategy 1), authoritative canonical IDs (Strategy 2),
   * and explicitly verified aliases (Strategy 3) may automatically resolve model identity.
   * Heuristic matches (Strategy 4) MUST remain candidates pending human approval.
   * Do NOT perform automatic database merges based on fuzzy scores, even when the score is high.
   */
  evaluate(input: DecisionInput): ResolutionResult {
    // 1. Authoritative Automatic Resolution (Strategies 1, 2, 3)
    if (
      (input.strategy === "STRATEGY_1_EXACT_SOURCE_MAPPING" ||
        input.strategy === "STRATEGY_2_AUTHORITATIVE_CANONICAL_ID" ||
        input.strategy === "STRATEGY_3_EXPLICIT_ALIAS") &&
      input.canonicalModelId
    ) {
      return {
        status: "RESOLVED",
        canonicalModelId: input.canonicalModelId,
        canonicalModelSlug: input.canonicalModelSlug,
        matchingStrategy: input.strategy,
        confidenceScore: input.strategy === "STRATEGY_1_EXACT_SOURCE_MAPPING" ? 100 : input.strategy === "STRATEGY_2_AUTHORITATIVE_CANONICAL_ID" ? 95 : 90,
        candidates: [],
        evidence: input.evidence,
        conflicts: input.conflicts || [],
      };
    }

    // 2. Heuristic Candidates (Strategy 4 - NEVER automatically resolved)
    if (input.candidates && input.candidates.length > 0) {
      const topCandidate = input.candidates[0];
      return {
        status: "CANDIDATE_GENERATED",
        matchingStrategy: "STRATEGY_4_HEURISTIC_CANDIDATE",
        confidenceScore: topCandidate.confidenceScore,
        candidates: input.candidates,
        evidence: topCandidate.evidence,
        conflicts: topCandidate.conflicts,
        unresolvedReason: `Heuristic matches found (Top candidate: '${topCandidate.candidateModelSlug}', score: ${topCandidate.confidenceScore}). In accordance with OneAtlas safety policy, heuristic matches require manual review and cannot be automatically merged.`,
      };
    }

    // 3. Strategy 5: Completely Unresolved
    return {
      status: "UNRESOLVED",
      matchingStrategy: "STRATEGY_5_UNRESOLVED",
      confidenceScore: 0,
      candidates: [],
      evidence: input.evidence,
      conflicts: input.conflicts || [],
      unresolvedReason: input.unresolvedReason || "No exact mapping, authoritative canonical ID, explicit alias, or eligible heuristic candidate found.",
    };
  }
}
