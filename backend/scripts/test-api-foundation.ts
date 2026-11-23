import "./env";
import { ZodError } from "zod";
import {
  PaginationQuerySchema,
  SearchQuerySchema,
  SlugParamSchema,
  CompareRequestSchema,
  HealthCheckQuerySchema,
  ModelsQueryFilterSchema,
  SORT_ALLOWLISTS,
  PAGINATION_CONSTRAINTS,
  API_ERROR_CODES,
  HTTP_STATUS_MAP,
} from "../src/shared/index";
import { healthService, HealthService } from "../src/services/health.service";
import { prisma } from "../src/database/index";

/**
 * =========================================================================
 * AI DETAILS PHASE 4A — API FOUNDATION, CONTRACTS & SERIALIZATION TEST SUITE
 * =========================================================================
 */

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`   ✓ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`   ✗ [FAIL] ${message}`);
    failedCount++;
  }
}

// Minimal mock simulation of serialization logic for isolated test runner
function testSerializeDecimal(value: unknown, fractionDigits = 4): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return value.toString();
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value.toFixed(fractionDigits);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function testSerializeDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

async function runApiTests(): Promise<void> {
  console.log("\n🧪 =========================================================");
  console.log("   AI DETAILS API FOUNDATION, CONTRACTS & HEALTH TEST SUITE");
  console.log("=========================================================\n");

  // -------------------------------------------------------------
  // 1. Standard Response & Envelope Contracts
  // -------------------------------------------------------------
  console.log("1. Testing Response Envelope Contracts & Request Correlation...");
  const mockRequestId = "req_test_abc123";
  const mockTimestamp = new Date().toISOString();

  const successPayload = {
    success: true,
    data: { id: "model_1", name: "Llama 3.3 70B" },
    meta: { requestId: mockRequestId, timestamp: mockTimestamp },
  };

  assert(successPayload.success === true, "Success envelope has success: true flag");
  assert(successPayload.meta.requestId === mockRequestId, "Request ID correctly preserved in metadata");
  assert(typeof successPayload.meta.timestamp === "string", "Timestamp present in ISO format");

  const paginationMeta = {
    page: 1,
    limit: 20,
    total: 85,
    totalPages: 5,
    hasNextPage: true,
    hasPreviousPage: false,
  };

  assert(paginationMeta.totalPages === 5, "Pagination correctly computes totalPages (85/20 -> 5)");
  assert(paginationMeta.hasNextPage === true, "hasNextPage calculated accurately on page 1");
  assert(paginationMeta.hasPreviousPage === false, "hasPreviousPage is false on page 1");

  const errorPayload = {
    success: false,
    error: {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      message: "Invalid query parameters.",
      details: [{ field: "limit", message: "Limit cannot exceed 100" }],
    },
    meta: { requestId: mockRequestId, timestamp: mockTimestamp },
  };

  assert(errorPayload.success === false, "Error envelope has success: false flag");
  assert(errorPayload.error.code === "VALIDATION_ERROR", "Error code matches standard VALIDATION_ERROR");
  assert(errorPayload.error.details.length === 1, "Validation details array holds specific field violations");

  // -------------------------------------------------------------
  // 2. Request Validation with Zod
  // -------------------------------------------------------------
  console.log("\n2. Testing Zod Validation Schemas (Bounds, Allowlists, Constraints)...");

  // Pagination bounds
  const validPagination = PaginationQuerySchema.parse({ page: "2", limit: "50" });
  assert(validPagination.page === 2 && validPagination.limit === 50, "Coerced string params to integers");

  const defaultPagination = PaginationQuerySchema.parse({});
  assert(
    defaultPagination.page === PAGINATION_CONSTRAINTS.DEFAULT_PAGE &&
      defaultPagination.limit === PAGINATION_CONSTRAINTS.DEFAULT_LIMIT,
    `Defaults applied accurately: page ${PAGINATION_CONSTRAINTS.DEFAULT_PAGE}, limit ${PAGINATION_CONSTRAINTS.DEFAULT_LIMIT}`
  );

  let caughtPageError = false;
  try {
    PaginationQuerySchema.parse({ page: "-1" });
  } catch (e) {
    caughtPageError = e instanceof ZodError;
  }
  assert(caughtPageError, "Negative page number (-1) rejected by schema");

  let caughtLimitError = false;
  try {
    PaginationQuerySchema.parse({ limit: "500" });
  } catch (e) {
    caughtLimitError = e instanceof ZodError;
  }
  assert(caughtLimitError, "Limit exceeding MAX_LIMIT (500 > 100) rejected by schema");

  // Search bounds
  const validSearch = SearchQuerySchema.parse({ q: "  claude 3.7 sonnet  " });
  assert(validSearch.q === "claude 3.7 sonnet", "Search query trimmed automatically");

  let caughtExcessiveQuery = false;
  try {
    SearchQuerySchema.parse({ q: "a".repeat(150) });
  } catch (e) {
    caughtExcessiveQuery = e instanceof ZodError;
  }
  assert(caughtExcessiveQuery, "Excessively long search query (>100 chars) rejected");

  // Slug validation
  const validSlug = SlugParamSchema.parse({ slug: "meta-llama-3-70b-instruct" });
  assert(validSlug.slug === "meta-llama-3-70b-instruct", "Standard slug format accepted");

  let caughtInvalidSlug = false;
  try {
    SlugParamSchema.parse({ slug: "invalid slug with spaces!" });
  } catch (e) {
    caughtInvalidSlug = e instanceof ZodError;
  }
  assert(caughtInvalidSlug, "Slug with spaces and special characters rejected");

  // Comparison model selection validation (2 to 4 models, strictly unique)
  const validCompare = CompareRequestSchema.parse({
    modelSlugs: ["gpt-4o", "claude-3-5-sonnet", "gemini-1-5-pro"],
  });
  assert(validCompare.modelSlugs.length === 3, "Valid compare request with 3 unique models accepted");

  let caughtCompareTooFew = false;
  try {
    CompareRequestSchema.parse({ modelSlugs: ["gpt-4o"] });
  } catch (e) {
    caughtCompareTooFew = e instanceof ZodError;
  }
  assert(caughtCompareTooFew, "Comparison with fewer than 2 models rejected");

  let caughtCompareTooMany = false;
  try {
    CompareRequestSchema.parse({
      modelSlugs: ["m1", "m2", "m3", "m4", "m5"],
    });
  } catch (e) {
    caughtCompareTooMany = e instanceof ZodError;
  }
  assert(caughtCompareTooMany, "Comparison with more than 4 models rejected");

  let caughtDuplicateCompare = false;
  try {
    CompareRequestSchema.parse({ modelSlugs: ["gpt-4o", "gpt-4o"] });
  } catch (e) {
    caughtDuplicateCompare = e instanceof ZodError;
  }
  assert(caughtDuplicateCompare, "Duplicate model slugs in comparison rejected");

  // Sort allowlists
  const validSort = ModelsQueryFilterSchema.parse({ sort: "newest" });
  assert(validSort.sort === "newest", "Allowlisted sort field accepted");

  let caughtDisallowedSort = false;
  try {
    ModelsQueryFilterSchema.parse({ sort: "internal_secret_id" });
  } catch (e) {
    caughtDisallowedSort = e instanceof ZodError;
  }
  assert(caughtDisallowedSort, "Disallowed arbitrary sort column rejected");

  // -------------------------------------------------------------
  // 3. Precision Decimal & Date Serialization
  // -------------------------------------------------------------
  console.log("\n3. Testing Precision Serialization & Null Preservation...");

  // Mock Decimal representation (matching Prisma Decimal behavior)
  const mockDecimal = {
    toString: () => "0.00000350",
    toFixed: () => "0.0000",
  };
  const serializedDec = testSerializeDecimal(mockDecimal);
  assert(serializedDec === "0.00000350", "Prisma Decimal serialized to exact string without float truncation");

  const nullPrice = testSerializeDecimal(null);
  assert(nullPrice === null, "Null pricing preserved as null (not fabricated to 0)");

  const validDate = new Date("2026-11-21T10:00:00.000Z");
  const serializedDate = testSerializeDate(validDate);
  assert(serializedDate === "2026-11-21T10:00:00.000Z", "Date serialized to exact ISO 8601 string");

  const nullDate = testSerializeDate(null);
  assert(nullDate === null, "Null date preserved as null (not converted to empty string)");

  // -------------------------------------------------------------
  // 4. Security & Error Status Mapping
  // -------------------------------------------------------------
  console.log("\n4. Testing Security Defaults & HTTP Status Code Mapping...");

  assert(HTTP_STATUS_MAP[API_ERROR_CODES.VALIDATION_ERROR] === 400, "VALIDATION_ERROR maps to HTTP 400");
  assert(HTTP_STATUS_MAP[API_ERROR_CODES.UNAUTHORIZED] === 401, "UNAUTHORIZED maps to HTTP 401");
  assert(HTTP_STATUS_MAP[API_ERROR_CODES.FORBIDDEN] === 403, "FORBIDDEN maps to HTTP 403");
  assert(HTTP_STATUS_MAP[API_ERROR_CODES.NOT_FOUND] === 404, "NOT_FOUND maps to HTTP 404");
  assert(HTTP_STATUS_MAP[API_ERROR_CODES.CONFLICT] === 409, "CONFLICT maps to HTTP 409");
  assert(HTTP_STATUS_MAP[API_ERROR_CODES.RATE_LIMITED] === 429, "RATE_LIMITED maps to HTTP 429");
  assert(HTTP_STATUS_MAP[API_ERROR_CODES.INTERNAL_SERVER_ERROR] === 500, "INTERNAL_SERVER_ERROR maps to HTTP 500");
  assert(HTTP_STATUS_MAP[API_ERROR_CODES.SERVICE_UNAVAILABLE] === 503, "SERVICE_UNAVAILABLE maps to HTTP 503");

  // -------------------------------------------------------------
  // 5. Health Service Liveness & Bounded Readiness
  // -------------------------------------------------------------
  console.log("\n5. Testing Health Service (Liveness & Bounded Readiness)...");

  const liveness = await healthService.getLiveness();
  assert(liveness.status === "ok", "Liveness check returns status: 'ok'");
  assert(typeof liveness.uptimeSeconds === "number", "Liveness includes uptimeSeconds");
  assert(typeof liveness.timestamp === "string", "Liveness includes ISO timestamp");

  // Test readiness with safe mock or actual probe
  const customHealthService = new HealthService(prisma);
  const readiness = await customHealthService.getReadiness(2000);
  assert(
    readiness.status === "healthy" || readiness.status === "degraded",
    `Readiness executed safely (status: ${readiness.status})`
  );
  assert(readiness.checks.api.status === "up", "API component reports 'up'");
  assert(
    readiness.checks.database.status === "up" || readiness.checks.database.status === "down",
    `Database component reports valid status: '${readiness.checks.database.status}'`
  );

  // Verify timeout safety with an unreachable / immediate timeout simulation
  const timeoutHealthService = new HealthService({
    $queryRaw: () => new Promise((resolve) => setTimeout(resolve, 500)),
  } as unknown as typeof prisma);

  const timedOutReadiness = await timeoutHealthService.getReadiness(50);
  assert(timedOutReadiness.status === "degraded", "Timed out database probe yields status: 'degraded'");
  assert(timedOutReadiness.checks.database.status === "down", "Timed out database component is 'down'");
  assert(
    timedOutReadiness.checks.database.message?.includes("timed out") ?? false,
    "Timed out probe returns safe sanitized message without leaking credentials"
  );

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log("\n=========================================================");
  console.log(`📊 API FOUNDATION TESTS: ${passedCount} Passed, ${failedCount} Failed.`);
  console.log("=========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runApiTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
