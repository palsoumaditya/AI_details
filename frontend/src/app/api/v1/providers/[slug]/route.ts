import { NextRequest } from "next/server";
import { providerDirectoryQueryService } from "@oneatlas/backend/services";
import {
  getRequestContext,
  handleApiError,
  successResponse,
  validateQueryParams,
  logApiRequest,
  ApiError,
} from "@/lib/api";
import {
  ProviderSlugParamSchema,
  ProviderEndpointsQuerySchema,
} from "@oneatlas/backend/shared";

/**
 * Provider Detail & Endpoint Matrix API (Phase 4D)
 *
 * GET /api/v1/providers/:slug
 *
 * Supports:
 *   - Provider metadata & distinct canonical counts
 *   - Paginated endpoint offerings (`page`, `limit` up to 100)
 *   - Status filter (`status`: ONLINE, OFFLINE, DEPRECATED, UNKNOWN)
 *   - Modality filters (`inputModality`, `outputModality`)
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
    const { slug } = ProviderSlugParamSchema.parse(resolvedParams);

    // 3. Validate endpoint query parameters
    const validatedQuery = validateQueryParams(
      ProviderEndpointsQuerySchema,
      request.nextUrl.searchParams
    );

    // 4. Delegate to Backend Query Service
    const result = await providerDirectoryQueryService.getProviderBySlug(
      slug,
      validatedQuery
    );

    if (!result) {
      throw ApiError.notFound(`Provider '${slug}' not found.`);
    }

    // 5. Structured observability logging
    logApiRequest({
      requestId: ctx.requestId,
      method: "GET",
      path: `/api/v1/providers/${slug}`,
      statusCode: 200,
      durationMs: ctx.getDurationMs(),
    });

    // 6. Return standard success envelope with cache headers
    return successResponse(result, ctx.requestId, 200, {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    });
  } catch (err: unknown) {
    return handleApiError(err, ctx.requestId, `GET /api/v1/providers/${resolvedSlug}`);
  }
}
