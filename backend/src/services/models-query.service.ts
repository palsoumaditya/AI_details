import { prisma, PrismaClient, Prisma } from "../database/index";
import type {
  ModelCatalogItemDto,
  PricingOfferDto,
  ModelCatalogPricingSummaryDto,
  PaginationMeta,
  ModelDetailDto,
  PricingHistoryResult,
} from "../shared/types/api";
import {
  ModelsCatalogQuery,
  ModelsCatalogInputQuery,
  ModelsCatalogQuerySchema,
  PricingHistoryInputQuery,
} from "../shared/schemas/api";
import type {
  IModelsQueryService,
  ModelsCatalogResult,
} from "./contracts/index";
import { modelDetailQueryService } from "./model-detail-query.service";
import { cacheService } from "./cache.service";

/**
 * Service for querying and discovering AI models across providers.
 *
 * Handles parameterized filtering (modalities, context window, pricing, labs, providers),
 * full-text search, multi-provider pricing aggregations, and indexed or price-based pagination.
 */
export class ModelsQueryService implements IModelsQueryService {
  constructor(private readonly db: PrismaClient = prisma) {}

  /**
   * Queries the model catalog with filtering, sorting, and pagination.
   *
   * Results are cached for 60 seconds keyed by the normalized query parameters.
   * Supports standard database-indexed sorting (release date, name, context window)
   * as well as computed lowest-price sorting across active online endpoints.
   *
   * @param inputQuery - Raw or partial query parameters from the client.
   * @returns Paginated catalog items, pagination metadata, and applied filters.
   */
  async getModelsCatalog(inputQuery: ModelsCatalogInputQuery): Promise<ModelsCatalogResult> {
    const query: ModelsCatalogQuery = ModelsCatalogQuerySchema.parse(inputQuery);
    const cacheKey = JSON.stringify(query);

    return cacheService.getOrSet(
      "models",
      cacheKey,
      async () => {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where = this.buildWhereClause(query);
        const isPriceSort =
          query.sort === "input_price_asc" ||
          query.sort === "input_price_desc" ||
          query.sort === "output_price_asc" ||
          query.sort === "output_price_desc";

        let models: ModelCatalogItemDto[] = [];
        let total = 0;

        if (isPriceSort) {
          const priceSortResult = await this.queryWithPriceSorting(where, query, skip, limit);
          models = priceSortResult.models;
          total = priceSortResult.total;
        } else {
          const orderBy = this.buildStandardOrderBy(query.sort);

          const [records, count] = await Promise.all([
            this.db.model.findMany({
              where,
              orderBy,
              skip,
              take: limit,
              include: {
                labs: {
                  include: {
                    aiLab: {
                      select: {
                        id: true,
                        name: true,
                        slug: true,
                      },
                    },
                  },
                },
                endpoints: {
                  where: {
                    status: "ONLINE",
                  },
                  include: {
                    provider: {
                      select: {
                        id: true,
                        name: true,
                        slug: true,
                      },
                    },
                    pricingRecords: {
                      orderBy: { observedAt: "desc" },
                      take: 1,
                      include: {
                        source: {
                          select: {
                            slug: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
            this.db.model.count({ where }),
          ]);

          total = count;
          models = records.map((record) => this.mapToCatalogItemDto(record));
        }

        const totalPages = Math.ceil(total / limit) || 1;
        const pagination: PaginationMeta = {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        };

        return {
          models,
          pagination,
          appliedFilters: query,
        };
      },
      60
    );
  }

  /**
   * Constructs the Prisma WHERE clause based on the provided catalog filters.
   *
   * Enforces that only active models are returned and applies case-insensitive matching
   * for search terms, labs, and providers. Pricing filters are constrained to match
   * within the same pricing record on an active online endpoint.
   *
   * @param query - Validated catalog query options.
   * @returns Prisma model WHERE condition tree.
   */
  private buildWhereClause(query: ModelsCatalogQuery): Prisma.ModelWhereInput {
    const andConditions: Prisma.ModelWhereInput[] = [
      { status: "ACTIVE" },
    ];

    if (query.q && query.q.length > 0) {
      andConditions.push({
        OR: [
          { name: { contains: query.q, mode: "insensitive" } },
          { slug: { contains: query.q, mode: "insensitive" } },
          { family: { contains: query.q, mode: "insensitive" } },
          { description: { contains: query.q, mode: "insensitive" } },
        ],
      });
    }

    if (query.lab && query.lab.length > 0) {
      andConditions.push({
        labs: {
          some: {
            aiLab: {
              slug: { equals: query.lab, mode: "insensitive" },
            },
          },
        },
      });
    }

    if (query.provider && query.provider.length > 0) {
      andConditions.push({
        endpoints: {
          some: {
            status: "ONLINE",
            provider: {
              slug: { equals: query.provider, mode: "insensitive" },
            },
          },
        },
      });
    }

    if (query.modality && query.modality.length > 0) {
      andConditions.push({
        OR: [
          { inputModalities: { has: query.modality } },
          { outputModalities: { has: query.modality } },
        ],
      });
    }

    if (query.inputModality && query.inputModality.length > 0) {
      andConditions.push({
        inputModalities: { has: query.inputModality },
      });
    }

    if (query.outputModality && query.outputModality.length > 0) {
      andConditions.push({
        outputModalities: { has: query.outputModality },
      });
    }

    if (query.reasoning !== undefined) {
      andConditions.push({
        isReasoning: query.reasoning,
      });
    }

    if (query.openWeights !== undefined) {
      andConditions.push({
        isOpenWeight: query.openWeights,
      });
    }

    if (query.minimumContext !== undefined || query.maximumContext !== undefined) {
      andConditions.push({
        contextWindow: {
          not: null,
          ...(query.minimumContext !== undefined ? { gte: query.minimumContext } : {}),
          ...(query.maximumContext !== undefined ? { lte: query.maximumContext } : {}),
        },
      });
    }

    const hasInputPriceFilter =
      query.minimumInputPrice !== undefined || query.maximumInputPrice !== undefined;
    const hasOutputPriceFilter =
      query.minimumOutputPrice !== undefined || query.maximumOutputPrice !== undefined;

    if (hasInputPriceFilter || hasOutputPriceFilter) {
      const pricingConditions: Prisma.PricingRecordWhereInput = {};

      if (hasInputPriceFilter) {
        pricingConditions.inputPricePerMillion = {
          not: null,
          ...(query.minimumInputPrice !== undefined
            ? { gte: new Prisma.Decimal(query.minimumInputPrice) }
            : {}),
          ...(query.maximumInputPrice !== undefined
            ? { lte: new Prisma.Decimal(query.maximumInputPrice) }
            : {}),
        };
      }

      if (hasOutputPriceFilter) {
        pricingConditions.outputPricePerMillion = {
          not: null,
          ...(query.minimumOutputPrice !== undefined
            ? { gte: new Prisma.Decimal(query.minimumOutputPrice) }
            : {}),
          ...(query.maximumOutputPrice !== undefined
            ? { lte: new Prisma.Decimal(query.maximumOutputPrice) }
            : {}),
        };
      }

      andConditions.push({
        endpoints: {
          some: {
            status: "ONLINE",
            pricingRecords: {
              some: pricingConditions,
            },
          },
        },
      });
    }

    return {
      AND: andConditions,
    };
  }

  /**
   * Generates Prisma order-by clauses for standard indexed model attributes.
   *
   * All sorts maintain deterministic ordering by appending model ID as a secondary tie-breaker.
   *
   * @param sort - Requested sort order.
   * @returns Array of Prisma order-by definitions.
   */
  private buildStandardOrderBy(
    sort: ModelsCatalogQuery["sort"]
  ): Prisma.ModelOrderByWithRelationInput[] {
    switch (sort) {
      case "oldest":
        return [
          { releaseDate: { sort: "asc", nulls: "last" } },
          { id: "asc" },
        ];
      case "name_asc":
        return [{ name: "asc" }, { id: "asc" }];
      case "name_desc":
        return [{ name: "desc" }, { id: "desc" }];
      case "context_desc":
        return [
          { contextWindow: { sort: "desc", nulls: "last" } },
          { id: "desc" },
        ];
      case "context_asc":
        return [
          { contextWindow: { sort: "asc", nulls: "last" } },
          { id: "asc" },
        ];
      case "newest":
      default:
        return [
          { releaseDate: { sort: "desc", nulls: "last" } },
          { id: "desc" },
        ];
    }
  }

  /**
   * Performs database retrieval and pagination sorted by lowest endpoint price.
   *
   * Because lowest pricing across multiple provider endpoints is dynamic and computed,
   * this method fetches matching candidates with active endpoints, computes the minimum
   * price per model using exact Decimal precision, sorts with nulls placed last,
   * slices the current page IDs, and hydrates the full model records.
   *
   * @param where - Filter criteria for candidate models.
   * @param query - Validated catalog query containing sort direction.
   * @param skip - Pagination offset.
   * @param limit - Page size.
   * @returns Paginated list of catalog items and total match count.
   */
  private async queryWithPriceSorting(
    where: Prisma.ModelWhereInput,
    query: ModelsCatalogQuery,
    skip: number,
    limit: number
  ): Promise<{ models: ModelCatalogItemDto[]; total: number }> {
    const total = await this.db.model.count({ where });
    if (total === 0) {
      return { models: [], total: 0 };
    }

    const matchingModels = await this.db.model.findMany({
      where,
      select: {
        id: true,
        endpoints: {
          where: { status: "ONLINE" },
          select: {
            pricingRecords: {
              orderBy: { observedAt: "desc" },
              take: 1,
              select: {
                inputPricePerMillion: true,
                outputPricePerMillion: true,
              },
            },
          },
        },
      },
    });

    const isInput =
      query.sort === "input_price_asc" || query.sort === "input_price_desc";
    const isAsc =
      query.sort === "input_price_asc" || query.sort === "output_price_asc";

    const scoredModels = matchingModels.map((m) => {
      let lowestPrice: Prisma.Decimal | null = null;

      for (const ep of m.endpoints) {
        const pr = ep.pricingRecords[0];
        if (!pr) continue;

        const val = isInput ? pr.inputPricePerMillion : pr.outputPricePerMillion;
        if (val !== null && val !== undefined) {
          if (lowestPrice === null || val.lessThan(lowestPrice)) {
            lowestPrice = val;
          }
        }
      }

      return {
        id: m.id,
        price: lowestPrice,
      };
    });

    // Sort with nulls last, breaking ties deterministically by ID
    scoredModels.sort((a, b) => {
      if (a.price === null && b.price === null) return a.id.localeCompare(b.id);
      if (a.price === null) return 1;
      if (b.price === null) return -1;

      if (a.price.equals(b.price)) {
        return a.id.localeCompare(b.id);
      }

      const cmp = a.price.lessThan(b.price) ? -1 : 1;
      return isAsc ? cmp : -cmp;
    });

    const pageSlice = scoredModels.slice(skip, skip + limit);
    const pageIds = pageSlice.map((s) => s.id);

    if (pageIds.length === 0) {
      return { models: [], total };
    }

    const fullRecords = await this.db.model.findMany({
      where: {
        id: { in: pageIds },
      },
      include: {
        labs: {
          include: {
            aiLab: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        endpoints: {
          where: {
            status: "ONLINE",
          },
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            pricingRecords: {
              orderBy: { observedAt: "desc" },
              take: 1,
              include: {
                source: {
                  select: {
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Maintain the scored sort order across hydrated records
    const recordMap = new Map(fullRecords.map((r) => [r.id, r]));
    const orderedRecords = pageIds
      .map((id) => recordMap.get(id))
      .filter((r): r is NonNullable<typeof r> => r !== undefined);

    const models = orderedRecords.map((r) => this.mapToCatalogItemDto(r));
    return { models, total };
  }

  /**
   * Transforms an internal database model record into a public catalog item DTO.
   *
   * @param record - Database model entity with related labs and endpoint pricing records.
   * @returns Public ModelCatalogItemDto representation.
   */
  private mapToCatalogItemDto(record: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    family: string | null;
    releaseDate: Date | null;
    knowledgeCutoff: string | null;
    contextWindow: number | null;
    maxOutputTokens: number | null;
    isReasoning: boolean | null;
    isOpenWeight: boolean | null;
    inputModalities: string[];
    outputModalities: string[];
    labs: Array<{
      aiLab: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
    endpoints: Array<{
      provider: {
        id: string;
        name: string;
        slug: string;
      };
      pricingRecords: Array<{
        inputPricePerMillion: Prisma.Decimal | null;
        outputPricePerMillion: Prisma.Decimal | null;
        currency: string;
        observedAt: Date;
        source: {
          slug: string;
        } | null;
      }>;
    }>;
  }): ModelCatalogItemDto {
    const pricingSummary = this.calculatePricingSummary(record.endpoints);

    return {
      id: record.id,
      slug: record.slug,
      name: record.name,
      description: record.description,
      family: record.family,
      releaseDate: record.releaseDate ? record.releaseDate.toISOString() : null,
      knowledgeCutoff: record.knowledgeCutoff,
      contextWindow: record.contextWindow,
      maxOutputTokens: record.maxOutputTokens,
      isReasoning: record.isReasoning,
      isOpenWeight: record.isOpenWeight,
      inputModalities: record.inputModalities,
      outputModalities: record.outputModalities,
      labs: record.labs.map((l) => ({
        id: l.aiLab.id,
        name: l.aiLab.name,
        slug: l.aiLab.slug,
      })),
      pricing: pricingSummary,
    };
  }

  /**
   * Evaluates online endpoints to determine the lowest available input and output token pricing.
   *
   * Iterates through active endpoints, comparing pricing records with Decimal precision
   * to identify the best offer for both input and output tokens per million.
   *
   * @param endpoints - List of online endpoints with latest observed pricing records.
   * @returns Summary containing lowest input/output offers and total available provider count.
   */
  private calculatePricingSummary(
    endpoints: Array<{
      provider: {
        name: string;
        slug: string;
      };
      pricingRecords: Array<{
        inputPricePerMillion: Prisma.Decimal | null;
        outputPricePerMillion: Prisma.Decimal | null;
        currency: string;
        observedAt: Date;
        source: {
          slug: string;
        } | null;
      }>;
    }>
  ): ModelCatalogPricingSummaryDto {
    let lowestInputOffer: PricingOfferDto | null = null;
    let lowestInputDecimal: Prisma.Decimal | null = null;

    let lowestOutputOffer: PricingOfferDto | null = null;
    let lowestOutputDecimal: Prisma.Decimal | null = null;

    const availableProviders = new Set<string>();

    for (const ep of endpoints) {
      availableProviders.add(ep.provider.slug);
      const pr = ep.pricingRecords[0];
      if (!pr) continue;

      const sourceSlug = pr.source?.slug || "unknown";

      if (pr.inputPricePerMillion !== null && pr.inputPricePerMillion !== undefined) {
        if (
          lowestInputDecimal === null ||
          pr.inputPricePerMillion.lessThan(lowestInputDecimal)
        ) {
          lowestInputDecimal = pr.inputPricePerMillion;
          lowestInputOffer = {
            amount: pr.inputPricePerMillion.toString(),
            currency: "USD",
            unit: "1M_TOKENS",
            provider: {
              name: ep.provider.name,
              slug: ep.provider.slug,
            },
            source: sourceSlug,
            observedAt: pr.observedAt.toISOString(),
          };
        }
      }

      if (pr.outputPricePerMillion !== null && pr.outputPricePerMillion !== undefined) {
        if (
          lowestOutputDecimal === null ||
          pr.outputPricePerMillion.lessThan(lowestOutputDecimal)
        ) {
          lowestOutputDecimal = pr.outputPricePerMillion;
          lowestOutputOffer = {
            amount: pr.outputPricePerMillion.toString(),
            currency: "USD",
            unit: "1M_TOKENS",
            provider: {
              name: ep.provider.name,
              slug: ep.provider.slug,
            },
            source: sourceSlug,
            observedAt: pr.observedAt.toISOString(),
          };
        }
      }
    }

    return {
      lowestInput: lowestInputOffer,
      lowestOutput: lowestOutputOffer,
      availableProviderCount: availableProviders.size,
    };
  }

  /**
   * Retrieves canonical model details by slug.
   *
   * @param slug - Canonical model identifier.
   * @returns Detailed model DTO or null if not found.
   */
  async getModelBySlug(slug: string): Promise<ModelDetailDto | null> {
    return modelDetailQueryService.getModelDetails(slug);
  }

  /**
   * Retrieves historical pricing time series for a model across providers.
   *
   * @param slug - Canonical model identifier.
   * @param query - Timeframe and granularity options.
   * @returns Pricing history result or null if the model is not found.
   */
  async getModelPricingHistory(
    slug: string,
    query: PricingHistoryInputQuery
  ): Promise<PricingHistoryResult | null> {
    return modelDetailQueryService.getModelPricingHistory(slug, query);
  }
}

export const modelsQueryService = new ModelsQueryService();
