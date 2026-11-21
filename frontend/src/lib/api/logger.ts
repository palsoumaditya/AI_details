/**
 * Server-Side Structured Logger for API Observability (Phase 4A)
 *
 * Rules:
 * - Structured JSON output for easy log ingestion.
 * - Never logs authorization headers, tokens, passwords, or connection URLs.
 * - Correlates with requestId across requests.
 */

export interface ApiLogContext {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  errorCode?: string;
}

export function logApiRequest(ctx: ApiLogContext): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    level: ctx.statusCode >= 500 ? "error" : ctx.statusCode >= 400 ? "warn" : "info",
    timestamp,
    service: "oneatlas-api",
    requestId: ctx.requestId,
    http: {
      method: ctx.method,
      path: ctx.path,
      statusCode: ctx.statusCode,
      durationMs: ctx.durationMs,
    },
    ...(ctx.errorCode ? { errorCode: ctx.errorCode } : {}),
  };

  const output = JSON.stringify(logEntry);
  if (ctx.statusCode >= 500) {
    console.error(output);
  } else if (ctx.statusCode >= 400) {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export interface ApiErrorLogContext {
  requestId: string;
  route: string;
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  internalDetails?: unknown;
  stack?: string;
}

export function logApiError(ctx: ApiErrorLogContext): void {
  const timestamp = new Date().toISOString();
  const isProduction = process.env.NODE_ENV === "production";

  const logEntry = {
    level: ctx.statusCode >= 500 ? "error" : "warn",
    timestamp,
    service: "oneatlas-api",
    requestId: ctx.requestId,
    route: ctx.route,
    statusCode: ctx.statusCode,
    code: ctx.code,
    message: ctx.message,
    ...(ctx.details ? { details: ctx.details } : {}),
    ...(ctx.internalDetails ? { internalDetails: ctx.internalDetails } : {}),
    ...(!isProduction && ctx.stack ? { stack: ctx.stack } : {}),
  };

  console.error(JSON.stringify(logEntry));
}
