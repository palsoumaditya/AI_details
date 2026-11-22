import { prisma, PrismaClient, Prisma } from "../database/index";
import type {
  ModelDetailDto,
  ModelLabDto,
  ModelEndpointDto,
  EndpointPricingOfferDto,
  PricingOfferDto,
  ModelCatalogPricingSummaryDto,
  BenchmarkResultDto,
  FieldProvenanceDto,
  DataQualitySummaryDto,
  PricingHistoryRecordDto,
  PricingHistoryResult,
  PaginationMeta,
} from "../shared/types/api";
import {
  ModelSlugParamSchema,
  PricingHistoryQuerySchema,
  PricingHistoryInputQuery,
  PricingHistoryQuery,
} from "../shared/schemas/api";
import type { IModelDetailQueryService } from "./contracts/index";
import { cacheService } from "./cache.service";

/**
 * Service for querying comprehensive canonical AI model profiles and pricing history.
 *
 * Exposes canonical specifications, multi-provider online endpoint matrices,
 * historical pricing streams, benchmark scorecards, and verifiable field provenance.
 */
export class ModelDetailQueryService implements IModelDetailQueryService {
  constructor(private readonly db: PrismaClient = prisma) {}

  /**
   * Retrieves a comprehensive canonical model profile by slug.
   *
   * Queries the canonical model record with associated research labs, active provider endpoints,
   * benchmark evaluation scorecards, field-level provenance, and metadata conflict statuses.
   *
   * @param slug - Canonical model slug identifier (e.g., "gpt-4o").
   * @returns Detailed model DTO or null if the model is not found.
   */
  async getModelDetails(slug: string): Promise<ModelDetailDto | null> {
    const slugValidation = ModelSlugParamSchema.safeParse({ slug });
    if (!slugValidation.success) {
      return null;
    }

    const canonicalSlug = slugValidation.data.slug;

    return cacheService.getOrSet(
      "model_details",
      canonicalSlug,
      async () => {
        // Query canonical model profile and nested relations using bounded projection
        const model = await this.db.model.findUnique({
          where: { slug: canonicalSlug },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            family: true,
            architectureType: true,
            releaseDate: true,
            knowledgeCutoff: true,
            license: true,
            isReasoning: true,
            isOpenWeight: true,
            inputModalities: true,
            outputModalities: true,
            capabilities: true,
            contextWindow: true,
            maxOutputTokens: true,
            status: true,
            updatedAt: true,
            labs: {
              select: {
                relationshipType: true,
                aiLab: {
                  select: {
                    id: true,
                    slug: true,
                    name: true,
                    website: true,
                    logoUrl: true,
                    country: true,
                  },
                },
              },
            },
            endpoints: {
              select: {
                id: true,
                endpointKey: true,
                name: true,
                status: true,
                contextWindow: true,
                maxOutputTokens: true,
                inputModalities: true,
                outputModalities: true,
                capabilities: true,
                isModerated: true,
                lastSeenAt: true,
                provider: {
                  select: {
                    id: true,
                    slug: true,
                    name: true,
                    website: true,
                    logoUrl: true,
                    providerType: true,
                  },
                },
                sourceMappings: {
                  select: {
                    lastFetchedAt: true,
                    source: {
                      select: {
                        slug: true,
                      },
                    },
                  },
                },
                pricingRecords: {
                  orderBy: { observedAt: "desc" },
                  select: {
                    id: true,
                    inputPricePerMillion: true,
                    outputPricePerMillion: true,
                    cacheReadPricePerMillion: true,
                    cacheWritePricePerMillion: true,
                    currency: true,
                    pricingUnit: true,
                    observedAt: true,
                    source: {
                      select: {
                        slug: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            benchmarkResults: {
              orderBy: { observedAt: "desc" },
              select: {
                id: true,
                metricValue: true,
                evaluationDate: true,
                modelVersion: true,
                sampleSize: true,
                sourceUrl: true,
                notes: true,
                benchmark: {
                  select: {
                    slug: true,
                    name: true,
                    version: true,
                    category: true,
                    metricName: true,
                    metricUnit: true,
                    higherIsBetter: true,
                  },
                },
                source: {
                  select: {
                    slug: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        if (!model) {
          return null;
        }

        // Concurrently retrieve field-level provenance and unresolved metadata conflicts
        const [provenanceRows, conflictRows] = await Promise.all([
          this.db.fieldProvenance.findMany({
            where: { entityType: "MODEL", entityId: model.id },
            select: {
              fieldKey: true,
              confidence: true,
              selectedAt: true,
              sourceExternalId: true,
              source: {
                select: {
                  slug: true,
                  name: true,
                },
              },
            },
          }),
          this.db.dataConflict.findMany({
            where: { entityType: "MODEL", entityId: model.id, status: "OPEN" },
            select: {
              fieldKey: true,
              severity: true,
              detectedAt: true,
            },
          }),
        ]);

        const labs: ModelLabDto[] = model.labs.map((l) => ({
          id: l.aiLab.id,
          slug: l.aiLab.slug,
          name: l.aiLab.name,
          website: l.aiLab.website,
          logoUrl: l.aiLab.logoUrl,
          country: l.aiLab.country,
          relationshipType: l.relationshipType as "CREATOR" | "PUBLISHER" | "COLLABORATOR",
        }));

        let lowestInputPrice: Prisma.Decimal | null = null;
        let lowestOutputPrice: Prisma.Decimal | null = null;
        let lowestInputOffer: PricingOfferDto | null = null;
        let lowestOutputOffer: PricingOfferDto | null = null;
        const onlineProviders = new Set<string>();

        const endpoints: ModelEndpointDto[] = model.endpoints.map((ep) => {
          if (ep.status === "ONLINE") {
            onlineProviders.add(ep.provider.id);
          }

          // Group pricing observations by source slug to keep the latest observation per source
          const latestPricesBySource = new Map<string, (typeof ep.pricingRecords)[0]>();
          for (const pr of ep.pricingRecords) {
            const sourceKey = pr.source?.slug ?? "unknown";
            if (!latestPricesBySource.has(sourceKey)) {
              latestPricesBySource.set(sourceKey, pr);
            }
          }

          const pricingOffers: EndpointPricingOfferDto[] = Array.from(latestPricesBySource.values()).map(
            (pr) => {
              if (ep.status === "ONLINE") {
                if (pr.inputPricePerMillion !== null) {
                  if (lowestInputPrice === null || pr.inputPricePerMillion.lessThan(lowestInputPrice)) {
                    lowestInputPrice = pr.inputPricePerMillion;
                    lowestInputOffer = {
                      amount: pr.inputPricePerMillion.toString(),
                      currency: "USD",
                      unit: "1M_TOKENS",
                      provider: {
                        name: ep.provider.name,
                        slug: ep.provider.slug,
                      },
                      source: pr.source?.slug ?? "unknown",
                      observedAt: pr.observedAt.toISOString(),
                    };
                  }
                }

                if (pr.outputPricePerMillion !== null) {
                  if (lowestOutputPrice === null || pr.outputPricePerMillion.lessThan(lowestOutputPrice)) {
                    lowestOutputPrice = pr.outputPricePerMillion;
                    lowestOutputOffer = {
                      amount: pr.outputPricePerMillion.toString(),
                      currency: "USD",
                      unit: "1M_TOKENS",
                      provider: {
                        name: ep.provider.name,
                        slug: ep.provider.slug,
                      },
                      source: pr.source?.slug ?? "unknown",
                      observedAt: pr.observedAt.toISOString(),
                    };
                  }
                }
              }

              return {
                source: pr.source ? { slug: pr.source.slug, name: pr.source.name } : null,
                inputPricePerMillion: pr.inputPricePerMillion ? pr.inputPricePerMillion.toString() : null,
                outputPricePerMillion: pr.outputPricePerMillion ? pr.outputPricePerMillion.toString() : null,
                cacheReadPricePerMillion: pr.cacheReadPricePerMillion ? pr.cacheReadPricePerMillion.toString() : null,
                cacheWritePricePerMillion: pr.cacheWritePricePerMillion ? pr.cacheWritePricePerMillion.toString() : null,
                currency: pr.currency,
                pricingUnit: pr.pricingUnit,
                observedAt: pr.observedAt.toISOString(),
              };
            }
          );

          return {
            id: ep.id,
            endpointKey: ep.endpointKey,
            name: ep.name,
            status: ep.status,
            contextWindow: ep.contextWindow,
            maxOutputTokens: ep.maxOutputTokens,
            inputModalities: ep.inputModalities,
            outputModalities: ep.outputModalities,
            capabilities: (ep.capabilities as Record<string, unknown>) ?? null,
            isModerated: ep.isModerated,
            lastSeenAt: ep.lastSeenAt ? ep.lastSeenAt.toISOString() : null,
            provider: {
              id: ep.provider.id,
              slug: ep.provider.slug,
              name: ep.provider.name,
              website: ep.provider.website,
              logoUrl: ep.provider.logoUrl,
              providerType: ep.provider.providerType,
            },
            sourceMappings: ep.sourceMappings.map((sm) => ({
              source: sm.source.slug,
              observedAt: sm.lastFetchedAt ? sm.lastFetchedAt.toISOString() : null,
            })),
            pricing: pricingOffers,
          };
        });

        const pricingSummary: ModelCatalogPricingSummaryDto = {
          lowestInput: lowestInputOffer,
          lowestOutput: lowestOutputOffer,
          availableProviderCount: onlineProviders.size,
        };

        const benchmarks: BenchmarkResultDto[] = model.benchmarkResults.map((br) => ({
          id: br.id,
          benchmark: {
            slug: br.benchmark.slug,
            name: br.benchmark.name,
            version: br.benchmark.version,
            category: br.benchmark.category,
            metricName: br.benchmark.metricName,
            metricUnit: br.benchmark.metricUnit,
            higherIsBetter: br.benchmark.higherIsBetter,
          },
          result: {
            value: br.metricValue.toString(),
            evaluationDate: br.evaluationDate ? br.evaluationDate.toISOString() : null,
            modelVersion: br.modelVersion,
            sampleSize: br.sampleSize,
            sourceUrl: br.sourceUrl,
            notes: br.notes,
          },
          source: {
            slug: br.source.slug,
            name: br.source.name,
          },
        }));

        const provenance: Record<string, FieldProvenanceDto> = {};
        for (const pr of provenanceRows) {
          provenance[pr.fieldKey] = {
            fieldKey: pr.fieldKey,
            sourceSlug: pr.source.slug,
            sourceName: pr.source.name,
            sourceExternalId: pr.sourceExternalId,
            confidence: pr.confidence,
            selectedAt: pr.selectedAt.toISOString(),
          };
        }

        // Assess overall metadata quality based on active conflicts and recorded provenance
        let dataQualityStatus: DataQualitySummaryDto["status"] = "UNKNOWN";
        const warnings: string[] = [];

        const hasCriticalConflicts = conflictRows.some((c) => c.severity === "CRITICAL");
        const hasAnyConflicts = conflictRows.length > 0;

        if (hasCriticalConflicts) {
          dataQualityStatus = "CONFLICTED";
          for (const c of conflictRows.filter((cr) => cr.severity === "CRITICAL")) {
            warnings.push(`Unresolved critical metadata conflict on '${c.fieldKey}'`);
          }
        } else if (hasAnyConflicts) {
          dataQualityStatus = "PARTIAL";
          for (const c of conflictRows) {
            warnings.push(`Unresolved metadata warning on '${c.fieldKey}'`);
          }
        } else if (provenanceRows.length > 0) {
          dataQualityStatus = "VERIFIED";
        }

        const dataQuality: DataQualitySummaryDto = {
          status: dataQualityStatus,
          lastMetadataUpdate: model.updatedAt.toISOString(),
          hasConflicts: hasAnyConflicts,
          conflictCount: conflictRows.length,
          warnings,
        };

        return {
          id: model.id,
          slug: model.slug,
          name: model.name,
          description: model.description,
          family: model.family,
          architectureType: model.architectureType,
          releaseDate: model.releaseDate ? model.releaseDate.toISOString() : null,
          knowledgeCutoff: model.knowledgeCutoff,
          lastUpdated: model.updatedAt.toISOString(),
          license: model.license,
          isReasoning: model.isReasoning,
          isOpenWeight: model.isOpenWeight,
          contextWindow: model.contextWindow,
          maxOutputTokens: model.maxOutputTokens,
          inputModalities: model.inputModalities,
          outputModalities: model.outputModalities,
          capabilities: (model.capabilities as Record<string, unknown>) ?? null,
          status: model.status,
          labs,
          endpoints,
          pricingSummary,
          benchmarks,
          provenance,
          dataQuality,
        };
      },
      120
    );
  }

  /**
   * Retrieves paginated pricing observation history for a model.
   *
   * @param slug - Canonical model slug.
   * @param inputQuery - Query filters (provider, source, endpoint, date range, pagination, sort).
   * @returns Paginated pricing observation records or null if the model does not exist.
   */
  async getModelPricingHistory(
    slug: string,
    inputQuery: PricingHistoryInputQuery
  ): Promise<PricingHistoryResult | null> {
    const slugValidation = ModelSlugParamSchema.safeParse({ slug });
    if (!slugValidation.success) {
      return null;
    }

    const canonicalSlug = slugValidation.data.slug;
    const query: PricingHistoryQuery = PricingHistoryQuerySchema.parse(inputQuery);
    const cacheKey = `pricing:${canonicalSlug}:${JSON.stringify(query)}`;

    return cacheService.getOrSet(
      "model_details",
      cacheKey,
      async () => {
        const model = await this.db.model.findUnique({
          where: { slug: canonicalSlug },
          select: { id: true, slug: true },
        });

        if (!model) {
          return null;
        }

        const where: Prisma.PricingRecordWhereInput = {
          endpoint: {
            modelId: model.id,
            ...(query.provider ? { provider: { slug: query.provider } } : {}),
            ...(query.endpoint ? { endpointKey: query.endpoint } : {}),
          },
          ...(query.source ? { source: { slug: query.source } } : {}),
          ...(query.from || query.to
            ? {
                observedAt: {
                  ...(query.from ? { gte: new Date(query.from) } : {}),
                  ...(query.to ? { lte: new Date(query.to) } : {}),
                },
              }
            : {}),
        };

        const page = query.page;
        const limit = query.limit;
        const skip = (page - 1) * limit;

        const [totalItems, rows] = await Promise.all([
          this.db.pricingRecord.count({ where }),
          this.db.pricingRecord.findMany({
            where,
            skip,
            take: limit,
            orderBy: [
              { observedAt: query.sort === "oldest" ? "asc" : "desc" },
              { id: "desc" },
            ],
            select: {
              id: true,
              inputPricePerMillion: true,
              outputPricePerMillion: true,
              cacheReadPricePerMillion: true,
              cacheWritePricePerMillion: true,
              currency: true,
              pricingUnit: true,
              observedAt: true,
              endpoint: {
                select: {
                  id: true,
                  endpointKey: true,
                  provider: {
                    select: {
                      id: true,
                      slug: true,
                      name: true,
                    },
                  },
                },
              },
              source: {
                select: {
                  slug: true,
                  name: true,
                },
              },
            },
          }),
        ]);

        const records: PricingHistoryRecordDto[] = rows.map((r) => ({
          id: r.id,
          endpointId: r.endpoint.id,
          endpointKey: r.endpoint.endpointKey,
          provider: {
            id: r.endpoint.provider.id,
            slug: r.endpoint.provider.slug,
            name: r.endpoint.provider.name,
          },
          source: r.source ? { slug: r.source.slug, name: r.source.name } : null,
          inputPricePerMillion: r.inputPricePerMillion ? r.inputPricePerMillion.toString() : null,
          outputPricePerMillion: r.outputPricePerMillion ? r.outputPricePerMillion.toString() : null,
          cacheReadPricePerMillion: r.cacheReadPricePerMillion ? r.cacheReadPricePerMillion.toString() : null,
          cacheWritePricePerMillion: r.cacheWritePricePerMillion ? r.cacheWritePricePerMillion.toString() : null,
          currency: r.currency,
          pricingUnit: r.pricingUnit,
          observedAt: r.observedAt.toISOString(),
        }));

        const totalPages = Math.ceil(totalItems / limit);
        const pagination: PaginationMeta = {
          page,
          limit,
          total: totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        };

        return {
          records,
          pagination,
          appliedFilters: {
            slug: canonicalSlug,
            provider: query.provider,
            source: query.source,
            endpoint: query.endpoint,
            from: query.from,
            to: query.to,
            sort: query.sort,
            page,
            limit,
          },
        };
      },
      60
    );
  }
}

export const modelDetailQueryService = new ModelDetailQueryService();
