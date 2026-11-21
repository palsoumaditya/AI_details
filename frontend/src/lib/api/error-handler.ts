import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { ApiError } from "./api-error";
import { errorResponse } from "./api-response";
import { logApiError } from "./logger";
import { API_ERROR_CODES } from "@oneatlas/backend/shared";

interface PrismaErrorLike {
  code?: string;
  message?: string;
}

function isPrismaError(error: unknown): error is PrismaErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as PrismaErrorLike).code === "string" &&
    (error as PrismaErrorLike).code!.startsWith("P")
  );
}

/**
 * Centralized API Error Handler (Phase 4A)
 *
 * Guarantees:
 * 1. Safe error messages returned to clients.
 * 2. Zod validation issues mapped to structured details.
 * 3. Database connection errors masked (no SQL/host/secret leaks).
 * 4. Internal stack traces logged server-side only.
 * 5. Correlation requestId preserved in error response meta.
 */
export function handleApiError(
  error: unknown,
  requestId: string,
  route = "API_ROUTE"
): NextResponse {
  // 1. Known ApiError instances
  if (error instanceof ApiError) {
    logApiError({
      requestId,
      route,
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    });

    return errorResponse(
      {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      requestId,
      error.statusCode
    );
  }

  // 2. Zod schema validation errors
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    logApiError({
      requestId,
      route,
      statusCode: 400,
      code: API_ERROR_CODES.VALIDATION_ERROR,
      message: "Request validation failed",
      details,
    });

    return errorResponse(
      {
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: "Invalid request parameters.",
        details,
      },
      requestId,
      400
    );
  }

  // 3. Known Prisma database errors
  if (isPrismaError(error)) {
    // Log detailed database diagnostics server-side only
    logApiError({
      requestId,
      route,
      statusCode: 500,
      code: API_ERROR_CODES.DATABASE_ERROR,
      message: `Database error code: ${error.code}`,
      internalDetails: error.message,
    });

    // P1001: Can't reach database server
    if (error.code === "P1001") {
      return errorResponse(
        {
          code: API_ERROR_CODES.SERVICE_UNAVAILABLE,
          message: "Database service is temporarily unavailable. Please try again later.",
        },
        requestId,
        503
      );
    }

    // P2002: Unique constraint failed
    if (error.code === "P2002") {
      return errorResponse(
        {
          code: API_ERROR_CODES.CONFLICT,
          message: "A resource with these attributes already exists.",
        },
        requestId,
        409
      );
    }

    // Generic safe database fallback
    return errorResponse(
      {
        code: API_ERROR_CODES.DATABASE_ERROR,
        message: "A database error occurred while processing the request.",
      },
      requestId,
      500
    );
  }

  // 4. Unexpected generic exceptions
  const unexpected = error instanceof Error ? error : new Error(String(error));
  logApiError({
    requestId,
    route,
    statusCode: 500,
    code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: unexpected.message,
    stack: unexpected.stack,
  });

  return errorResponse(
    {
      code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: "An internal server error occurred.",
    },
    requestId,
    500
  );
}
