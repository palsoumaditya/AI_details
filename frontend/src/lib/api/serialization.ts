/**
 * Serialization & DTO Sanitization Utilities (Phase 4A)
 *
 * Rules:
 * 1. Decimal preservation: Converts Prisma Decimals or floating values into exact string representations.
 * 2. Date preservation: Converts Date objects to standard ISO 8601 strings.
 * 3. Null preservation: Preserves null when values are unknown (never fabricates false, zero, or empty string).
 * 4. Internal entity protection: Prevents leaking raw internal database properties.
 */

interface DecimalLike {
  toFixed: (digits?: number) => string;
  toString: () => string;
}

function isDecimal(value: unknown): value is DecimalLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "toFixed" in value &&
    typeof (value as DecimalLike).toFixed === "function" &&
    "toString" in value &&
    typeof (value as DecimalLike).toString === "function"
  );
}

/**
 * Converts a Decimal, number, or string value into an exact decimal string representation.
 */
export function serializeDecimal(value: unknown, fractionDigits = 4): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (isDecimal(value)) {
    return value.toString();
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value.toFixed(fractionDigits);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

/**
 * Converts a Date object or timestamp string into an ISO 8601 formatted string.
 */
export function serializeDate(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return null;
}

/**
 * Recursively cleanses an object/array, serializing Decimals to strings, Dates to ISO strings,
 * and preserving explicit nulls.
 */
export function sanitizeDto<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (isDecimal(input)) {
    return input.toString() as unknown as T;
  }

  if (input instanceof Date) {
    return serializeDate(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeDto(item)) as unknown as T;
  }

  if (typeof input === "object" && input !== null) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      cleaned[key] = sanitizeDto(value);
    }
    return cleaned as T;
  }

  return input;
}
