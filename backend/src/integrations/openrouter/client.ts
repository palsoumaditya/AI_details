import {
  openRouterModelsResponseSchema,
  openRouterProvidersResponseSchema,
  openRouterModelEndpointsResponseSchema,
} from "./schemas";
import type {
  OpenRouterRawModelItem,
  OpenRouterRawProviderItem,
  OpenRouterRawEndpointItem,
} from "./types";

export interface OpenRouterClientConfig {
  baseUrl?: string;
  apiKey?: string;
  managementKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class OpenRouterClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly managementKey?: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: OpenRouterClientConfig = {}) {
    this.baseUrl = (config.baseUrl || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
    this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY;
    this.managementKey = config.managementKey || process.env.OPENROUTER_MANAGEMENT_KEY;
    this.timeoutMs = config.timeoutMs ?? 15_000;
    this.maxRetries = config.maxRetries ?? 3;
  }

  /**
   * Safe fetch with timeout, bounded retries, and rate limit backoff.
   */
  private async fetchWithRetry(
    endpoint: string,
    options: {
      useManagementKey?: boolean;
      params?: Record<string, string | number | undefined>;
    } = {}
  ): Promise<Response> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (options.params) {
      for (const [key, val] of Object.entries(options.params)) {
        if (val !== undefined && val !== null) {
          url.searchParams.set(key, String(val));
        }
      }
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "AIDetails/1.0 (+https://aidetails.dev)",
    };

    const token = options.useManagementKey
      ? this.managementKey || this.apiKey
      : this.apiKey;

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Success or non-retryable client errors (400, 401, 403, 404)
        if (
          response.ok ||
          (response.status >= 400 && response.status < 500 && response.status !== 429)
        ) {
          return response;
        }

        // Retryable: 429 Too Many Requests or 5xx Server Errors
        if (attempt < this.maxRetries) {
          let delayMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 10_000);
          const retryAfter = response.headers.get("retry-after");
          if (retryAfter) {
            const parsedSeconds = parseInt(retryAfter, 10);
            if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
              delayMs = Math.min(parsedSeconds * 1000, 30_000);
            }
          }
          console.warn(
            `[OpenRouterClient] HTTP ${response.status} on ${endpoint}. Retrying in ${Math.round(delayMs)}ms (attempt ${attempt + 1}/${this.maxRetries})...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        return response;
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries) {
          const delayMs = 1000 * Math.pow(2, attempt) + Math.random() * 500;
          console.warn(
            `[OpenRouterClient] Network failure on ${endpoint}: ${lastError.message}. Retrying in ${Math.round(delayMs)}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
      }
    }

    throw lastError || new Error(`Failed to fetch ${endpoint} after ${this.maxRetries} retries`);
  }

  /**
   * Fetch a single page of models from the catalog with output_modalities=all.
   */
  async fetchModelsPage(offset = 0, limit = 1000): Promise<{
    models: OpenRouterRawModelItem[];
    totalCount?: number;
  }> {
    const response = await this.fetchWithRetry("/models", {
      params: { offset, limit, output_modalities: "all" },
    });

    if (!response.ok) {
      throw new Error(
        `OpenRouter models catalog request failed with status ${response.status}: ${response.statusText}`
      );
    }

    const json: unknown = await response.json();
    const parsed = openRouterModelsResponseSchema.safeParse(json);

    if (!parsed.success) {
      console.error(
        "[OpenRouterClient] Schema validation failed for /models payload:",
        JSON.stringify(parsed.error.format(), null, 2)
      );
      throw new Error(`OpenRouter models payload failed schema validation: ${parsed.error.message}`);
    }

    return {
      models: parsed.data.data,
      totalCount: parsed.data.total_count,
    };
  }

  /**
   * Fetch all models using documented offset/limit pagination and output_modalities=all.
   * Includes loop detection and duplicate model ID deduplication across pages.
   */
  async fetchAllModels(options: { maxPages?: number; limit?: number } = {}): Promise<OpenRouterRawModelItem[]> {
    const limit = options.limit ?? 1000;
    const maxPages = options.maxPages ?? 50;
    const allModels: OpenRouterRawModelItem[] = [];
    const seenIds = new Set<string>();

    let offset = 0;
    for (let page = 0; page < maxPages; page++) {
      const pageResult = await this.fetchModelsPage(offset, limit);

      let newInPage = 0;
      for (const model of pageResult.models) {
        if (!seenIds.has(model.id)) {
          seenIds.add(model.id);
          allModels.push(model);
          newInPage++;
        }
      }

      // If page returned fewer items than limit or no new models, termination reached
      if (pageResult.models.length < limit || newInPage === 0) {
        break;
      }

      if (pageResult.totalCount !== undefined && allModels.length >= pageResult.totalCount) {
        break;
      }

      offset += limit;
    }

    return allModels;
  }

  /**
   * Fetch provider directory from OpenRouter.
   */
  async fetchProviders(): Promise<OpenRouterRawProviderItem[]> {
    const response = await this.fetchWithRetry("/providers");

    if (!response.ok) {
      throw new Error(
        `OpenRouter providers request failed with status ${response.status}: ${response.statusText}`
      );
    }

    const json: unknown = await response.json();
    const parsed = openRouterProvidersResponseSchema.safeParse(json);

    if (!parsed.success) {
      console.error(
        "[OpenRouterClient] Schema validation failed for /providers payload:",
        JSON.stringify(parsed.error.format(), null, 2)
      );
      throw new Error(`OpenRouter providers payload failed schema validation: ${parsed.error.message}`);
    }

    return parsed.data.data;
  }

  /**
   * Fetch provider endpoints for a specific model (e.g. "openai/gpt-4o").
   * Requires management key permissions or public tier. Returns null if forbidden (403).
   */
  async fetchModelEndpoints(
    modelId: string
  ): Promise<{
    endpoints: OpenRouterRawEndpointItem[];
    status: "AUTHORIZED" | "FORBIDDEN" | "NOT_FOUND";
  }> {
    const [author, ...slugParts] = modelId.split("/");
    const slug = slugParts.join("/");

    if (!author || !slug) {
      return { endpoints: [], status: "NOT_FOUND" };
    }

    const response = await this.fetchWithRetry(
      `/models/${encodeURIComponent(author)}/${encodeURIComponent(slug)}/endpoints`,
      { useManagementKey: true }
    );

    if (response.status === 403) {
      return { endpoints: [], status: "FORBIDDEN" };
    }

    if (response.status === 404) {
      return { endpoints: [], status: "NOT_FOUND" };
    }

    if (!response.ok) {
      throw new Error(
        `OpenRouter endpoints query for ${modelId} failed with HTTP ${response.status}: ${response.statusText}`
      );
    }

    const json: unknown = await response.json();
    const parsed = openRouterModelEndpointsResponseSchema.safeParse(json);

    if (!parsed.success) {
      console.warn(
        `[OpenRouterClient] Endpoint validation warning for ${modelId}:`,
        parsed.error.message
      );
      return { endpoints: [], status: "AUTHORIZED" };
    }

    return {
      endpoints: parsed.data.data.endpoints || [],
      status: "AUTHORIZED",
    };
  }
}
