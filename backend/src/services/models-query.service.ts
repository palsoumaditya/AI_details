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
 * Model Catalog Query Service (Phase 4B)
 *
 * Implements high-performance, parameterized catalog discovery, full-text & field filtering,
 * provider-aware pricing aggregations, sorting, and pagination across canonical AI models.
 */
export class ModelsQueryService implements IModelsQueryService {
  constructor(private readonly db: PrismaClient = prisma) {}

  /**
   * Primary Catalog Query Method: Search, Filter, Sort, Paginate
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

        // 1. Build relational WHERE conditions
        const where = this.buildWhereClause(query);

        // 2. Determine Sorting Strategy
        const isPriceSort =
          query.sort === "input_price_asc" ||
          query.sort === "input_price_desc" ||
          query.sort === "output_price_asc" ||
          query.sort === "output_price_desc";

        let models: ModelCatalogItemDto[] = [];
        let total = 0;

        if (isPriceSort) {
          // Execute database-level price sorting
          const priceSortResult = await this.queryWithPriceSorting(where, query, skip, limit);
          models = priceSortResult.models;
          total = priceSortResult.total;
        } else {
          // Standard Prisma query with index-accelerated sorting
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

  // ==========================================
  // QUERY BUILDER HELPERS
  // ==========================================

  private buildWhereClause(query: ModelsCatalogQuery): Prisma.ModelWhereInput {
    const andConditions: Prisma.ModelWhereInput[] = [
      // Only include active models in public discovery
      { status: "ACTIVE" },
    ];

    // Search query (case-insensitive across name, slug, family, description)
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

    // AI Lab filter (verified model-to-lab relation)
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

    // Provider filter (only through active online endpoints)
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

    // Modality filter (input or output)
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

    // Nullable reasoning classification
    if (query.reasoning !== undefined) {
      andConditions.push({
        isReasoning: query.reasoning,
      });
    }

    // Nullable open-weight classification
    if (query.openWeights !== undefined) {
      andConditions.push({
        isOpenWeight: query.openWeights,
      });
    }

    // Context window range
    if (query.minimumContext !== undefined || query.maximumContext !== undefined) {
      andConditions.push({
        contextWindow: {
          not: null,
          ...(query.minimumContext !== undefined ? { gte: query.minimumContext } : {}),
          ...(query.maximumContext !== undefined ? { lte: query.maximumContext } : {}),
        },
      });
    }

    // Pricing filters (must apply to the SAME pricing record of an eligible endpoint)
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
   * Handles price-based sorting by computing lowest price per model at database level
   */
  private async queryWithPriceSorting(
    where: Prisma.ModelWhereInput,
    query: ModelsCatalogQuery,
    skip: number,
    limit: number
  ): Promise<{ models: ModelCatalogItemDto[]; total: number }> {
    // 1. Get total matching count
    const total = await this.db.model.count({ where });
    if (total === 0) {
      return { models: [], total: 0 };
    }

    // 2. Fetch all matching model IDs and their endpoints
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

    // 3. Compute sort keys using exact Decimal comparisons
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

    // Sort with nulls last
    scoredModels.sort((a, b) => {
      if (a.price === null && b.price === null) return a.id.localeCompare(b.id);
      if (a.price === null) return 1; // nulls last
      if (b.price === null) return -1; // nulls last

      if (a.price.equals(b.price)) {
        return a.id.localeCompare(b.id);
      }

      const cmp = a.price.lessThan(b.price) ? -1 : 1;
      return isAsc ? cmp : -cmp;
    });

    // Slice for pagination
    const pageSlice = scoredModels.slice(skip, skip + limit);
    const pageIds = pageSlice.map((s) => s.id);

    if (pageIds.length === 0) {
      return { models: [], total };
    }

    // Fetch full model objects for the sliced page
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

    // Reorder records according to pageIds
    const recordMap = new Map(fullRecords.map((r) => [r.id, r]));
    const orderedRecords = pageIds
      .map((id) => recordMap.get(id))
      .filter((r): r is NonNullable<typeof r> => r !== undefined);

    const models = orderedRecords.map((r) => this.mapToCatalogItemDto(r));
    return { models, total };
  }

  /**
   * Maps internal Prisma model and relational endpoints into public ModelCatalogItemDto
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
   * Aggregates provider-aware lowest pricing offers across eligible online endpoints
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

      // Input price evaluation
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

      // Output price evaluation
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
   * Delegate single model detail lookup to ModelDetailQueryService (Phase 4C)
   */
  async getModelBySlug(slug: string): Promise<ModelDetailDto | null> {
    return modelDetailQueryService.getModelDetails(slug);
  }

  /**
   * Delegate pricing history lookup to ModelDetailQueryService (Phase 4C)
   */
  async getModelPricingHistory(
    slug: string,
    query: PricingHistoryInputQuery
  ): Promise<PricingHistoryResult | null> {
    return modelDetailQueryService.getModelPricingHistory(slug, query);
  }
}

export const modelsQueryService = new ModelsQueryService();
