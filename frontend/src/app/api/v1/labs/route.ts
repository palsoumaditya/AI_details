import { NextRequest } from "next/server";
import { labDirectoryQueryService } from "@oneatlas/backend/services";
import {
  getRequestContext,
  handleApiError,
  paginatedResponse,
  validateQueryParams,
  logApiRequest,
} from "@/lib/api";
import { LabsQuerySchema } from "@oneatlas/backend/shared";

/**
 * AI Lab Directory Discovery API (Phase 4D)
 *
 * GET /api/v1/labs
 *
 * Supports:
 *   - Search: `q` (case-insensitive on name and slug)
 *   - Country filter: `country` (case-insensitive country code)
 *   - Sorting: `sort` (name_asc, name_desc, models_desc)
 *   - Pagination: `page` (default 1), `limit` (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  const ctx = getRequestContext(request);

  try {
    // 1. Validate query parameters against shared Zod schema
    const validatedQuery = validateQueryParams(
      LabsQuerySchema,
      request.nextUrl.searchParams
    );

    // 2. Delegate querying to Backend Application Service
    const result = await labDirectoryQueryService.listLabs(validatedQuery);

    // 3. Structured observability logging
    logApiRequest({
      requestId: ctx.requestId,
      method: "GET",
      path: "/api/v1/labs",
      statusCode: 200,
      durationMs: ctx.getDurationMs(),
    });

    // 4. Return standard paginated envelope with cache headers
    return paginatedResponse(
      result.labs,
      result.pagination,
      ctx.requestId,
      200,
      {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      }
    );
  } catch (err: unknown) {
    return handleApiError(err, ctx.requestId, "GET /api/v1/labs");
  }
}
