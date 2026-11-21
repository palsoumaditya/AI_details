import { z } from "zod";
import {
  PAGINATION_CONSTRAINTS,
  SORT_ALLOWLISTS,
  SORT_ORDERS,
} from "../constants/api";

/**
 * Reusable Zod Validation Schemas for Incoming Request Parameters (Phase 4A)
 */

/** Pagination Query Parameters */
export const PaginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer")
    .min(1, "Page must be greater than or equal to 1")
    .default(PAGINATION_CONSTRAINTS.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(PAGINATION_CONSTRAINTS.MIN_LIMIT, "Limit must be at least 1")
    .max(PAGINATION_CONSTRAINTS.MAX_LIMIT, `Limit cannot exceed ${PAGINATION_CONSTRAINTS.MAX_LIMIT}`)
    .default(PAGINATION_CONSTRAINTS.DEFAULT_LIMIT),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/** Common Search Query Filter */
export const SearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100, "Search query cannot exceed 100 characters")
    .optional(),
});

/** Canonical Slug Path Parameter */
export const SlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(128, "Slug cannot exceed 128 characters")
    .regex(/^[a-z0-9-_.]+$/i, "Slug may only contain letters, numbers, hyphens, underscores, and dots"),
});

export type SlugParam = z.infer<typeof SlugParamSchema>;

/** Model Comparison Request Body */
export const CompareRequestSchema = z.object({
  modelSlugs: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Model slug cannot be empty")
        .max(128, "Model slug too long")
    )
    .min(2, "At least 2 models are required for comparison")
    .max(4, "At most 4 models can be compared concurrently")
    .refine((slugs) => new Set(slugs).size === slugs.length, {
      message: "Model slugs for comparison must be unique",
    }),
});

export type CompareRequest = z.infer<typeof CompareRequestSchema>;

/** Health Check Query */
export const HealthCheckQuerySchema = z.object({
  check: z.enum(["liveness", "readiness"]).default("readiness"),
});

export type HealthCheckQuery = z.infer<typeof HealthCheckQuerySchema>;

/** Future Model Discovery Filter Schema (Contract specification for Phase 4B) */
export const ModelsQueryFilterSchema = PaginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  lab: z.string().trim().max(64).optional(),
  provider: z.string().trim().max(64).optional(),
  modality: z.enum(["text", "image", "audio", "video"]).optional(),
  reasoning: z.coerce.boolean().optional(),
  openWeights: z.coerce.boolean().optional(),
  minimumContext: z.coerce.number().int().min(0).optional(),
  maximumContext: z.coerce.number().int().min(0).optional(),
  minimumInputPrice: z.coerce.number().min(0).optional(),
  maximumInputPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(SORT_ALLOWLISTS.MODELS).default("name"),
  order: z.enum(SORT_ORDERS).default("asc"),
});

export type ModelsQueryFilter = z.infer<typeof ModelsQueryFilterSchema>;
