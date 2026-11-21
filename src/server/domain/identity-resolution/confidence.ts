import type { MatchEvidence, EvidenceSignalType } from "./types";

/**
 * Transparent Scoring Weights for Evidence Signals.
 *
 * Ground rules:
 * - Authoritative/Exact signals (+90 to +100) are the ONLY ones eligible for automatic resolution.
 * - Heuristic signals (+5 to +30) are strictly for ranking reviewable candidate matches.
 * - Conflicting signals (-25 to -50) heavily penalize mismatches (e.g. different parameter counts or versions).
 */
export const SIGNAL_WEIGHTS: Record<EvidenceSignalType, number> = {
  EXACT_SOURCE_MAPPING: 100,
  AUTHORITATIVE_CANONICAL_ID: 95,
  EXPLICIT_ALIAS: 90,

  SAME_PUBLISHER_AND_VERSION: 30,
  SAME_FAMILY: 15,
  MATCHING_PARAMETER_COUNT: 15,
  MATCHING_ARCHITECTURE: 10,
  MATCHING_RELEASE_INFO: 10,
  SIMILAR_DISPLAY_NAME: 10,
  SIMILAR_DESCRIPTION: 5,
  MATCHING_CONTEXT_WINDOW: 5,

  PENALTY_DIFFERENT_PUBLISHER: -40,
  PENALTY_DIFFERENT_PARAMETERS: -40,
  PENALTY_DIFFERENT_QUANTIZATION: -30,
  PENALTY_DIFFERENT_VERSION: -50,
  PENALTY_REASONING_MISMATCH: -25,
};

/**
 * Creates an evidence record with documented score contribution.
 */
export function createEvidence(signal: EvidenceSignalType, detail: string): MatchEvidence {
  const scoreContribution = SIGNAL_WEIGHTS[signal] || 0;
  return {
    signal,
    scoreContribution,
    description: `[${signal}] (${scoreContribution >= 0 ? "+" : ""}${scoreContribution} pts): ${detail}`,
  };
}

/**
 * Aggregates evidence records into a bounded confidence score (0 to 100).
 */
export function calculateConfidenceScore(evidenceList: MatchEvidence[]): number {
  const total = evidenceList.reduce((sum, item) => sum + item.scoreContribution, 0);
  return Math.max(0, Math.min(100, Math.round(total)));
}
