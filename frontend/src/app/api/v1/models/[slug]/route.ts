import { NextRequest } from "next/server";
import { modelDetailQueryService } from "@oneatlas/backend/services";
import {
  getRequestContext,
  handleApiError,
  successResponse,
  logApiRequest,
  ApiError,
} from "@/lib/api";
import { ModelSlugParamSchema } from "@oneatlas/backend/shared";

/**
 * Primary Model Detail API (Phase 4C)
 *
 * GET /api/v1/models/:slug
 *
 * Exposes:
 *   - Canonical Model Specifications (exact decimals, null preservation)
 *   - Verified AI Lab Associations (CREATOR, PUBLISHER, COLLABORATOR)
 *   - Provider Endpoint Matrix (status, contextWindow, modalities, capabilities)
 *   - Active Provider-Specific Pricing Offers (OpenRouter, Models.dev)
 *   - Aggregated Catalog Pricing Summary
 *   - Real Benchmark Scorecards (empty if uningested)
 *   - Field-Level Provenance & Data Quality Assessment
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

    // 3. Delegate to Backend Model Detail Query Service
    const model = await modelDetailQueryService.getModelDetails(slug);
    if (!model) {
      throw ApiError.notFound(`Model '${slug}' not found.`);
    }

    // 4. Structured observability logging
    logApiRequest({
      requestId: ctx.requestId,
      method: "GET",
      path: `/api/v1/models/${slug}`,
      statusCode: 200,
      durationMs: ctx.getDurationMs(),
    });

    // 5. Return standardized success response with public cache headers
    return successResponse(model, ctx.requestId, 200, {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    });
  } catch (err: unknown) {
    return handleApiError(err, ctx.requestId, `GET /api/v1/models/${resolvedSlug}`);
  }
}
