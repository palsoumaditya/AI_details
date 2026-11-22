import { z } from "zod";

export * from "./api";

/** Pagination query parameters */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** Model search/filter parameters */
export const ModelFilterSchema = z.object({
  search: z.string().optional(),
  family: z.string().optional(),
  status: z.enum(["ACTIVE", "DEPRECATED", "EXPERIMENTAL"]).optional(),
  isReasoning: z.coerce.boolean().optional(),
  isOpenWeight: z.coerce.boolean().optional(),
  sortBy: z.enum(["name", "releaseDate", "contextWindow"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type PaginationParams = z.infer<typeof PaginationSchema>;
export type ModelFilterParams = z.infer<typeof ModelFilterSchema>;
