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
 * Model Comparison Query Service (Phase 4E / Task 5)
 *
 * Compares 2 to 4 canonical AI models side-by-side:
 * - Validates model slug constraints and uniqueness
 * - Aggregates specs, providers, pricing offers, and benchmark matrices
 * - Avoids N+1 queries by executing indexed multi-model queries concurrently
 * - Aligns benchmark evaluations with direction-aware leader computation
 * - Computes pricing advantages and context window leadership
 */
export class CompareQueryService implements ICompareQueryService {
  constructor(
    private readonly modelDetailService: IModelDetailQueryService = modelDetailQueryService
  ) {}

  /**
   * Compare 2 to 4 models by their canonical slugs
   *
   * @param request - Validated or unvalidated comparison request containing 2-4 unique slugs
   * @returns ModelComparisonDto containing detailed models, aligned benchmarks, and specs summary
   */
  async compareModels(request: CompareRequest): Promise<ModelComparisonDto> {
    // 1. Enforce strict validation
    const { modelSlugs } = CompareRequestSchema.parse(request);

    // 2. Fetch canonical details concurrently (parallel indexed queries)
    const modelsOrNull = await Promise.all(
      modelSlugs.map((slug) => this.modelDetailService.getModelDetails(slug))
    );

    // 3. Detect any missing models while preserving order
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

    // 4. Align benchmarks across all requested models
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

    // Build benchmark rows with leader highlighting
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

      // Mark leader score
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

    // Order benchmark rows: Category ascending, Benchmark name ascending
    benchmarkRows.sort((a, b) => {
      const catComp = a.benchmark.category.localeCompare(b.benchmark.category);
      if (catComp !== 0) return catComp;
      return a.benchmark.name.localeCompare(b.benchmark.name);
    });

    // 5. Compute summary specs and pricing advantages
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
