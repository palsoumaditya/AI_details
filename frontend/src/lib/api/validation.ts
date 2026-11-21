import { type ZodType } from "zod";
import { ApiError } from "./api-error";

/**
 * Request Validation Helpers (Phase 4A)
 */

/**
 * Validates URLSearchParams against a Zod schema.
 * Throws ApiError.validation on failure with formatted details.
 */
export function validateQueryParams<T>(
  schema: ZodType<T>,
  searchParams: URLSearchParams
): T {
  const rawParams: Record<string, unknown> = {};
  searchParams.forEach((value, key) => {
    // If param appears multiple times, handle as array, else scalar
    const all = searchParams.getAll(key);
    rawParams[key] = all.length > 1 ? all : value;
  });

  const result = schema.safeParse(rawParams);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));
    throw ApiError.validation("Invalid query parameters.", details);
  }

  return result.data;
}

/**
 * Validates request JSON body against a Zod schema.
 */
export async function validateJsonBody<T>(
  schema: ZodType<T>,
  request: Request
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw ApiError.validation("Invalid JSON body in request.");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));
    throw ApiError.validation("Invalid request body.", details);
  }

  return result.data;
}
