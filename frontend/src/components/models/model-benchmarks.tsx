import { Badge } from "@/components/ui/badge";
import type { BenchmarkResultDto } from "@oneatlas/backend/shared";
import { Trophy, TrendingUp, ExternalLink } from "lucide-react";

export interface ModelBenchmarksProps {
  benchmarks: BenchmarkResultDto[];
}

export function ModelBenchmarks({ benchmarks }: ModelBenchmarksProps) {
  if (benchmarks.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-2">
        <Trophy className="h-6 w-6 text-text-tertiary mx-auto" />
        <h4 className="text-sm font-semibold text-text-primary">
          No benchmark scorecards recorded
        </h4>
        <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
          Standardized benchmark scores (MMLU-Pro, GPQA, LiveCodeBench, etc.) will appear here as evaluation datasets are synchronized into the intelligence platform.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {benchmarks.map((br) => {
        return (
          <div
            key={br.id || br.benchmark.slug}
            className="rounded-xl border border-border bg-surface p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h5 className="text-sm font-semibold text-text-primary">
                  {br.benchmark.name}
                </h5>
                <p className="text-[11px] font-mono text-text-tertiary">
                  v{br.benchmark.version}
                </p>
              </div>
              <Badge variant="accent" className="text-[10px] uppercase font-mono">
                {br.benchmark.category}
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1 border-t border-border/50">
              <div className="text-2xl font-bold text-text-primary tracking-tight">
                {br.result.value}
                {br.benchmark.metricUnit === "PERCENTAGE" && (
                  <span className="text-sm text-text-secondary font-normal">%</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
                <TrendingUp className="h-3 w-3 text-accent" />
                <span>{br.benchmark.metricName}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-2 border-t border-border/40">
              <span>Source: {br.source.name}</span>
              {br.result.sourceUrl && (
                <a
                  href={br.result.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent flex items-center gap-0.5 transition-colors"
                >
                  <span>Verify</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
