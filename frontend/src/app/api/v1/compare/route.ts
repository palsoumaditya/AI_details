import { NextRequest } from "next/server";
import { compareQueryService } from "@oneatlas/backend/services";
import { CompareRequestSchema } from "@oneatlas/backend/shared";
import {
  getRequestContext,
  handleApiError,
  successResponse,
  validateJsonBody,
  logApiRequest,
  ApiError,
} from "@/lib/api";

/**
 * Model Comparison API (Phase 4E / Task 5)
 *
 * Supports side-by-side comparison of 2 to 4 canonical AI models:
 *   - Specs matrix (context, tokens, modalities, licensing, architecture)
 *   - Provider endpoint offerings and pricing comparisons
 *   - Direction-aware benchmark scorecards with leader calculation
 *
 * Handlers:
 *   - POST /api/v1/compare  { modelSlugs: string[] }
 *   - GET  /api/v1/compare?models=slug1,slug2
 */

export async function POST(request: NextRequest) {
  const ctx = getRequestContext(request);

  try {
    // 1. Validate request body against CompareRequestSchema (2-4 unique slugs)
    const body = await validateJsonBody(CompareRequestSchema, request);

    // 2. Delegate to CompareQueryService
    let result;
    try {
      result = await compareQueryService.compareModels(body);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("requested models were not found")) {
        throw ApiError.notFound(err.message);
      }
      throw err;
    }

    // 3. Observability logging
    logApiRequest({
      requestId: ctx.requestId,
      method: "POST",
      path: "/api/v1/compare",
      statusCode: 200,
      durationMs: ctx.getDurationMs(),
    });

    // 4. Return standardized success response
    return successResponse(result, ctx.requestId);
  } catch (err: unknown) {
    return handleApiError(err, ctx.requestId, "POST /api/v1/compare");
  }
}

export async function GET(request: NextRequest) {
  const ctx = getRequestContext(request);

  try {
    const { searchParams } = new URL(request.url);

    // Support comma-delimited ?models=slug1,slug2 or repeated ?modelSlugs=slug1&modelSlugs=slug2
    const modelsParam = searchParams.get("models");
    let slugs: string[] = [];

    if (modelsParam) {
      slugs = modelsParam.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      slugs = searchParams.getAll("modelSlugs");
    }

    if (slugs.length === 0) {
      throw ApiError.validation("Comparison requires model slugs.", [
        {
          field: "models",
          message: "Provide between 2 and 4 model slugs via ?models=slug1,slug2",
        },
      ]);
    }

    // Validate using CompareRequestSchema
    const validated = CompareRequestSchema.parse({ modelSlugs: slugs });

    // Delegate to CompareQueryService
    let result;
    try {
      result = await compareQueryService.compareModels(validated);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("requested models were not found")) {
        throw ApiError.notFound(err.message);
      }
      throw err;
    }

    // Observability logging
    logApiRequest({
      requestId: ctx.requestId,
      method: "GET",
      path: "/api/v1/compare",
      statusCode: 200,
      durationMs: ctx.getDurationMs(),
    });

    return successResponse(result, ctx.requestId, 200, {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    });
  } catch (err: unknown) {
    return handleApiError(err, ctx.requestId, "GET /api/v1/compare");
  }
}
