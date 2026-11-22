import { NextRequest } from "next/server";
import { modelsQueryService } from "@oneatlas/backend/services";
import {
  getRequestContext,
  handleApiError,
  paginatedResponse,
  validateQueryParams,
  logApiRequest,
} from "@/lib/api";
import { ModelsCatalogQuerySchema } from "@oneatlas/backend/shared";

/**
 * Model Catalog Discovery API (Phase 4B)
 *
 * GET /api/v1/models
 *
 * Supports:
 *   - Search: `q` (case-insensitive on name, slug, family, description)
 *   - AI Lab: `lab` (slug)
 *   - Provider: `provider` (slug)
 *   - Modality: `modality`, `inputModality`, `outputModality`
 *   - Capabilities: `reasoning` (true|false), `openWeights` (true|false)
 *   - Context Window: `minimumContext`, `maximumContext`
 *   - Pricing: `minimumInputPrice`, `maximumInputPrice`, `minimumOutputPrice`, `maximumOutputPrice`
 *   - Sorting: `sort` (newest, oldest, name_asc, name_desc, context_desc, context_asc,
 *                      input_price_asc, input_price_desc, output_price_asc, output_price_desc)
 *   - Pagination: `page` (default 1), `limit` (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  const ctx = getRequestContext(request);

  try {
    // 1. Validate query parameters against shared Zod schema
    const validatedQuery = validateQueryParams(
      ModelsCatalogQuerySchema,
      request.nextUrl.searchParams
    );

    // 2. Delegate querying to Backend Application Service
    const result = await modelsQueryService.getModelsCatalog(validatedQuery);

    // 3. Structured observability logging
    logApiRequest({
      requestId: ctx.requestId,
      method: "GET",
      path: "/api/v1/models",
      statusCode: 200,
      durationMs: ctx.getDurationMs(),
    });

    // 4. Return standard paginated envelope with cache headers
    return paginatedResponse(
      result.models,
      result.pagination,
      ctx.requestId,
      200,
      {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      }
    );
  } catch (err: unknown) {
    return handleApiError(err, ctx.requestId, "GET /api/v1/models");
  }
}
