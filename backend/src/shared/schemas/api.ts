import { z } from "zod";
import {
  PAGINATION_CONSTRAINTS,
  MODEL_CATALOG_SORTS,
} from "../constants/api";

/**
 * Reusable Zod Validation Schemas for Incoming Request Parameters (Phase 4A & 4B)
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

/**
 * Model Catalog Query Parameters Schema (Phase 4B)
 *
 * Validates, normalizes, and sanitizes all incoming filters for GET /api/v1/models.
 */
export const ModelsCatalogQuerySchema = z
  .object({
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
    q: z
      .string()
      .trim()
      .max(100, "Search query cannot exceed 100 characters")
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
    lab: z
      .string()
      .trim()
      .max(64, "Lab slug cannot exceed 64 characters")
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
    provider: z
      .string()
      .trim()
      .max(64, "Provider slug cannot exceed 64 characters")
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
    modality: z
      .string()
      .trim()
      .max(32)
      .optional()
      .transform((val) => (val && val.length > 0 ? val.toLowerCase() : undefined)),
    inputModality: z
      .string()
      .trim()
      .max(32)
      .optional()
      .transform((val) => (val && val.length > 0 ? val.toLowerCase() : undefined)),
    outputModality: z
      .string()
      .trim()
      .max(32)
      .optional()
      .transform((val) => (val && val.length > 0 ? val.toLowerCase() : undefined)),
    reasoning: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .optional()
      .transform((val) => {
        if (val === undefined) return undefined;
        if (typeof val === "boolean") return val;
        return val === "true";
      }),
    openWeights: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .optional()
      .transform((val) => {
        if (val === undefined) return undefined;
        if (typeof val === "boolean") return val;
        return val === "true";
      }),
    minimumContext: z.coerce
      .number()
      .int("Minimum context must be an integer")
      .min(0, "Minimum context must be >= 0")
      .optional(),
    maximumContext: z.coerce
      .number()
      .int("Maximum context must be an integer")
      .min(0, "Maximum context must be >= 0")
      .optional(),
    minimumInputPrice: z.coerce
      .number()
      .min(0, "Minimum input price must be >= 0")
      .optional(),
    maximumInputPrice: z.coerce
      .number()
      .min(0, "Maximum input price must be >= 0")
      .optional(),
    minimumOutputPrice: z.coerce
      .number()
      .min(0, "Minimum output price must be >= 0")
      .optional(),
    maximumOutputPrice: z.coerce
      .number()
      .min(0, "Maximum output price must be >= 0")
      .optional(),
    sort: z.enum(MODEL_CATALOG_SORTS).default("newest"),
  })
  .refine(
    (data) => {
      if (data.minimumContext !== undefined && data.maximumContext !== undefined) {
        return data.minimumContext <= data.maximumContext;
      }
      return true;
    },
    {
      message: "minimumContext cannot exceed maximumContext",
      path: ["minimumContext"],
    }
  )
  .refine(
    (data) => {
      if (data.minimumInputPrice !== undefined && data.maximumInputPrice !== undefined) {
        return data.minimumInputPrice <= data.maximumInputPrice;
      }
      return true;
    },
    {
      message: "minimumInputPrice cannot exceed maximumInputPrice",
      path: ["minimumInputPrice"],
    }
  )
  .refine(
    (data) => {
      if (data.minimumOutputPrice !== undefined && data.maximumOutputPrice !== undefined) {
        return data.minimumOutputPrice <= data.maximumOutputPrice;
      }
      return true;
    },
    {
      message: "minimumOutputPrice cannot exceed maximumOutputPrice",
      path: ["minimumOutputPrice"],
    }
  );

export type ModelsCatalogQuery = z.infer<typeof ModelsCatalogQuerySchema>;
export type ModelsCatalogInputQuery = z.input<typeof ModelsCatalogQuerySchema>;
export const ModelsQueryFilterSchema = ModelsCatalogQuerySchema;
export type ModelsQueryFilter = ModelsCatalogQuery;

/** Model Slug Path Parameter Schema (Phase 4C) */
export const ModelSlugParamSchema = SlugParamSchema;
export type ModelSlugParam = SlugParam;

/** Pricing History Query Schema (Phase 4C) */
export const PricingHistoryQuerySchema = z
  .object({
    provider: z.string().trim().max(100, "Provider slug cannot exceed 100 characters").optional(),
    source: z.string().trim().max(100, "Source slug cannot exceed 100 characters").optional(),
    endpoint: z.string().trim().max(200, "Endpoint key cannot exceed 200 characters").optional(),
    from: z.string().datetime({ message: "from must be a valid ISO 8601 date string" }).optional(),
    to: z.string().datetime({ message: "to must be a valid ISO 8601 date string" }).optional(),
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
    sort: z.enum(["newest", "oldest"]).default("newest"),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from).getTime() <= new Date(data.to).getTime();
      }
      return true;
    },
    {
      message: "from date cannot be after to date",
      path: ["from"],
    }
  );

export type PricingHistoryQuery = z.infer<typeof PricingHistoryQuerySchema>;
export type PricingHistoryInputQuery = z.input<typeof PricingHistoryQuerySchema>;
