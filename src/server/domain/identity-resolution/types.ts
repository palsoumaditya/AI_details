import type { Prisma } from "@/generated/prisma/client";

/**
 * Normalized representation of an external model input for identity resolution.
 */
export interface ExternalModelInput {
  sourceId: string;
  externalModelId: string;
  externalSlug?: string | null;
  name: string;
  family?: string | null;
  description?: string | null;
  contextWindow?: number | null;
  maxOutputTokens?: number | null;
  inputModalities?: string[];
  outputModalities?: string[];
  architectureType?: string | null;
  isReasoning?: boolean;
  isOpenWeight?: boolean;
  capabilities?: Prisma.InputJsonValue;
  releaseDate?: Date | null;
  knowledgeCutoff?: string | null;
  license?: string | null;
  canonicalModelId?: string | null; // e.g. Models.dev canonical_model_id
  rawPayload?: Record<string, unknown>;
  payloadHash?: string | null;
}

/**
 * Comparison tokens and normalized identity properties.
 */
export interface NormalizedIdentity {
  originalId: string;
  normalizedSlug: string;
  publisherNamespace: string | null;
  baseModelName: string;
  family: string | null;
  parameterCount: string | null; // e.g. "70b", "8b"
  quantization: string | null;   // e.g. "fp8", "q4_k_m"
  instructType: string | null;   // e.g. "instruct", "base"
  version: string | null;        // e.g. "3.5", "4o"
  isReasoning: boolean;
  isOpenWeight: boolean;
}

/**
 * Individual evidence signal supporting or penalizing an identity match.
 */
export type EvidenceSignalType =
  | "EXACT_SOURCE_MAPPING"
  | "AUTHORITATIVE_CANONICAL_ID"
  | "EXPLICIT_ALIAS"
  | "SAME_PUBLISHER_AND_VERSION"
  | "SAME_FAMILY"
  | "MATCHING_PARAMETER_COUNT"
  | "MATCHING_ARCHITECTURE"
  | "MATCHING_RELEASE_INFO"
  | "SIMILAR_DISPLAY_NAME"
  | "SIMILAR_DESCRIPTION"
  | "MATCHING_CONTEXT_WINDOW"
  | "PENALTY_DIFFERENT_PUBLISHER"
  | "PENALTY_DIFFERENT_PARAMETERS"
  | "PENALTY_DIFFERENT_QUANTIZATION"
  | "PENALTY_DIFFERENT_VERSION"
  | "PENALTY_REASONING_MISMATCH";

export interface MatchEvidence {
  signal: EvidenceSignalType;
  scoreContribution: number;
  description: string;
}

export type MatchingStrategyName =
  | "STRATEGY_1_EXACT_SOURCE_MAPPING"
  | "STRATEGY_2_AUTHORITATIVE_CANONICAL_ID"
  | "STRATEGY_3_EXPLICIT_ALIAS"
  | "STRATEGY_4_HEURISTIC_CANDIDATE"
  | "STRATEGY_5_UNRESOLVED";

export type ConflictSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface FieldConflict {
  field: string;
  canonicalValue: unknown;
  incomingValue: unknown;
  sourceId: string;
  severity: ConflictSeverity;
  reason: string;
}

export interface CandidateMatch {
  candidateModelId: string;
  candidateModelSlug: string;
  candidateModelName: string;
  confidenceScore: number; // 0 to 100
  matchingStrategy: MatchingStrategyName;
  evidence: MatchEvidence[];
  conflicts: FieldConflict[];
  recommendedAction: "APPROVE_MANUAL" | "REVIEW_CAREFULLY" | "REJECT";
}

export type ResolutionStatus = "RESOLVED" | "CANDIDATE_GENERATED" | "UNRESOLVED";

export interface ResolutionResult {
  status: ResolutionStatus;
  canonicalModelId?: string;
  canonicalModelSlug?: string;
  matchingStrategy: MatchingStrategyName;
  confidenceScore: number;
  candidates: CandidateMatch[];
  evidence: MatchEvidence[];
  conflicts: FieldConflict[];
  unresolvedReason?: string;
  candidateRecordId?: string; // If persisted in model_resolution_candidates
}

export interface EndpointResolutionInput {
  sourceId: string;
  providerExternalId: string;
  modelExternalId: string;
  endpointKey: string;
  name?: string | null;
  contextWindow?: number | null;
  maxOutputTokens?: number | null;
  capabilities?: Prisma.InputJsonValue;
  status?: "ONLINE" | "OFFLINE" | "DEPRECATED" | "UNKNOWN";
  isModerated?: boolean;
  canonicalModelId?: string | null;
  rawPayload?: Record<string, unknown>;
  payloadHash?: string | null;
}

export interface EndpointResolutionResult {
  status: "RESOLVED" | "UNRESOLVED";
  endpointId?: string;
  canonicalModelId?: string;
  canonicalProviderId?: string;
  endpointSyncStatus?: "inserted" | "updated" | "unchanged";
  unresolvedReason?: string;
}
