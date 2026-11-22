import { NextRequest } from "next/server";
import { rankingsQueryService } from "@oneatlas/backend/services";
import {
  getRequestContext,
  handleApiError,
  successResponse,
  validateQueryParams,
  logApiRequest,
  ApiError,
} from "@/lib/api";
import {
  BenchmarkSlugParamSchema,
  RankingsLeaderboardQuerySchema,
} from "@oneatlas/backend/shared";

/**
 * Benchmark Leaderboard API (Phase 4F / Task 6)
 *
 * GET /api/v1/rankings/:benchmarkSlug
 *
 * Supports:
 *   - Benchmark metadata & evaluation summary
 *   - Direction-aware ranked model list with standard competition ranking ("1224")
 *   - Search: `q` (matching model name, slug, or family)
 *   - Lab filter: `lab` (matching creator or associated AI lab)
 *   - Sorting: `sort` (rank_asc, rank_desc, score_desc, score_asc, name_asc, name_desc)
 *   - Pagination: `page` (default 1), `limit` (default 20, max 100)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ benchmarkSlug: string }> }
) {
  const ctx = getRequestContext(request);
  let resolvedSlug = "";

  try {
    // 1. Await dynamic route parameter (Next.js 16 App Router requirement)
    const resolvedParams = await params;
    resolvedSlug = resolvedParams.benchmarkSlug;

    // 2. Validate canonical benchmark slug
    const { slug } = BenchmarkSlugParamSchema.parse({ slug: resolvedSlug });

    // 3. Validate query parameters
    const validatedQuery = validateQueryParams(
      RankingsLeaderboardQuerySchema,
      request.nextUrl.searchParams
    );

    // 4. Delegate to Backend Application Service
    const result = await rankingsQueryService.getLeaderboard(
      slug,
      validatedQuery
    );

    if (!result) {
      throw ApiError.notFound(`Benchmark '${slug}' not found.`);
    }

    // 5. Structured observability logging
    logApiRequest({
      requestId: ctx.requestId,
      method: "GET",
      path: `/api/v1/rankings/${slug}`,
      statusCode: 200,
      durationMs: ctx.getDurationMs(),
    });

    // 6. Return standard response envelope with caching
    return successResponse(result, ctx.requestId, 200, {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    });
  } catch (err: unknown) {
    return handleApiError(
      err,
      ctx.requestId,
      `GET /api/v1/rankings/${resolvedSlug || "unknown"}`
    );
  }
}
