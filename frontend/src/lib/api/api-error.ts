import {
  API_ERROR_CODES,
  HTTP_STATUS_MAP,
  type ApiErrorCode,
} from "@oneatlas/backend/shared";
import type { ApiErrorDetail } from "@oneatlas/backend/shared";

/**
 * Standardized Application API Error (Phase 4A)
 *
 * Encapsulates safe HTTP status codes, machine-readable error codes, and details.
 */
export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode: number;
  public readonly details?: ApiErrorDetail[];

  constructor(
    code: ApiErrorCode,
    message: string,
    statusCode?: number,
    details?: ApiErrorDetail[]
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode ?? HTTP_STATUS_MAP[code] ?? 500;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static validation(message = "Invalid request parameters.", details?: ApiErrorDetail[]): ApiError {
    return new ApiError(API_ERROR_CODES.VALIDATION_ERROR, message, 400, details);
  }

  static notFound(message = "Requested resource not found."): ApiError {
    return new ApiError(API_ERROR_CODES.NOT_FOUND, message, 404);
  }

  static unauthorized(message = "Authentication required."): ApiError {
    return new ApiError(API_ERROR_CODES.UNAUTHORIZED, message, 401);
  }

  static forbidden(message = "Access denied."): ApiError {
    return new ApiError(API_ERROR_CODES.FORBIDDEN, message, 403);
  }

  static conflict(message = "Resource conflict detected."): ApiError {
    return new ApiError(API_ERROR_CODES.CONFLICT, message, 409);
  }

  static rateLimited(message = "Rate limit exceeded. Please try again later."): ApiError {
    return new ApiError(API_ERROR_CODES.RATE_LIMITED, message, 429);
  }

  static internal(message = "An unexpected server error occurred."): ApiError {
    return new ApiError(API_ERROR_CODES.INTERNAL_SERVER_ERROR, message, 500);
  }

  static database(message = "Database operation failed."): ApiError {
    return new ApiError(API_ERROR_CODES.DATABASE_ERROR, message, 500);
  }

  static serviceUnavailable(message = "Service is temporarily unavailable."): ApiError {
    return new ApiError(API_ERROR_CODES.SERVICE_UNAVAILABLE, message, 503);
  }
}
