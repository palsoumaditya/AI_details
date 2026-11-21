import {
  modelsDevModelsResponseSchema,
  modelsDevProvidersResponseSchema,
  modelsDevCatalogResponseSchema,
} from "./schemas";
import type {
  ModelsDevRawModelsResponse,
  ModelsDevRawProvidersResponse,
  ModelsDevRawCatalogResponse,
} from "./types";

export type ModelsDevErrorKind =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "HTTP_ERROR"
  | "INVALID_JSON"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

export class ModelsDevApiError extends Error {
  constructor(
    public readonly kind: ModelsDevErrorKind,
    message: string,
    public readonly statusCode?: number,
    public readonly retryAfterSeconds?: number,
    public readonly cause?: unknown
  ) {
    super(`[ModelsDevApiError:${kind}] ${message}${statusCode ? ` (HTTP ${statusCode})` : ""}`);
    this.name = "ModelsDevApiError";
  }
}

export interface ModelsDevClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class ModelsDevClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: ModelsDevClientConfig = {}) {
    this.baseUrl = (config.baseUrl || "https://models.dev").replace(/\/+$/, "");
    this.timeoutMs = config.timeoutMs ?? 15000;
    this.maxRetries = config.maxRetries ?? 3;
  }

  /**
   * Fetches the provider-independent canonical model catalog.
   * GET /models.json?type=all
   */
  async getCanonicalModels(): Promise<ModelsDevRawModelsResponse> {
    const json = await this.request<unknown>("/models.json?type=all");
    const parsed = modelsDevModelsResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new ModelsDevApiError(
        "VALIDATION_ERROR",
        `Failed to parse models.json: ${parsed.error.message}`,
        undefined,
        undefined,
        parsed.error
      );
    }
    return parsed.data;
  }

  /**
   * Fetches the provider catalog and provider-specific model offerings.
   * GET /api.json?type=all
   */
  async getProviders(): Promise<ModelsDevRawProvidersResponse> {
    const json = await this.request<unknown>("/api.json?type=all");
    const parsed = modelsDevProvidersResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new ModelsDevApiError(
        "VALIDATION_ERROR",
        `Failed to parse api.json: ${parsed.error.message}`,
        undefined,
        undefined,
        parsed.error
      );
    }
    return parsed.data;
  }

  /**
   * Fetches the combined catalog uniting models and providers.
   * GET /catalog.json?type=all
   */
  async getCatalog(): Promise<ModelsDevRawCatalogResponse> {
    const json = await this.request<unknown>("/catalog.json?type=all");
    const parsed = modelsDevCatalogResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new ModelsDevApiError(
        "VALIDATION_ERROR",
        `Failed to parse catalog.json: ${parsed.error.message}`,
        undefined,
        undefined,
        parsed.error
      );
    }
    return parsed.data;
  }

  /**
   * Core request method with timeout, backoff, jitter, and status error classification.
   */
  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "OneAtlas-Ingestion-Engine/1.0 (+https://oneatlas.dev)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (response.ok) {
          try {
            return (await response.json()) as T;
          } catch (jsonErr) {
            throw new ModelsDevApiError(
              "INVALID_JSON",
              `Received unparseable JSON from ${endpoint}`,
              response.status,
              undefined,
              jsonErr
            );
          }
        }

        // Handle HTTP Errors
        if (response.status === 429) {
          const retryHeader = response.headers.get("retry-after");
          const retryAfterSeconds = retryHeader ? parseInt(retryHeader, 10) : undefined;

          if (attempt < this.maxRetries) {
            const waitTime = retryAfterSeconds
              ? retryAfterSeconds * 1000
              : this.computeBackoff(attempt);
            await this.sleep(waitTime);
            attempt++;
            continue;
          }

          throw new ModelsDevApiError(
            "RATE_LIMITED",
            `Rate limit exceeded for ${endpoint}`,
            429,
            retryAfterSeconds
          );
        }

        // Server errors: 500, 502, 503, 504 -> retryable
        if (response.status >= 500 && response.status <= 504) {
          if (attempt < this.maxRetries) {
            await this.sleep(this.computeBackoff(attempt));
            attempt++;
            continue;
          }
          throw new ModelsDevApiError(
            "HTTP_ERROR",
            `Server error ${response.status} fetching ${endpoint}`,
            response.status
          );
        }

        // Non-retryable client errors (400, 401, 403, 404, etc.)
        throw new ModelsDevApiError(
          "HTTP_ERROR",
          `Client error ${response.status} fetching ${endpoint}`,
          response.status
        );
      } catch (err) {
        if (err instanceof ModelsDevApiError) {
          throw err;
        }

        // Timeout checking
        if (err instanceof DOMException && err.name === "TimeoutError") {
          if (attempt < this.maxRetries) {
            await this.sleep(this.computeBackoff(attempt));
            attempt++;
            continue;
          }
          throw new ModelsDevApiError("TIMEOUT", `Request timed out after ${this.timeoutMs}ms for ${endpoint}`);
        }

        // Network connection error
        if (attempt < this.maxRetries) {
          await this.sleep(this.computeBackoff(attempt));
          attempt++;
          continue;
        }

        throw new ModelsDevApiError(
          "NETWORK_ERROR",
          `Network connection failed for ${endpoint}: ${err instanceof Error ? err.message : String(err)}`,
          undefined,
          undefined,
          err
        );
      }
    }

    throw new ModelsDevApiError("UNKNOWN_ERROR", `Failed request to ${endpoint} after ${this.maxRetries} retries`);
  }

  private computeBackoff(attempt: number): number {
    const base = 500 * Math.pow(2, attempt);
    const jitter = Math.random() * 250;
    return Math.min(base + jitter, 10000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
