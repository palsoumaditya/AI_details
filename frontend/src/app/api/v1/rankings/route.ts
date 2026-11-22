import { NextRequest } from "next/server";
import { rankingsQueryService } from "@oneatlas/backend/services";
import {
  getRequestContext,
  handleApiError,
  successResponse,
  validateQueryParams,
  logApiRequest,
} from "@/lib/api";
import { RankingsDirectoryQuerySchema } from "@oneatlas/backend/shared";

/**
 * Rankings & Benchmarks Directory Discovery API (Phase 4F / Task 6)
 *
 * GET /api/v1/rankings
 *
 * Supports:
 *   - Category filtering: `category` (REASONING, CODING, MATH, KNOWLEDGE, MULTIMODAL, SPEED, COMPOSITE, ALL)
 *   - Search: `q` (matching benchmark title, slug, or description)
 *   - Returns benchmark metadata, evaluated model counts, latest eval dates, and category distributions
 */
export async function GET(request: NextRequest) {
  const ctx = getRequestContext(request);

  try {
    // 1. Validate query parameters
    const validatedQuery = validateQueryParams(
      RankingsDirectoryQuerySchema,
      request.nextUrl.searchParams
    );

    // 2. Delegate to Backend Application Service
    const result = await rankingsQueryService.getBenchmarkDirectory(validatedQuery);

    // 3. Structured observability logging
    logApiRequest({
      requestId: ctx.requestId,
      method: "GET",
      path: "/api/v1/rankings",
      statusCode: 200,
      durationMs: ctx.getDurationMs(),
    });

    // 4. Return standard response envelope with caching
    return successResponse(result, ctx.requestId, 200, {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    });
  } catch (err: unknown) {
    return handleApiError(err, ctx.requestId, "GET /api/v1/rankings");
  }
}
