import { Badge } from "@/components/ui/badge";
import { formatContextWindow, formatDate } from "@/lib/formatters";
import type { ModelDetailDto, ModelComparisonSpecsSummaryDto } from "@oneatlas/backend/shared";
import {
  Sparkles,
  Layers,
  ShieldCheck,
  Lock,
  Cpu,
  Calendar,
  Clock,
  BookOpen,
  Award,
} from "lucide-react";

export interface ComparisonSpecificationTableProps {
  models: ModelDetailDto[];
  specsSummary?: ModelComparisonSpecsSummaryDto;
}

export function ComparisonSpecificationTable({
  models,
  specsSummary,
}: ComparisonSpecificationTableProps) {
  // Helper to determine column grid classes based on model count
  const getGridCols = () => {
    switch (models.length) {
      case 2:
        return "grid-cols-3"; // 1 label + 2 models
      case 3:
        return "grid-cols-4"; // 1 label + 3 models
      case 4:
        return "grid-cols-5"; // 1 label + 4 models
      default:
        return "grid-cols-3";
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
      <div className="p-4 border-b border-border/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">
            Technical Specifications & Architecture
          </h3>
        </div>
        <span className="text-xs text-text-tertiary">
          Side-by-side spec comparison
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px] divide-y divide-border/50 text-xs">
          {/* Header Row */}
          <div className={`grid ${getGridCols()} bg-surface-elevated/40 font-semibold text-text-primary p-3`}>
            <div>Specification</div>
            {models.map((m) => (
              <div key={m.slug} className="truncate px-2 font-mono text-[11px]">
                {m.name}
              </div>
            ))}
          </div>

          {/* Context Window */}
          <div className={`grid ${getGridCols()} p-3 items-center hover:bg-surface-elevated/20 transition-colors`}>
            <div className="font-medium text-text-secondary flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-text-tertiary" />
              <span>Context Window</span>
            </div>
            {models.map((m) => {
              const isLargest = specsSummary?.largestContextSlug === m.slug && models.length > 1;
              return (
                <div key={m.slug} className="px-2 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-text-primary">
                    {formatContextWindow(m.contextWindow)}
                  </span>
                  {isLargest && (
                    <Badge variant="accent" className="text-[10px] gap-1 px-1.5 py-0">
                      <Award className="h-2.5 w-2.5" />
                      <span>Largest</span>
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Max Output Tokens */}
          <div className={`grid ${getGridCols()} p-3 items-center hover:bg-surface-elevated/20 transition-colors`}>
            <div className="font-medium text-text-secondary flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-text-tertiary" />
              <span>Max Output Limit</span>
            </div>
            {models.map((m) => {
              const isMaxLeader = specsSummary?.maxOutputTokensLeaderSlug === m.slug && models.length > 1;
              return (
                <div key={m.slug} className="px-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-text-primary">
                    {m.maxOutputTokens ? `${m.maxOutputTokens.toLocaleString()} tokens` : "—"}
                  </span>
                  {isMaxLeader && (
                    <Badge variant="accent" className="text-[10px] gap-1 px-1.5 py-0">
                      <Award className="h-2.5 w-2.5" />
                      <span>Highest</span>
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Reasoning */}
          <div className={`grid ${getGridCols()} p-3 items-center hover:bg-surface-elevated/20 transition-colors`}>
            <div className="font-medium text-text-secondary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-text-tertiary" />
              <span>Reasoning Model</span>
            </div>
            {models.map((m) => (
              <div key={m.slug} className="px-2">
                {m.isReasoning ? (
                  <Badge variant="accent" className="text-[11px] gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>Reasoning</span>
                  </Badge>
                ) : (
                  <span className="text-text-tertiary">Standard (Non-reasoning)</span>
                )}
              </div>
            ))}
          </div>

          {/* Weights & Licensing */}
          <div className={`grid ${getGridCols()} p-3 items-center hover:bg-surface-elevated/20 transition-colors`}>
            <div className="font-medium text-text-secondary flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-text-tertiary" />
              <span>Weights / Access</span>
            </div>
            {models.map((m) => (
              <div key={m.slug} className="px-2">
                {m.isOpenWeight ? (
                  <Badge variant="success" className="text-[11px] gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Open Weights</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px] gap-1 text-text-tertiary">
                    <Lock className="h-3 w-3" />
                    <span>Proprietary</span>
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* License */}
          <div className={`grid ${getGridCols()} p-3 items-center hover:bg-surface-elevated/20 transition-colors`}>
            <div className="font-medium text-text-secondary flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-text-tertiary" />
              <span>License</span>
            </div>
            {models.map((m) => (
              <div key={m.slug} className="px-2 font-mono text-[11px] text-text-primary">
                {m.license || "Proprietary"}
              </div>
            ))}
          </div>

          {/* Architecture Type */}
          <div className={`grid ${getGridCols()} p-3 items-center hover:bg-surface-elevated/20 transition-colors`}>
            <div className="font-medium text-text-secondary flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-text-tertiary" />
              <span>Architecture</span>
            </div>
            {models.map((m) => (
              <div key={m.slug} className="px-2 font-mono text-text-primary">
                {m.architectureType || "Transformer"}
              </div>
            ))}
          </div>

          {/* Input Modalities */}
          <div className={`grid ${getGridCols()} p-3 items-center hover:bg-surface-elevated/20 transition-colors`}>
            <div className="font-medium text-text-secondary">Input Modalities</div>
            {models.map((m) => (
              <div key={m.slug} className="px-2 flex items-center gap-1 flex-wrap">
                {m.inputModalities.length > 0 ? (
                  m.inputModalities.map((mod) => (
                    <span
                      key={mod}
                      className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-text-secondary"
                    >
                      {mod}
                    </span>
                  ))
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </div>
            ))}
          </div>

          {/* Output Modalities */}
          <div className={`grid ${getGridCols()} p-3 items-center hover:bg-surface-elevated/20 transition-colors`}>
            <div className="font-medium text-text-secondary">Output Modalities</div>
            {models.map((m) => (
              <div key={m.slug} className="px-2 flex items-center gap-1 flex-wrap">
                {m.outputModalities.length > 0 ? (
                  m.outputModalities.map((mod) => (
                    <span
                      key={mod}
                      className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-text-secondary"
                    >
                      {mod}
                    </span>
                  ))
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </div>
            ))}
          </div>

          {/* Knowledge Cutoff */}
          <div className={`grid ${getGridCols()} p-3 items-center hover:bg-surface-elevated/20 transition-colors`}>
            <div className="font-medium text-text-secondary flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-text-tertiary" />
              <span>Knowledge Cutoff</span>
            </div>
            {models.map((m) => (
              <div key={m.slug} className="px-2 text-text-primary">
                {m.knowledgeCutoff || "—"}
              </div>
            ))}
          </div>

          {/* Release Date */}
          <div className={`grid ${getGridCols()} p-3 items-center hover:bg-surface-elevated/20 transition-colors`}>
            <div className="font-medium text-text-secondary flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
              <span>Release Date</span>
            </div>
            {models.map((m) => (
              <div key={m.slug} className="px-2 text-text-primary">
                {formatDate(m.releaseDate)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
