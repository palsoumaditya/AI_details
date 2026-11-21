import { NextRequest } from "next/server";
import { providerDirectoryQueryService } from "@oneatlas/backend/services";
import {
  getRequestContext,
  handleApiError,
  paginatedResponse,
  validateQueryParams,
  logApiRequest,
} from "@/lib/api";
import { ProvidersQuerySchema } from "@oneatlas/backend/shared";

/**
 * Provider Directory Discovery API (Phase 4D)
 *
 * GET /api/v1/providers
 *
 * Supports:
 *   - Search: `q` (case-insensitive on name and slug)
 *   - Provider Type: `providerType` (DIRECT, CLOUD, AGGREGATOR, HOSTING, UNKNOWN)
 *   - Endpoints filter: `hasEndpoints` (boolean)
 *   - Online filter: `hasOnlineEndpoints` (boolean)
 *   - Sorting: `sort` (name_asc, name_desc, endpoints_desc, models_desc)
 *   - Pagination: `page` (default 1), `limit` (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  const ctx = getRequestContext(request);

  try {
    // 1. Validate query parameters against shared Zod schema
    const validatedQuery = validateQueryParams(
      ProvidersQuerySchema,
      request.nextUrl.searchParams
    );

    // 2. Delegate querying to Backend Application Service
    const result = await providerDirectoryQueryService.listProviders(validatedQuery);

    // 3. Structured observability logging
    logApiRequest({
      requestId: ctx.requestId,
      method: "GET",
      path: "/api/v1/providers",
      statusCode: 200,
      durationMs: ctx.getDurationMs(),
    });

    // 4. Return standard paginated envelope with cache headers
    return paginatedResponse(
      result.providers,
      result.pagination,
      ctx.requestId,
      200,
      {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      }
    );
  } catch (err: unknown) {
    return handleApiError(err, ctx.requestId, "GET /api/v1/providers");
  }
}
