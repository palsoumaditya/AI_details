import { prisma, PrismaClient, Prisma } from "../database/index";
import type {
  BenchmarkDirectoryItemDto,
  RankedModelItemDto,
  RankingsDirectoryResult,
  BenchmarkLeaderboardResult,
} from "../shared/types/api";
import {
  RankingsDirectoryQuerySchema,
  RankingsDirectoryInputQuery,
  RankingsLeaderboardQuerySchema,
  RankingsLeaderboardInputQuery,
} from "../shared/schemas/api";
import type { IRankingsQueryService } from "./contracts/index";
import { cacheService } from "./cache.service";

/**
 * Rankings & Benchmark Leaderboard Query Service (Phase 4F / Task 6)
 *
 * Implements benchmark directory catalog, category aggregation, and benchmark leaderboards:
 * - Direction-aware score evaluation (higherIsBetter vs lowerIsBetter)
 * - Standard Competition Ranking ("1224") with deterministic tie resolution
 * - Per-model deduplication prioritizing the latest evaluation date
 * - Full Decimal precision preservation with numerical ranking compatibility
 * - Strict zero score fabrication (only verified benchmark results)
 */
export class RankingsQueryService implements IRankingsQueryService {
  constructor(private readonly db: PrismaClient = prisma) {}

  /**
   * List available benchmarks with category filtering, metadata, and evaluation counts.
   */
  async getBenchmarkDirectory(
    query?: RankingsDirectoryInputQuery
  ): Promise<RankingsDirectoryResult> {
    const validated = RankingsDirectoryQuerySchema.parse(query ?? {});
    const cacheKey = JSON.stringify(validated);

    return cacheService.getOrSet(
      "rankings",
      cacheKey,
      async () => {
        const where: Prisma.BenchmarkWhereInput = {};

    if (validated.category && validated.category !== "ALL") {
      where.category = validated.category as any;
    }

    if (validated.q) {
      where.OR = [
        { name: { contains: validated.q, mode: "insensitive" } },
        { slug: { contains: validated.q, mode: "insensitive" } },
        { description: { contains: validated.q, mode: "insensitive" } },
      ];
    }

    // Fetch benchmarks matching query
    const benchmarks = await this.db.benchmark.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        results: {
          select: {
            modelId: true,
            evaluationDate: true,
            observedAt: true,
          },
        },
      },
    });

    // Also fetch all benchmarks category distribution across the system
    const allBenchmarksForCategories = await this.db.benchmark.findMany({
      select: { category: true },
    });

    const categoryCountMap = new Map<string, number>();
    for (const b of allBenchmarksForCategories) {
      categoryCountMap.set(b.category, (categoryCountMap.get(b.category) ?? 0) + 1);
    }

    const categories = Array.from(categoryCountMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category));

    // Global distinct evaluated models count
    const distinctModelResults = await this.db.benchmarkResult.findMany({
      distinct: ["modelId"],
      select: { modelId: true },
    });
    const totalEvaluatedModels = distinctModelResults.length;

    const directoryItems: BenchmarkDirectoryItemDto[] = benchmarks.map((b) => {
      const distinctModels = new Set<string>();
      let latestDate: Date | null = null;

      for (const res of b.results) {
        distinctModels.add(res.modelId);
        const evalDate = res.evaluationDate ?? res.observedAt;
        if (!latestDate || evalDate > latestDate) {
          latestDate = evalDate;
        }
      }

      return {
        id: b.id,
        slug: b.slug,
        name: b.name,
        version: b.version,
        category: b.category,
        metricName: b.metricName,
        metricUnit: b.metricUnit,
        higherIsBetter: b.higherIsBetter,
        description: b.description,
        evaluatedModelCount: distinctModels.size,
        latestEvaluationDate: latestDate ? latestDate.toISOString() : null,
      };
    });

    return {
      benchmarks: directoryItems,
      categories,
      totalBenchmarks: directoryItems.length,
      totalEvaluatedModels,
      appliedFilters: {
        category: validated.category,
        q: validated.q,
      },
    };
    },
    60
  );
}

  /**
   * Fetch ranked model leaderboard for a specific benchmark.
   *
   * @param benchmarkSlug - Canonical benchmark identifier (e.g., 'mmlu_pro', 'livecodebench')
   * @param query - Filtering, pagination, and sorting options
   */
  async getLeaderboard(
    benchmarkSlug: string,
    query?: RankingsLeaderboardInputQuery
  ): Promise<BenchmarkLeaderboardResult | null> {
    const validated = RankingsLeaderboardQuerySchema.parse(query ?? {});
    const cacheKey = `${benchmarkSlug.toLowerCase()}:${JSON.stringify(validated)}`;

    return cacheService.getOrSet(
      "rankings",
      cacheKey,
      async () => {
        // 1. Fetch Benchmark Metadata
        const benchmark = await this.db.benchmark.findFirst({
      where: { slug: benchmarkSlug },
      orderBy: { version: "desc" },
    });

    if (!benchmark) {
      return null;
    }

    // 2. Query all results for this benchmark
    const rawResults = await this.db.benchmarkResult.findMany({
      where: { benchmarkId: benchmark.id },
      include: {
        model: {
          select: {
            id: true,
            slug: true,
            name: true,
            family: true,
            isReasoning: true,
            isOpenWeight: true,
            status: true,
            labs: {
              include: {
                aiLab: {
                  select: {
                    id: true,
                    slug: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        source: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });

    // 3. Deduplicate by modelId: keep the latest evaluationDate (or observedAt)
    const latestPerModel = new Map<string, (typeof rawResults)[number]>();
    for (const res of rawResults) {
      const existing = latestPerModel.get(res.modelId);
      if (!existing) {
        latestPerModel.set(res.modelId, res);
      } else {
        const existingDate = existing.evaluationDate ?? existing.observedAt;
        const resDate = res.evaluationDate ?? res.observedAt;
        if (resDate > existingDate) {
          latestPerModel.set(res.modelId, res);
        }
      }
    }

    const deduplicatedResults = Array.from(latestPerModel.values());

    // 4. Primary Sorting based on higherIsBetter to compute standard ranks
    deduplicatedResults.sort((a, b) => {
      const valA = parseFloat(a.metricValue.toString());
      const valB = parseFloat(b.metricValue.toString());

      if (valA !== valB) {
        return benchmark.higherIsBetter ? valB - valA : valA - valB;
      }

      // Tie-breaker: latest evaluation date
      const dateA = (a.evaluationDate ?? a.observedAt).getTime();
      const dateB = (b.evaluationDate ?? b.observedAt).getTime();
      if (dateA !== dateB) {
        return dateB - dateA;
      }

      return a.model.name.localeCompare(b.model.name);
    });

    // 5. Assign Standard Competition Ranking ("1224")
    interface RankedItem {
      rank: number;
      item: (typeof rawResults)[number];
      numScore: number;
    }

    const rankedItems: RankedItem[] = [];
    let currentRank = 1;

    for (let i = 0; i < deduplicatedResults.length; i++) {
      const current = deduplicatedResults[i];
      const currentVal = parseFloat(current.metricValue.toString());

      if (i > 0) {
        const prev = deduplicatedResults[i - 1];
        const prevVal = parseFloat(prev.metricValue.toString());

        if (currentVal === prevVal) {
          // Tie: same rank as previous
          rankedItems.push({
            rank: currentRank,
            item: current,
            numScore: currentVal,
          });
          continue;
        } else {
          // Next rank skips according to position (1224 ranking)
          currentRank = i + 1;
        }
      }

      rankedItems.push({
        rank: currentRank,
        item: current,
        numScore: currentVal,
      });
    }

    // 6. Apply filters (search and lab)
    let filtered = rankedItems;

    if (validated.q) {
      const queryLower = validated.q.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.item.model.name.toLowerCase().includes(queryLower) ||
          entry.item.model.slug.toLowerCase().includes(queryLower) ||
          (entry.item.model.family &&
            entry.item.model.family.toLowerCase().includes(queryLower))
      );
    }

    if (validated.lab) {
      const labFilterLower = validated.lab.toLowerCase();
      filtered = filtered.filter((entry) =>
        entry.item.model.labs.some(
          (ml) =>
            ml.aiLab.slug.toLowerCase() === labFilterLower ||
            ml.aiLab.name.toLowerCase() === labFilterLower
        )
      );
    }

    // 7. Apply optional user sort override
    if (validated.sort) {
      switch (validated.sort) {
        case "rank_asc":
          filtered.sort((a, b) => a.rank - b.rank);
          break;
        case "rank_desc":
          filtered.sort((a, b) => b.rank - a.rank);
          break;
        case "score_desc":
          filtered.sort((a, b) => b.numScore - a.numScore);
          break;
        case "score_asc":
          filtered.sort((a, b) => a.numScore - b.numScore);
          break;
        case "name_asc":
          filtered.sort((a, b) => a.item.model.name.localeCompare(b.item.model.name));
          break;
        case "name_desc":
          filtered.sort((a, b) => b.item.model.name.localeCompare(a.item.model.name));
          break;
      }
    }

    // 8. Pagination calculation
    const page = validated.page;
    const limit = validated.limit;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedSlice = filtered.slice(offset, offset + limit);

    // 9. Map to DTOs
    const rankings: RankedModelItemDto[] = paginatedSlice.map((entry) => {
      const { item, rank, numScore } = entry;
      const primaryLab =
        item.model.labs.find((l) => l.relationshipType === "CREATOR")?.aiLab ||
        item.model.labs[0]?.aiLab ||
        null;

      return {
        rank,
        model: {
          id: item.model.id,
          slug: item.model.slug,
          name: item.model.name,
          family: item.model.family,
          isReasoning: item.model.isReasoning,
          isOpenWeight: item.model.isOpenWeight,
        },
        lab: primaryLab
          ? {
              id: primaryLab.id,
              slug: primaryLab.slug,
              name: primaryLab.name,
            }
          : null,
        score: item.metricValue.toString(),
        numScore,
        metricUnit: benchmark.metricUnit,
        evaluationDate: item.evaluationDate
          ? item.evaluationDate.toISOString()
          : null,
        modelVersion: item.modelVersion,
        sampleSize: item.sampleSize,
        source: item.source
          ? {
              slug: item.source.slug,
              name: item.source.name,
            }
          : null,
      };
    });

    // Determine latest evaluation date for the benchmark
    let latestBenchmarkDate: Date | null = null;
    for (const res of deduplicatedResults) {
      const date = res.evaluationDate ?? res.observedAt;
      if (!latestBenchmarkDate || date > latestBenchmarkDate) {
        latestBenchmarkDate = date;
      }
    }

    return {
      benchmark: {
        id: benchmark.id,
        slug: benchmark.slug,
        name: benchmark.name,
        version: benchmark.version,
        category: benchmark.category,
        metricName: benchmark.metricName,
        metricUnit: benchmark.metricUnit,
        higherIsBetter: benchmark.higherIsBetter,
        description: benchmark.description,
        evaluatedModelCount: deduplicatedResults.length,
        latestEvaluationDate: latestBenchmarkDate
          ? latestBenchmarkDate.toISOString()
          : null,
      },
      rankings,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      appliedFilters: {
        benchmarkSlug,
        q: validated.q,
        lab: validated.lab,
        page,
        limit,
        sort: validated.sort,
      },
    };
    },
    60
  );
}
}

export const rankingsQueryService = new RankingsQueryService();
