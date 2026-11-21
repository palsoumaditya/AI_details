import { PrismaClient, Model } from "@/generated/prisma/client";
import type { ExternalModelInput, CandidateMatch, MatchEvidence } from "./types";
import { normalizeModelIdentity } from "./normalizer";
import { createEvidence, calculateConfidenceScore } from "./confidence";
import { ConflictDetector } from "./conflict-detector";

export class CandidateGenerator {
  private readonly conflictDetector = new ConflictDetector();

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Strategy 4: Heuristic candidate generation.
   * Generates candidate matches using bounded queries and transparent scoring.
   * STRICT: Candidate generation NEVER automatically merges or persists canonical mappings.
   */
  async generateCandidates(
    input: ExternalModelInput,
    existingModels?: Model[]
  ): Promise<CandidateMatch[]> {
    const norm = normalizeModelIdentity(input);

    // 1. Fetch candidate pool: either provided or queried from DB by bounded criteria
    let pool: Model[];
    if (existingModels && existingModels.length > 0) {
      pool = existingModels;
    } else {
      // Bounded query to avoid full-table scans
      const orConditions: Array<Record<string, unknown>> = [];

      if (norm.family) {
        orConditions.push({ family: { equals: norm.family, mode: "insensitive" } });
      }
      if (norm.normalizedSlug) {
        orConditions.push({ slug: { contains: norm.normalizedSlug, mode: "insensitive" } });
      }
      if (norm.publisherNamespace) {
        orConditions.push({ slug: { contains: norm.publisherNamespace, mode: "insensitive" } });
      }

      pool = await this.prisma.model.findMany({
        where: orConditions.length > 0 ? { OR: orConditions } : {},
        take: 50,
      });
    }

    const candidates: CandidateMatch[] = [];

    for (const model of pool) {
      const modelNorm = normalizeModelIdentity({
        id: model.slug,
        name: model.name,
        family: model.family,
      });

      const evidence: MatchEvidence[] = [];

      // 1. Publisher namespace check
      if (norm.publisherNamespace && modelNorm.publisherNamespace) {
        if (norm.publisherNamespace === modelNorm.publisherNamespace) {
          if (norm.version && modelNorm.version && norm.version === modelNorm.version) {
            evidence.push(
              createEvidence(
                "SAME_PUBLISHER_AND_VERSION",
                `Matching publisher '${norm.publisherNamespace}' and version '${norm.version}'`
              )
            );
          }
        } else {
          // Divergent publishers is a heavy penalty
          evidence.push(
            createEvidence(
              "PENALTY_DIFFERENT_PUBLISHER",
              `Conflicting publisher namespaces: incoming '${norm.publisherNamespace}' vs canonical '${modelNorm.publisherNamespace}'`
            )
          );
        }
      }

      // 2. Family match
      if (norm.family && modelNorm.family) {
        if (norm.family === modelNorm.family) {
          evidence.push(
            createEvidence("SAME_FAMILY", `Matching model family '${norm.family}'`)
          );
        }
      }

      // 3. Parameter count match / mismatch
      if (norm.parameterCount && modelNorm.parameterCount) {
        if (norm.parameterCount === modelNorm.parameterCount) {
          evidence.push(
            createEvidence(
              "MATCHING_PARAMETER_COUNT",
              `Matching parameter count: ${norm.parameterCount}`
            )
          );
        } else {
          evidence.push(
            createEvidence(
              "PENALTY_DIFFERENT_PARAMETERS",
              `Conflicting parameter counts: incoming '${norm.parameterCount}' vs canonical '${modelNorm.parameterCount}'`
            )
          );
        }
      }

      // 4. Quantization mismatch penalty
      if (norm.quantization && modelNorm.quantization) {
        if (norm.quantization !== modelNorm.quantization) {
          evidence.push(
            createEvidence(
              "PENALTY_DIFFERENT_QUANTIZATION",
              `Conflicting quantization labels: incoming '${norm.quantization}' vs canonical '${modelNorm.quantization}'`
            )
          );
        }
      }

      // 5. Version mismatch penalty
      if (norm.version && modelNorm.version && norm.version !== modelNorm.version) {
        evidence.push(
          createEvidence(
            "PENALTY_DIFFERENT_VERSION",
            `Conflicting model versions: incoming '${norm.version}' vs canonical '${modelNorm.version}'`
          )
        );
      }

      // 6. Reasoning match / mismatch
      if (norm.isReasoning !== model.isReasoning) {
        evidence.push(
          createEvidence(
            "PENALTY_REASONING_MISMATCH",
            `Reasoning flag disagreement: incoming=${norm.isReasoning} vs canonical=${model.isReasoning}`
          )
        );
      }

      // 7. Context window match (supporting evidence only)
      if (input.contextWindow && model.contextWindow && input.contextWindow === model.contextWindow) {
        evidence.push(
          createEvidence(
            "MATCHING_CONTEXT_WINDOW",
            `Identical context window capacity: ${input.contextWindow}`
          )
        );
      }

      // 8. Name similarity (Levenshtein / Token overlap)
      const nameTokens1 = new Set(input.name.toLowerCase().split(/[\s\-_/.]+/).filter((t) => t.length > 2));
      const nameTokens2 = new Set(model.name.toLowerCase().split(/[\s\-_/.]+/).filter((t) => t.length > 2));
      let overlapCount = 0;
      for (const t of nameTokens1) {
        if (nameTokens2.has(t)) overlapCount++;
      }
      if (overlapCount >= 2) {
        evidence.push(
          createEvidence(
            "SIMILAR_DISPLAY_NAME",
            `Overlapping name tokens (${overlapCount} common tokens between '${input.name}' and '${model.name}')`
          )
        );
      }

      // Calculate score
      const score = calculateConfidenceScore(evidence);

      // Only retain candidates with positive confidence score >= 20
      if (score >= 20) {
        const conflicts = this.conflictDetector.detectModelConflicts(model, input);

        let recommendedAction: "APPROVE_MANUAL" | "REVIEW_CAREFULLY" | "REJECT" = "REVIEW_CAREFULLY";
        if (conflicts.some((c) => c.severity === "CRITICAL") || score < 40) {
          recommendedAction = "REJECT";
        } else if (score >= 70 && conflicts.length === 0) {
          recommendedAction = "APPROVE_MANUAL";
        }

        candidates.push({
          candidateModelId: model.id,
          candidateModelSlug: model.slug,
          candidateModelName: model.name,
          confidenceScore: score,
          matchingStrategy: "STRATEGY_4_HEURISTIC_CANDIDATE",
          evidence,
          conflicts,
          recommendedAction,
        });
      }
    }

    // Sort descending by score
    return candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }
}
