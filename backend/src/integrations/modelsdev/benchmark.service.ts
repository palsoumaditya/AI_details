import { PrismaClient, Benchmark, BenchmarkCategory, MetricUnit, Prisma } from "@oneatlas/database";
import type { ModelsDevRawBenchmark } from "./types";

/**
 * Standard mapping for known seed benchmark slugs.
 */
const KNOWN_BENCHMARK_MAPPINGS: Record<string, string> = {
  "gpqa": "gpqa",
  "gpqa diamond": "gpqa",
  "gpqa-diamond": "gpqa",
  "mmlu-pro": "mmlu_pro",
  "mmlu_pro": "mmlu_pro",
  "mmmu pro": "mmlu_pro",
  "mmlu": "mmlu_pro",
  "livecodebench": "livecodebench",
  "livecodebench pro": "livecodebench",
  "livecodebench v6": "livecodebench",
  "output token speed": "throughput",
  "throughput": "throughput",
};

export class BenchmarkService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolves or dynamically registers a Benchmark definition.
   */
  async resolveOrCreateBenchmark(
    raw: ModelsDevRawBenchmark,
    db: Prisma.TransactionClient | PrismaClient = this.prisma
  ): Promise<Benchmark | null> {
    if (!raw.name || typeof raw.name !== "string" || raw.name.trim() === "") {
      return null;
    }

    const nameClean = raw.name.trim();
    const nameLower = nameClean.toLowerCase();
    const version = (raw as Record<string, unknown>).version
      ? String((raw as Record<string, unknown>).version)
      : "1.0";

    // 1. Check known mappings
    let targetSlug = KNOWN_BENCHMARK_MAPPINGS[nameLower];

    if (!targetSlug) {
      targetSlug = nameLower
        .replace(/[^a-z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 48);
    }

    // 2. Query existing benchmark by slug and version
    const existing = await db.benchmark.findUnique({
      where: {
        slug_version: {
          slug: targetSlug,
          version,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Also check if any version of this slug exists
    const existingBySlug = await db.benchmark.findFirst({
      where: { slug: targetSlug },
    });

    if (existingBySlug) {
      return existingBySlug;
    }

    // 3. Infer category
    let category: BenchmarkCategory = "KNOWLEDGE";
    const metricStr = (raw.metric || "").toLowerCase();

    if (/code|swe|coding|aider|repo|program/.test(nameLower) || /resolve rate|pass@/.test(metricStr)) {
      category = "CODING";
    } else if (/math|algebra|geometry|aime|scicode/.test(nameLower)) {
      category = "MATH";
    } else if (/reason|gpqa|exam|logic|think|hle/.test(nameLower)) {
      category = "REASONING";
    } else if (/speed|throughput|token.*sec|latency/.test(nameLower) || /token.*sec/.test(metricStr)) {
      category = "SPEED";
    } else if (/vision|multimodal|mmmu|image|audio|video|ocr/.test(nameLower)) {
      category = "MULTIMODAL";
    }

    // 4. Infer metric unit
    let metricUnit: MetricUnit = "PERCENTAGE";
    if (/elo/i.test(metricStr) || /elo/i.test(nameLower)) {
      metricUnit = "SCORE";
    } else if (/index score|score|points/i.test(metricStr)) {
      metricUnit = "SCORE";
    } else if (/tokens?(\/|_|\s*)sec/i.test(metricStr)) {
      metricUnit = "TOKENS_PER_SEC";
    } else if (/ms|milliseconds/i.test(metricStr)) {
      metricUnit = "MILLISECONDS";
    } else if (/accuracy|rate|pass|percent|resolved/i.test(metricStr)) {
      metricUnit = "PERCENTAGE";
    }

    // 5. Create new Benchmark definition
    return db.benchmark.create({
      data: {
        slug: targetSlug,
        version,
        name: nameClean,
        category,
        metricName: raw.metric && raw.metric !== "undefined" ? raw.metric : "Accuracy",
        metricUnit,
        higherIsBetter: true,
        description: `Evaluation scores for ${nameClean} across leading frontier and open-weight models.`,
      },
    });
  }

  /**
   * Ingests benchmark evaluations for a canonical model from Models.dev metadata.
   */
  async ingestModelBenchmarks(
    modelId: string,
    sourceId: string,
    benchmarks: ModelsDevRawBenchmark[] | null | undefined,
    db: Prisma.TransactionClient | PrismaClient = this.prisma
  ): Promise<number> {
    if (!benchmarks || !Array.isArray(benchmarks) || benchmarks.length === 0) {
      return 0;
    }

    let insertedOrUpdated = 0;

    for (const b of benchmarks) {
      if (b.score === undefined || b.score === null || isNaN(Number(b.score))) {
        continue;
      }

      try {
        const benchmark = await this.resolveOrCreateBenchmark(b, db);
        if (!benchmark) continue;

        const metricValue = new Prisma.Decimal(b.score);
        const rawDate = (b as Record<string, unknown>).date;
        let evaluationDate: Date | null = null;
        if (typeof rawDate === "string") {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) evaluationDate = d;
        }

        const variant = (b as Record<string, unknown>).variant;
        const notes = variant ? `Variant: ${variant}` : null;
        const version = (b as Record<string, unknown>).version
          ? String((b as Record<string, unknown>).version)
          : null;

        // Check if an existing result exists for this model, benchmark, and source
        const existingResult = await db.benchmarkResult.findFirst({
          where: {
            modelId,
            benchmarkId: benchmark.id,
            sourceId,
          },
        });

        if (existingResult) {
          // Update if score or date changed
          if (!existingResult.metricValue.equals(metricValue)) {
            await db.benchmarkResult.update({
              where: { id: existingResult.id },
              data: {
                metricValue,
                evaluationDate: evaluationDate ?? existingResult.evaluationDate,
                sourceUrl: b.source || existingResult.sourceUrl,
                notes: notes ?? existingResult.notes,
                modelVersion: version ?? existingResult.modelVersion,
              },
            });
            insertedOrUpdated++;
          }
        } else {
          await db.benchmarkResult.create({
            data: {
              modelId,
              benchmarkId: benchmark.id,
              sourceId,
              metricValue,
              evaluationDate,
              sourceUrl: b.source || null,
              notes,
              modelVersion: version,
            },
          });
          insertedOrUpdated++;
        }
      } catch (err) {
        console.warn(`[BenchmarkService] Failed to ingest benchmark '${b.name}' for model '${modelId}':`, err);
      }
    }

    return insertedOrUpdated;
  }
}
