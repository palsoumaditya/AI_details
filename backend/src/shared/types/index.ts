/**
 * Shared public types for the AI Details platform.
 * These types are safe for use in both frontend and backend.
 */

export * from "./api";

/** Minimal model summary safe for frontend display */
export interface ModelSummary {
  id: string;
  slug: string;
  name: string;
  family: string | null;
  description: string | null;
  status: "ACTIVE" | "DEPRECATED" | "EXPERIMENTAL";
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputModalities: string[];
  outputModalities: string[];
  isReasoning: boolean | null;
  isOpenWeight: boolean | null;
  releaseDate: string | null;
}

/** Minimal provider summary safe for frontend display */
export interface ProviderSummary {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  providerType: "DIRECT" | "CLOUD" | "AGGREGATOR" | "HOSTING" | "UNKNOWN";
  isActive: boolean;
}

/** Minimal AI lab summary safe for frontend display */
export interface AiLabSummary {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  country: string | null;
}

/** Standard paginated response envelope */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
