/**
 * Centralized Ingestion Error Classification & Hierarchy
 */

export type IngestionErrorCategory =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "AUTHENTICATION_ERROR"
  | "PERMISSION_ERROR"
  | "VALIDATION_ERROR"
  | "DATABASE_ERROR"
  | "IDENTITY_UNRESOLVED"
  | "DATA_CONFLICT"
  | "LOCK_CONFLICT"
  | "INTERNAL_ERROR";

export class IngestionError extends Error {
  constructor(
    public readonly category: IngestionErrorCategory,
    message: string,
    public readonly sourceSlug?: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "IngestionError";
  }
}

export class LockConflictError extends IngestionError {
  constructor(message = "Another catalog synchronization run is currently holding the global ingestion lock.") {
    super("LOCK_CONFLICT", message);
    this.name = "LockConflictError";
  }
}

export function classifyError(error: unknown, sourceSlug?: string): IngestionError {
  if (error instanceof IngestionError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("lock") || lower.includes("advisory")) {
    return new IngestionError("LOCK_CONFLICT", message, sourceSlug, error);
  }
  if (lower.includes("timeout") || lower.includes("etimedout") || lower.includes("abort")) {
    return new IngestionError("TIMEOUT", message, sourceSlug, error);
  }
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("too many requests")) {
    return new IngestionError("RATE_LIMITED", message, sourceSlug, error);
  }
  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("authentication")) {
    return new IngestionError("AUTHENTICATION_ERROR", message, sourceSlug, error);
  }
  if (lower.includes("403") || lower.includes("forbidden") || lower.includes("permission")) {
    return new IngestionError("PERMISSION_ERROR", message, sourceSlug, error);
  }
  if (lower.includes("zod") || lower.includes("validation") || lower.includes("schema")) {
    return new IngestionError("VALIDATION_ERROR", message, sourceSlug, error);
  }
  if (lower.includes("prisma") || lower.includes("postgres") || lower.includes("database") || lower.includes("connection")) {
    return new IngestionError("DATABASE_ERROR", message, sourceSlug, error);
  }
  if (lower.includes("fetch") || lower.includes("econnrefused") || lower.includes("econnreset") || lower.includes("network")) {
    return new IngestionError("NETWORK_ERROR", message, sourceSlug, error);
  }

  return new IngestionError("INTERNAL_ERROR", message, sourceSlug, error);
}
