/**
 * @oneatlas/database — Database package public API
 *
 * Re-exports Prisma Client, generated types, and connection utilities.
 */

// Client utilities
export { createPrismaClient, getPrismaClient, prisma } from "./client";
export type { PrismaClientOptions } from "./client";

// Re-export generated Prisma Client and namespace
export { PrismaClient, Prisma } from "../generated/prisma/client";

// Re-export model types
export type {
  Model,
  Provider,
  AiLab,
  ModelLab,
  ExternalSource,
  ModelSourceMapping,
  ProviderSourceMapping,
  EndpointSourceMapping,
  ModelProviderEndpoint,
  PricingRecord,
  Benchmark,
  BenchmarkResult,
  SyncBatch,
  SyncRun,
  RawSourceRecord,
  FieldProvenance,
  DataConflict,
  ModelResolutionCandidate,
} from "../generated/prisma/client";

// Re-export enums (both runtime objects and TypeScript types)
export {
  LabRole,
  ProviderType,
  ModelStatus,
  EndpointStatus,
  BenchmarkCategory,
  MetricUnit,
  SyncTriggerType,
  SyncStatus,
  BatchStatus,
  CandidateStatus,
  ConflictSeverity,
  ConflictStatus,
} from "../generated/prisma/enums";

export type {
  LabRole as LabRoleType,
  ProviderType as ProviderTypeType,
  ModelStatus as ModelStatusType,
  EndpointStatus as EndpointStatusType,
  BenchmarkCategory as BenchmarkCategoryType,
  MetricUnit as MetricUnitType,
  SyncTriggerType as SyncTriggerTypeType,
  SyncStatus as SyncStatusType,
  BatchStatus as BatchStatusType,
  CandidateStatus as CandidateStatusType,
  ConflictSeverity as ConflictSeverityType,
  ConflictStatus as ConflictStatusType,
} from "../generated/prisma/enums";
