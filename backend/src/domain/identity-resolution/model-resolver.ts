import { PrismaClient } from "@oneatlas/database";
import type {
  ExternalModelInput,
  ResolutionResult,
} from "./types";
import { ExactMatcher } from "./exact-matcher";
import { CanonicalMatcher } from "./canonical-matcher";
import { AliasResolver } from "./alias-resolver";
import { CandidateGenerator } from "./candidate-generator";
import { CandidateRanker } from "./candidate-ranker";
import { DecisionEngine } from "./decision-engine";
import { ConflictDetector } from "./conflict-detector";

export class ModelResolver {
  private readonly exactMatcher: ExactMatcher;
  private readonly canonicalMatcher: CanonicalMatcher;
  private readonly aliasResolver: AliasResolver;
  private readonly candidateGenerator: CandidateGenerator;
  private readonly candidateRanker: CandidateRanker;
  private readonly decisionEngine: DecisionEngine;
  private readonly conflictDetector: ConflictDetector;

  constructor(private readonly prisma: PrismaClient) {
    this.exactMatcher = new ExactMatcher(prisma);
    this.canonicalMatcher = new CanonicalMatcher(prisma);
    this.aliasResolver = new AliasResolver(prisma);
    this.candidateGenerator = new CandidateGenerator(prisma);
    this.candidateRanker = new CandidateRanker();
    this.decisionEngine = new DecisionEngine();
    this.conflictDetector = new ConflictDetector();
  }

  /**
   * Resolves canonical model identity across the ordered 5 strategies.
   *
   * 1. Strategy 1: Existing exact source mapping
   * 2. Strategy 2: Authoritative canonical_model_id
   * 3. Strategy 3: Verified explicit alias mappings
   * 4. Strategy 4: Heuristic candidate generation (retained for review, NO automatic merge)
   * 5. Strategy 5: Unresolved identity
   */
  async resolveModel(input: ExternalModelInput, options: { persistCandidates?: boolean } = {}): Promise<ResolutionResult> {
    const shouldPersist = options.persistCandidates ?? true;

    // -------------------------------------------------------------
    // STRATEGY 1: Existing Exact Source Mapping (sourceId + externalModelId)
    // -------------------------------------------------------------
    const exactMatch = await this.exactMatcher.match(input);
    if (exactMatch.isMatch && exactMatch.model) {
      const conflicts = this.conflictDetector.detectModelConflicts(exactMatch.model, input);
      return this.decisionEngine.evaluate({
        strategy: "STRATEGY_1_EXACT_SOURCE_MAPPING",
        canonicalModelId: exactMatch.model.id,
        canonicalModelSlug: exactMatch.model.slug,
        evidence: exactMatch.evidence,
        conflicts,
      });
    }

    // -------------------------------------------------------------
    // STRATEGY 2: Authoritative canonical_model_id
    // -------------------------------------------------------------
    const canonicalMatch = await this.canonicalMatcher.match(input);
    if (canonicalMatch.isMatch && canonicalMatch.model) {
      const conflicts = this.conflictDetector.detectModelConflicts(canonicalMatch.model, input);
      return this.decisionEngine.evaluate({
        strategy: "STRATEGY_2_AUTHORITATIVE_CANONICAL_ID",
        canonicalModelId: canonicalMatch.model.id,
        canonicalModelSlug: canonicalMatch.model.slug,
        evidence: canonicalMatch.evidence,
        conflicts,
      });
    }

    // -------------------------------------------------------------
    // STRATEGY 3: Verified Explicit Alias Mapping
    // -------------------------------------------------------------
    const aliasMatch = await this.aliasResolver.match(input);
    if (aliasMatch.isMatch && aliasMatch.model) {
      const conflicts = this.conflictDetector.detectModelConflicts(aliasMatch.model, input);
      return this.decisionEngine.evaluate({
        strategy: "STRATEGY_3_EXPLICIT_ALIAS",
        canonicalModelId: aliasMatch.model.id,
        canonicalModelSlug: aliasMatch.model.slug,
        evidence: aliasMatch.evidence,
        conflicts,
      });
    }

    // -------------------------------------------------------------
    // STRATEGY 4: Heuristic Candidate Generation
    // -------------------------------------------------------------
    const rawCandidates = await this.candidateGenerator.generateCandidates(input);
    const rankedCandidates = this.candidateRanker.rank(rawCandidates, {
      minScoreThreshold: 30,
      maxCandidates: 3,
    });

    if (rankedCandidates.length > 0) {
      // Check existing candidate records in database to avoid duplicate rows or resurfacing REJECTED suggestions
      let topCandidateRecordId: string | undefined;

      if (shouldPersist) {
        for (const candidate of rankedCandidates) {
          const existing = await this.prisma.modelResolutionCandidate.findUnique({
            where: {
              sourceId_externalModelId_candidateModelId: {
                sourceId: input.sourceId,
                externalModelId: input.externalModelId,
                candidateModelId: candidate.candidateModelId,
              },
            },
          });

          if (!existing) {
            const created = await this.prisma.modelResolutionCandidate.create({
              data: {
                sourceId: input.sourceId,
                externalModelId: input.externalModelId,
                candidateModelId: candidate.candidateModelId,
                matchingStrategy: candidate.matchingStrategy,
                confidenceScore: candidate.confidenceScore,
                evidence: candidate.evidence as unknown as object,
                status: "PENDING",
              },
            });
            if (!topCandidateRecordId) topCandidateRecordId = created.id;
          } else {
            if (!topCandidateRecordId) topCandidateRecordId = existing.id;
          }
        }
      }

      const res = this.decisionEngine.evaluate({
        strategy: "STRATEGY_4_HEURISTIC_CANDIDATE",
        evidence: rankedCandidates[0].evidence,
        candidates: rankedCandidates,
      });
      res.candidateRecordId = topCandidateRecordId;
      return res;
    }

    // -------------------------------------------------------------
    // STRATEGY 5: Unresolved Identity
    // -------------------------------------------------------------
    return this.decisionEngine.evaluate({
      strategy: "STRATEGY_5_UNRESOLVED",
      evidence: [],
      unresolvedReason: `External model '${input.externalModelId}' could not be matched by exact mapping, canonical_model_id, verified alias, or heuristic threshold.`,
    });
  }
}
