/**
 * Request Context Utilities (Phase 4A)
 *
 * Extracts or generates correlation IDs and measures request latency.
 */

export interface RequestContext {
  requestId: string;
  startTime: number;
  getDurationMs: () => number;
}

/**
 * Creates or extracts request context from standard Request headers.
 */
export function getRequestContext(request?: Request): RequestContext {
  const incomingId = request?.headers.get("x-request-id") || request?.headers.get("x-correlation-id");
  const requestId =
    incomingId && incomingId.trim().length > 0 && incomingId.length <= 64
      ? incomingId.trim()
      : `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

  const startTime = performance.now();

  return {
    requestId,
    startTime,
    getDurationMs: () => Math.round(performance.now() - startTime),
  };
}
