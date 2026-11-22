import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { RankedModelItemDto } from "@oneatlas/backend/shared";
import { formatDate } from "@/lib/formatters";
import {
  Trophy,
  Medal,
  Brain,
  Code,
  ArrowRight,
  Calendar,
} from "lucide-react";

export interface LeaderboardTableProps {
  rankings: RankedModelItemDto[];
  metricName: string;
  metricUnit: string;
  higherIsBetter: boolean;
  benchmarkSlug: string;
}

export function LeaderboardTable({
  rankings,
  metricName,
  metricUnit,
}: LeaderboardTableProps) {
  if (rankings.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="h-6 w-6 text-text-tertiary" />}
        title="No evaluations recorded yet"
        description="There are currently no synchronized model evaluations for this benchmark. Scores will be populated as benchmark results are ingested."
        actionLabel="Browse Model Catalog"
        actionHref="/models"
      />
    );
  }

  const formatUnit = (unit: string) => {
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

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-white border border-slate-900 shadow-xs">
          <Trophy className="h-3.5 w-3.5 text-white shrink-0" />
          <span>#1</span>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 shadow-xs">
          <Medal className="h-3.5 w-3.5 text-slate-600 shrink-0" />
          <span>#2</span>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-slate-700 border border-slate-200 shadow-xs">
          <Medal className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>#3</span>
        </div>
      );
    }
    return (
      <span className="font-mono text-xs font-medium text-text-tertiary px-2 py-0.5">
        #{rank}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-xs">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-white text-text-secondary text-xs uppercase tracking-wider font-mono">
            <th className="py-3 px-4 w-20 text-center">Rank</th>
            <th className="py-3 px-4 min-w-[200px]">Model</th>
            <th className="py-3 px-4 min-w-[140px]">AI Lab</th>
            <th className="py-3 px-4 text-right min-w-[120px]">
              {metricName} ({formatUnit(metricUnit)})
            </th>
            <th className="py-3 px-4 min-w-[130px] hidden md:table-cell">Evaluated</th>
            <th className="py-3 px-4 min-w-[130px] hidden lg:table-cell">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rankings.map((item, idx) => {
            return (
              <tr
                key={`${item.model.id}-${item.rank}-${idx}`}
                className="transition-colors hover:bg-slate-100/60"
              >
                {/* Rank */}
                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                  {renderRankBadge(item.rank)}
                </td>

                {/* Model Name & Attributes */}
                <td className="py-3.5 px-4">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/models/${item.model.slug}`}
                      className="group font-medium text-text-primary hover:text-accent transition-colors flex items-center gap-1.5 flex-wrap"
                    >
                      <span className="text-sm font-semibold">{item.model.name}</span>
                      <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent shrink-0" />
                    </Link>

                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="font-mono text-[11px] text-text-tertiary">
                        {item.model.slug}
                      </span>
                      {item.model.isReasoning && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 gap-1 bg-slate-100 text-slate-700 border-slate-200"
                        >
                          <Brain className="h-2.5 w-2.5" />
                          <span>Reasoning</span>
                        </Badge>
                      )}
                      {item.model.isOpenWeight && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 gap-1 bg-slate-100 text-slate-700 border-slate-200"
                        >
                          <Code className="h-2.5 w-2.5" />
                          <span>Open</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </td>

                {/* AI Lab */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {item.lab ? (
                    <Link
                      href={`/labs/${item.lab.slug}`}
                      className="text-xs text-text-secondary hover:text-accent font-medium transition-colors"
                    >
                      {item.lab.name}
                    </Link>
                  ) : (
                    <span className="text-xs text-text-tertiary">—</span>
                  )}
                </td>

                {/* Score */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <div className="inline-flex flex-col items-end">
                    <span className="font-mono font-bold text-base text-text-primary">
                      {item.score}
                      {metricUnit === "PERCENTAGE" && (
                        <span className="text-xs text-text-secondary font-normal ml-0.5">
                          %
                        </span>
                      )}
                    </span>
                    {item.modelVersion && (
                      <span className="text-[10px] font-mono text-text-tertiary">
                        v{item.modelVersion}
                      </span>
                    )}
                  </div>
                </td>

                {/* Evaluated Date */}
                <td className="py-3.5 px-4 whitespace-nowrap text-xs text-text-secondary hidden md:table-cell">
                  {item.evaluationDate ? (
                    <div className="flex items-center gap-1 text-text-tertiary">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(item.evaluationDate)}</span>
                    </div>
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </td>

                {/* Source Attribution */}
                <td className="py-3.5 px-4 whitespace-nowrap text-xs hidden lg:table-cell">
                  {item.source ? (
                    <span className="text-text-secondary font-mono text-[11px]">
                      {item.source.name}
                    </span>
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LeaderboardTableSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-4 animate-pulse">
      <div className="h-10 rounded bg-surface-elevated" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-surface-elevated/60" />
      ))}
    </div>
  );
}
