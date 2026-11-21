import { NextResponse } from "next/server";
import type {
  ApiSuccessResponse,
  ApiPaginatedResponse,
  ApiErrorResponse,
  ApiErrorPayload,
  PaginationMeta,
} from "@oneatlas/backend/shared";
import { sanitizeDto } from "./serialization";

const DEFAULT_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Type": "application/json",
};

/**
 * Standard Success Response Envelope (Single entity or custom payload)
 */
export function successResponse<T>(
  data: T,
  requestId: string,
  statusCode = 200,
  customHeaders: Record<string, string> = {}
): NextResponse<ApiSuccessResponse<T>> {
  const sanitized = sanitizeDto(data);

  const payload: ApiSuccessResponse<T> = {
    success: true,
    data: sanitized,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(payload, {
    status: statusCode,
    headers: {
      ...DEFAULT_SECURITY_HEADERS,
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      ...customHeaders,
    },
  });
}

/**
 * Standard Paginated Response Envelope (Collections)
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  requestId: string,
  statusCode = 200,
  customHeaders: Record<string, string> = {}
): NextResponse<ApiPaginatedResponse<T>> {
  const sanitized = sanitizeDto(data);

  const payload: ApiPaginatedResponse<T> = {
    success: true,
    data: sanitized,
    meta: {
      pagination,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(payload, {
    status: statusCode,
    headers: {
      ...DEFAULT_SECURITY_HEADERS,
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      ...customHeaders,
    },
  });
}

/**
 * Standard Error Response Envelope
 */
export function errorResponse(
  error: ApiErrorPayload,
  requestId: string,
  statusCode = 400,
  customHeaders: Record<string, string> = {}
): NextResponse<ApiErrorResponse> {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && error.details.length > 0 ? { details: error.details } : {}),
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(payload, {
    status: statusCode,
    headers: {
      ...DEFAULT_SECURITY_HEADERS,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      ...customHeaders,
    },
  });
}
