import { NextRequest } from "next/server";
import { healthService } from "@oneatlas/backend/services";
import {
  getRequestContext,
  handleApiError,
  successResponse,
  validateQueryParams,
  logApiRequest,
} from "@/lib/api";
import { HealthCheckQuerySchema } from "@oneatlas/backend/shared";

/**
 * Health & Observability Endpoint (Phase 4A)
 *
 * GET /api/v1/health
 *
 * Query params:
 *   - ?check=liveness   Fast process liveness check (memory/process only)
 *   - ?check=readiness  Full system readiness probe including bounded database ping (default)
 *
 * Security:
 *   - No-store caching to guarantee fresh observability metrics.
 *   - Completely masks connection strings, hostnames, and credentials.
 */
export async function GET(request: NextRequest) {
  const ctx = getRequestContext(request);

  try {
    const query = validateQueryParams(
      HealthCheckQuerySchema,
      request.nextUrl.searchParams
    );

    let data: unknown;
    let statusCode = 200;

    if (query.check === "liveness") {
      data = await healthService.getLiveness();
    } else {
      const readiness = await healthService.getReadiness(3000);
      data = readiness;
      // If database probe fails or is down, return HTTP 503 Service Unavailable
      if (readiness.checks.database.status === "down") {
        statusCode = 503;
      }
    }

    logApiRequest({
      requestId: ctx.requestId,
      method: "GET",
      path: "/api/v1/health",
      statusCode,
      durationMs: ctx.getDurationMs(),
    });

    return successResponse(data, ctx.requestId, statusCode, {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    });
  } catch (err: unknown) {
    return handleApiError(err, ctx.requestId, "GET /api/v1/health");
  }
}
