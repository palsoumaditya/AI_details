import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { BenchmarkDirectoryItemDto } from "@oneatlas/backend/shared";
import { formatDate } from "@/lib/formatters";
import {
  Trophy,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Calendar,
} from "lucide-react";

export interface BenchmarkCardProps {
  benchmark: BenchmarkDirectoryItemDto;
}

export function BenchmarkCard({ benchmark }: BenchmarkCardProps) {
  const formatUnitDisplay = (unit: string) => {
    switch (unit) {
      case "PERCENTAGE":
        return "%";
      case "TOKENS_PER_SEC":
        return "tok/s";
      case "MILLISECONDS":
        return "ms";
      default:
        return unit.toLowerCase();
    }
  };

  return (
    <Link href={`/rankings/${benchmark.slug}`} className="block group h-full">
      <Card
        hover
        className="h-full flex flex-col justify-between transition-all duration-200 border-border hover:border-text-tertiary bg-surface p-5"
      >
        <div className="space-y-3">
          {/* Header with Title and Category */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all duration-200 shadow-2xs">
                <Trophy className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors flex items-center gap-1.5">
                  <span>{benchmark.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent shrink-0" />
                </h3>
                <div className="flex items-center gap-2 text-xs font-mono text-text-tertiary">
                  <span>{benchmark.slug}</span>
                  <span>•</span>
                  <span>v{benchmark.version}</span>
                </div>
              </div>
            </div>

            <Badge variant="accent" className="text-[10px] uppercase font-mono shrink-0">
              {benchmark.category}
            </Badge>
          </div>

          {/* Description */}
          {benchmark.description && (
            <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed pt-1">
              {benchmark.description}
            </p>
          )}

          {/* Metric Specifications & Direction */}
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <Badge variant="outline" className="text-[11px] gap-1">
              <span>{benchmark.metricName}</span>
              <span className="text-text-tertiary font-mono">
                ({formatUnitDisplay(benchmark.metricUnit)})
              </span>
            </Badge>

            {benchmark.higherIsBetter ? (
              <Badge variant="outline" className="text-[11px] gap-1 text-emerald-400 border-emerald-500/20 bg-emerald-500/10">
                <TrendingUp className="h-3 w-3" />
                <span>Higher is better</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px] gap-1 text-sky-400 border-sky-500/20 bg-sky-500/10">
                <TrendingDown className="h-3 w-3" />
                <span>Lower is better</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Footer with Evaluated Models count and Date */}
        <div className="flex items-center justify-between text-xs text-text-tertiary pt-4 mt-4 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-text-tertiary" />
            <span>
              {benchmark.evaluatedModelCount === 1
                ? "1 model evaluated"
                : `${benchmark.evaluatedModelCount} models evaluated`}
            </span>
          </div>

          {benchmark.latestEvaluationDate && (
            <div className="flex items-center gap-1 text-[11px]">
              <Calendar className="h-3 w-3 text-text-tertiary" />
              <span>{formatDate(benchmark.latestEvaluationDate)}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

export function BenchmarkCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-surface-elevated" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 rounded bg-surface-elevated" />
            <div className="h-3 w-20 rounded bg-surface-elevated" />
          </div>
        </div>
        <div className="h-5 w-16 rounded bg-surface-elevated" />
      </div>
      <div className="h-8 rounded bg-surface-elevated" />
      <div className="flex gap-2">
        <div className="h-5 w-24 rounded bg-surface-elevated" />
        <div className="h-5 w-24 rounded bg-surface-elevated" />
      </div>
      <div className="pt-3 border-t border-border/50 flex justify-between">
        <div className="h-4 w-28 rounded bg-surface-elevated" />
        <div className="h-4 w-16 rounded bg-surface-elevated" />
      </div>
    </div>
  );
}
