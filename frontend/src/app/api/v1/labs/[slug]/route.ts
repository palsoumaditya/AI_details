import { NextRequest } from "next/server";
import { labDirectoryQueryService } from "@oneatlas/backend/services";
import {
  getRequestContext,
  handleApiError,
  successResponse,
  validateQueryParams,
  logApiRequest,
  ApiError,
} from "@/lib/api";
import {
  LabSlugParamSchema,
  LabModelsQuerySchema,
} from "@oneatlas/backend/shared";

/**
 * AI Lab Detail & Foundation Model Lineage API (Phase 4D)
 *
 * GET /api/v1/labs/:slug
 *
 * Supports:
 *   - AI Lab metadata & role-specific distinct model counts
 *   - Global family distribution across all associated models
 *   - Paginated distinct model collection (`page`, `limit` up to 100)
 *   - Role filter (`relationshipType`: CREATOR, PUBLISHER, COLLABORATOR)
 *   - Family filter (`family`)
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
    const { slug } = LabSlugParamSchema.parse(resolvedParams);

    // 3. Validate model query parameters
    const validatedQuery = validateQueryParams(
      LabModelsQuerySchema,
      request.nextUrl.searchParams
    );

    // 4. Delegate to Backend Query Service
    const result = await labDirectoryQueryService.getLabBySlug(
      slug,
      validatedQuery
    );

    if (!result) {
      throw ApiError.notFound(`AI Lab '${slug}' not found.`);
    }

    // 5. Structured observability logging
    logApiRequest({
      requestId: ctx.requestId,
      method: "GET",
      path: `/api/v1/labs/${slug}`,
      statusCode: 200,
      durationMs: ctx.getDurationMs(),
    });

    // 6. Return standard success envelope with cache headers
    return successResponse(result, ctx.requestId, 200, {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    });
  } catch (err: unknown) {
    return handleApiError(err, ctx.requestId, `GET /api/v1/labs/${resolvedSlug}`);
  }
}
