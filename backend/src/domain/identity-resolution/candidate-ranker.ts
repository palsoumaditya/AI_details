import type { CandidateMatch } from "./types";

export interface RankingOptions {
  minScoreThreshold?: number;
  maxCandidates?: number;
  excludeCriticalConflicts?: boolean;
}

export class CandidateRanker {
  /**
   * Filters and ranks candidate matches.
   */
  rank(candidates: CandidateMatch[], options: RankingOptions = {}): CandidateMatch[] {
    const minScore = options.minScoreThreshold ?? 20;
    const maxCount = options.maxCandidates ?? 5;
    const excludeCritical = options.excludeCriticalConflicts ?? false;

    return candidates
      .filter((c) => {
        if (c.confidenceScore < minScore) return false;
        if (excludeCritical && c.conflicts.some((conf) => conf.severity === "CRITICAL")) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // First sort by confidence score descending
        if (b.confidenceScore !== a.confidenceScore) {
          return b.confidenceScore - a.confidenceScore;
        }
        // Then by fewer conflicts
        return a.conflicts.length - b.conflicts.length;
      })
      .slice(0, maxCount);
  }
}
