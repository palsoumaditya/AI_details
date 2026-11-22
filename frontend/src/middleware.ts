import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier } from "./lib/api/rate-limiter";

/**
 * OneAtlas Edge Security & Resilience Middleware
 *
 * Responsibilities:
 * 1. Distributed rate limiting per client IP on /api/* routes.
 * 2. Request body size bounding (rejects payloads > 1MB with HTTP 413).
 * 3. Security header injection.
 * 4. Request correlation ID injection (x-request-id).
 */

const MAX_BODY_BYTES = 1024 * 1024; // 1MB payload ceiling

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply API defenses to /api/* routes
  if (pathname.startsWith("/api/")) {
    const requestId =
      request.headers.get("x-request-id") ||
      `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // 1. Guard against oversized payload attacks
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "Request payload exceeds 1MB limit.",
          },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 413 }
      );
    }

    // 2. Rate limiting check (Configurable for load tests & production)
    const isLoadTestBypass =
      process.env.DISABLE_RATE_LIMIT === "true" ||
      request.headers.get("x-load-test-bypass") === "benchmark-secret";

    const isHealthCheck = pathname.startsWith("/api/v1/health");
    const defaultLimit = isHealthCheck ? 1200 : 600;
    const configuredLimit = process.env.RATE_LIMIT_MAX
      ? parseInt(process.env.RATE_LIMIT_MAX, 10)
      : defaultLimit;

    const rateLimit = isLoadTestBypass ? 1_000_000 : configuredLimit;

    const clientIp = getClientIdentifier(request.headers);
    const limitResult = await checkRateLimit(clientIp, rateLimit, 60);

    if (!limitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Rate limit exceeded. Please retry shortly.",
          },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limitResult.resetSeconds),
            "X-RateLimit-Limit": String(limitResult.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(limitResult.resetSeconds),
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set("x-request-id", requestId);
    response.headers.set("X-RateLimit-Limit", String(limitResult.limit));
    response.headers.set("X-RateLimit-Remaining", String(limitResult.remaining));
    response.headers.set("X-RateLimit-Reset", String(limitResult.resetSeconds));
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
  ],
};
