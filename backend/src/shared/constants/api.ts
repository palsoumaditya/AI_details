/**
 * Standard API Constants, Error Codes, and Allowlists for OneAtlas.dev (Phase 4A)
 */

export const API_VERSION = "v1" as const;
export const API_BASE_PATH = `/api/${API_VERSION}` as const;

/** Standardized Application Error Codes */
export const API_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/** Standard HTTP Status Codes mapped to Error Codes */
export const HTTP_STATUS_MAP: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
  DATABASE_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/** Centralized Pagination Constraints */
export const PAGINATION_CONSTRAINTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
} as const;

/** Strict Sorting Allowlists (Prevent Arbitrary DB Field Injection) */
export const SORT_ALLOWLISTS = {
  MODELS: [
    "name",
    "releaseDate",
    "contextWindow",
    "inputPrice",
    "createdAt",
  ] as const,
  PROVIDERS: ["name", "slug", "createdAt"] as const,
  LABS: ["name", "slug", "createdAt"] as const,
  RANKINGS: ["score", "recordedAt"] as const,
} as const;

export const SORT_ORDERS = ["asc", "desc"] as const;
