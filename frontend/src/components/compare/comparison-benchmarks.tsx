import { Badge } from "@/components/ui/badge";
import type { ModelDetailDto, ComparisonBenchmarkRowDto } from "@oneatlas/backend/shared";
import { BarChart3, Trophy, Info, ArrowUpRight } from "lucide-react";

export interface ComparisonBenchmarksProps {
  models: ModelDetailDto[];
  benchmarks: ComparisonBenchmarkRowDto[];
}

export function ComparisonBenchmarks({ models, benchmarks }: ComparisonBenchmarksProps) {
  const getGridCols = () => {
    switch (models.length) {
      case 2:
        return "grid-cols-3";
      case 3:
        return "grid-cols-4";
      case 4:
        return "grid-cols-5";
      default:
        return "grid-cols-3";
    }
  };

  // Group benchmark rows by category
  const categories = Array.from(new Set(benchmarks.map((b) => b.benchmark.category || "General")));

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs space-y-4">
      <div className="p-4 border-b border-border/70 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">
            Standardized Benchmark Scorecards
          </h3>
        </div>
        <span className="text-xs text-text-tertiary">
          Objective evaluation metrics and leader tracking
        </span>
      </div>

      {benchmarks.length === 0 ? (
        <div className="p-8 text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated text-text-tertiary">
            <Info className="h-5 w-5" />
          </div>
          <h4 className="text-xs font-semibold text-text-primary">
            No Ingested Benchmark Data Available Yet
          </h4>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            Benchmark scorecards (MMLU, HumanEval, GSM8K, MATH) will automatically align side-by-side once evaluated by our ingestion pipeline.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[700px] divide-y divide-border/50 text-xs">
            {/* Header */}
            <div className={`grid ${getGridCols()} bg-surface-elevated/40 font-semibold text-text-primary p-3`}>
              <div>Benchmark / Metric</div>
              {models.map((m) => (
                <div key={m.slug} className="truncate px-2 font-mono text-[11px]">
                  {m.name}
                </div>
              ))}
            </div>

            {categories.map((cat) => {
              const catBenchmarks = benchmarks.filter(
                (b) => (b.benchmark.category || "General") === cat
              );

              return (
                <div key={cat} className="divide-y divide-border/30">
                  {/* Category Header */}
                  <div className="bg-surface-elevated/20 px-3 py-1.5 font-semibold text-[11px] text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <span>{cat}</span>
                  </div>

                  {catBenchmarks.map((row) => (
                    <div
                      key={row.benchmark.slug}
                      className={`grid ${getGridCols()} p-3 items-center hover:bg-surface-elevated/20 transition-colors`}
                    >
                      {/* Benchmark description */}
                      <div className="space-y-0.5">
                        <div className="font-semibold text-text-primary flex items-center gap-1.5">
                          <span>{row.benchmark.name}</span>
                          <span className="text-[10px] text-text-tertiary">
                            ({row.benchmark.metricUnit})
                          </span>
                        </div>
                        <div className="text-[10px] text-text-tertiary flex items-center gap-1">
                          <ArrowUpRight className="h-2.5 w-2.5" />
                          <span>
                            {row.benchmark.higherIsBetter ? "Higher is better" : "Lower is better"}
                          </span>
                        </div>
                      </div>

                      {/* Model Scores */}
                      {models.map((model) => {
                        const score = row.scores[model.slug];
                        const isLeader = score?.isLeader && models.length > 1;

                        return (
                          <div key={model.slug} className="px-2">
                            {score ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`font-mono text-sm font-bold ${
                                    isLeader ? "text-emerald-400" : "text-text-primary"
                                  }`}
                                >
                                  {score.value}
                                  {row.benchmark.metricUnit === "%" ? "%" : ""}
                                </span>
                                {isLeader && (
                                  <Badge
                                    variant="success"
                                    className="text-[10px] gap-1 px-1 py-0"
                                  >
                                    <Trophy className="h-2.5 w-2.5" />
                                    <span>Top</span>
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-text-tertiary italic text-[11px]">
                                Not evaluated
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
