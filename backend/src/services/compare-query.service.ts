import { modelDetailQueryService, ModelDetailQueryService } from "./model-detail-query.service";
import type { IModelDetailQueryService, ICompareQueryService } from "./contracts/index";
import { CompareRequestSchema, type CompareRequest } from "../shared/schemas/api";
import type {
  ModelComparisonDto,
  ComparisonBenchmarkRowDto,
  ComparisonBenchmarkScoreDto,
  ModelDetailDto,
} from "../shared/types/api";

/**
 * Service for multi-model comparative analysis.
 *
 * Compares 2 to 4 canonical AI models side-by-side:
 * - Validates model slug constraints and uniqueness.
 * - Concurrently aggregates specifications, provider endpoints, and benchmark evaluations.
 * - Aligns benchmark evaluations with direction-aware (`higherIsBetter`) leader computation.
 * - Computes pricing advantages and context window leadership across the compared cohort.
 */
export class CompareQueryService implements ICompareQueryService {
  constructor(
    private readonly modelDetailService: IModelDetailQueryService = modelDetailQueryService
  ) {}

  /**
   * Compares 2 to 4 models side-by-side by their canonical slugs.
   *
   * Fetches full model profiles in parallel, aligns benchmark scores across all models,
   * calculates leaders per benchmark metric, and determines specification leaders.
   *
   * @param request - Validated comparison request containing 2-4 unique model slugs.
   * @returns Comprehensive comparison matrix including aligned models, benchmarks, and specs.
   * @throws Error if any requested model slug is not found.
   */
  async compareModels(request: CompareRequest): Promise<ModelComparisonDto> {
    const { modelSlugs } = CompareRequestSchema.parse(request);

    // Fetch details for all requested models concurrently
    const modelsOrNull = await Promise.all(
      modelSlugs.map((slug) => this.modelDetailService.getModelDetails(slug))
    );

    // Ensure all requested models exist, maintaining user request ordering
    const missingSlugs: string[] = [];
    modelSlugs.forEach((slug, idx) => {
      if (!modelsOrNull[idx]) {
        missingSlugs.push(slug);
      }
    });

    if (missingSlugs.length > 0) {
      throw new Error(`The following requested models were not found: ${missingSlugs.join(", ")}`);
    }

    const models = modelsOrNull as ModelDetailDto[];

    // Index and align benchmark results across all models in the comparison cohort
    const benchmarkMap = new Map<
      string,
      {
        benchmark: ComparisonBenchmarkRowDto["benchmark"];
        scores: Record<string, ComparisonBenchmarkScoreDto | null>;
      }
    >();

    for (const model of models) {
      for (const br of model.benchmarks) {
        const bSlug = br.benchmark.slug;
        if (!benchmarkMap.has(bSlug)) {
          benchmarkMap.set(bSlug, {
            benchmark: {
              slug: br.benchmark.slug,
              name: br.benchmark.name,
              version: br.benchmark.version,
              category: br.benchmark.category,
              metricName: br.benchmark.metricName,
              metricUnit: br.benchmark.metricUnit,
              higherIsBetter: br.benchmark.higherIsBetter,
            },
            scores: {},
          });
        }

        const entry = benchmarkMap.get(bSlug)!;
        const numVal = parseFloat(br.result.value);
        entry.scores[model.slug] = {
          value: br.result.value,
          numValue: isNaN(numVal) ? 0 : numVal,
          evaluationDate: br.result.evaluationDate,
          modelVersion: br.result.modelVersion,
          sourceUrl: br.result.sourceUrl,
          notes: br.result.notes,
          sourceName: br.source?.name,
        };
      }
    }

    // Build benchmark rows and determine the leader based on metric directionality
    const benchmarkRows: ComparisonBenchmarkRowDto[] = [];
    for (const entry of benchmarkMap.values()) {
      let bestSlug: string | null = null;
      let bestScore: number | null = null;

      for (const model of models) {
        const score = entry.scores[model.slug] ?? null;
        entry.scores[model.slug] = score;

        if (score && !isNaN(score.numValue)) {
          if (bestScore === null) {
            bestScore = score.numValue;
            bestSlug = model.slug;
          } else if (entry.benchmark.higherIsBetter) {
            if (score.numValue > bestScore) {
              bestScore = score.numValue;
              bestSlug = model.slug;
            }
          } else {
            if (score.numValue < bestScore) {
              bestScore = score.numValue;
              bestSlug = model.slug;
            }
          }
        }
      }

      if (bestSlug) {
        for (const model of models) {
          const score = entry.scores[model.slug];
          if (score && model.slug === bestSlug) {
            score.isLeader = true;
          }
        }
      }

      benchmarkRows.push({
        benchmark: entry.benchmark,
        scores: entry.scores,
        bestModelSlug: bestSlug,
      });
    }

    // Sort benchmark rows alphabetically by category, then by benchmark name
    benchmarkRows.sort((a, b) => {
      const catComp = a.benchmark.category.localeCompare(b.benchmark.category);
      if (catComp !== 0) return catComp;
      return a.benchmark.name.localeCompare(b.benchmark.name);
    });

    // Calculate leadership across hardware specs and lowest available pricing
    let cheapestInputSlug: string | null = null;
    let lowestInputPrice: number | null = null;
    let cheapestOutputSlug: string | null = null;
    let lowestOutputPrice: number | null = null;
    let largestContextSlug: string | null = null;
    let maxContextWindow: number | null = null;
    let maxOutputTokensLeaderSlug: string | null = null;
    let maxOutputTokens: number | null = null;

    for (const model of models) {
      if (model.pricingSummary?.lowestInput?.amount) {
        const val = parseFloat(model.pricingSummary.lowestInput.amount);
        if (!isNaN(val) && (lowestInputPrice === null || val < lowestInputPrice)) {
          lowestInputPrice = val;
          cheapestInputSlug = model.slug;
        }
      }
      if (model.pricingSummary?.lowestOutput?.amount) {
        const val = parseFloat(model.pricingSummary.lowestOutput.amount);
        if (!isNaN(val) && (lowestOutputPrice === null || val < lowestOutputPrice)) {
          lowestOutputPrice = val;
          cheapestOutputSlug = model.slug;
        }
      }
      if (model.contextWindow !== null && (maxContextWindow === null || model.contextWindow > maxContextWindow)) {
        maxContextWindow = model.contextWindow;
        largestContextSlug = model.slug;
      }
      if (model.maxOutputTokens !== null && (maxOutputTokens === null || model.maxOutputTokens > maxOutputTokens)) {
        maxOutputTokens = model.maxOutputTokens;
        maxOutputTokensLeaderSlug = model.slug;
      }
    }

    return {
      models,
      comparisonMatrix: {
        benchmarks: benchmarkRows,
        specsSummary: {
          cheapestInputSlug,
          cheapestOutputSlug,
          largestContextSlug,
          maxOutputTokensLeaderSlug,
        },
      },
    };
  }
}

export const compareQueryService = new CompareQueryService();
