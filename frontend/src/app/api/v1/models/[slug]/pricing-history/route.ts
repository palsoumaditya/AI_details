import { NextRequest } from "next/server";
import { modelDetailQueryService } from "@oneatlas/backend/services";
import {
  getRequestContext,
  handleApiError,
  paginatedResponse,
  validateQueryParams,
  logApiRequest,
  ApiError,
} from "@/lib/api";
import {
  ModelSlugParamSchema,
  PricingHistoryQuerySchema,
} from "@oneatlas/backend/shared";

/**
 * Model Pricing History Stream API (Phase 4C)
 *
 * GET /api/v1/models/:slug/pricing-history
 *
 * Exposes:
 *   - Chronological Pricing Observation Records
 *   - Provider Isolation (`provider` slug)
 *   - Source Isolation (`source` slug)
 *   - Endpoint Isolation (`endpoint` key)
 *   - Date Range Filtering (`from`, `to` ISO 8601 strings)
 *   - Exact Decimal-to-String Conversions
 *   - Database-Level Pagination (`page`, `limit` up to 100)
 *   - Deterministic Sorting (`newest`, `oldest`)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ctx = getRequestContext(request);
  let resolvedSlug = "";

  try {
    // 1. Await dynamic route parameters (Next.js 16 requirement)
    const resolvedParams = await params;
    resolvedSlug = resolvedParams.slug;

    // 2. Validate canonical slug path parameter
    const { slug } = ModelSlugParamSchema.parse(resolvedParams);

    // 3. Validate query string parameters against shared Zod schema
    const validatedQuery = validateQueryParams(
      PricingHistoryQuerySchema,
      request.nextUrl.searchParams
    );

    // 4. Delegate querying to Backend Application Service
    const result = await modelDetailQueryService.getModelPricingHistory(
      slug,
      validatedQuery
    );

    if (!result) {
      throw ApiError.notFound(`Model '${slug}' not found.`);
    }

    // 5. Structured observability logging
    logApiRequest({
      requestId: ctx.requestId,
      method: "GET",
      path: `/api/v1/models/${slug}/pricing-history`,
      statusCode: 200,
      durationMs: ctx.getDurationMs(),
    });

    // 6. Return standardized paginated envelope
    return paginatedResponse(
      result.records,
      result.pagination,
      ctx.requestId,
      200,
      {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      }
    );
  } catch (err: unknown) {
    return handleApiError(
      err,
      ctx.requestId,
      `GET /api/v1/models/${resolvedSlug}/pricing-history`
    );
  }
}
