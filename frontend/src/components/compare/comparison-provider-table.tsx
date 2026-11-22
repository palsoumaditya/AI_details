import { Badge } from "@/components/ui/badge";
import type { ModelDetailDto } from "@oneatlas/backend/shared";
import { Server, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

export interface ComparisonProviderTableProps {
  models: ModelDetailDto[];
}

export function ComparisonProviderTable({ models }: ComparisonProviderTableProps) {
  const getGridCols = () => {
    switch (models.length) {
      case 2:
        return "grid-cols-1 md:grid-cols-2";
      case 3:
        return "grid-cols-1 md:grid-cols-3";
      case 4:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
      default:
        return "grid-cols-1 md:grid-cols-2";
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border/70">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">
            Inference Providers & Endpoint Availability
          </h3>
        </div>
        <span className="text-xs text-text-tertiary">
          Available hosted endpoints across providers
        </span>
      </div>

      <div className={`grid ${getGridCols()} gap-4`}>
        {models.map((model) => (
          <div
            key={model.slug}
            className="p-4 rounded-xl border border-border bg-surface-elevated/40 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
              <span className="text-xs font-semibold text-text-primary truncate">
                {model.name}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {model.endpoints.length} endpoint{model.endpoints.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            {model.endpoints.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-tertiary italic">
                No active provider endpoints recorded.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {model.endpoints.map((ep) => {
                  const isOnline = ep.status === "ONLINE";
                  return (
                    <div
                      key={ep.id}
                      className="p-2.5 rounded-lg bg-surface border border-border/60 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-text-primary truncate">
                          {ep.provider.name}
                        </span>
                        {isOnline ? (
                          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Online
                          </span>
                        ) : (
                          <span className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                            <XCircle className="h-2.5 w-2.5" /> {ep.status}
                          </span>
                        )}
                      </div>

                      <div className="font-mono text-[10px] text-text-tertiary truncate">
                        {ep.endpointKey}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-text-tertiary pt-1 border-t border-border/30">
                        <span>
                          {ep.contextWindow
                            ? `${Math.round(ep.contextWindow / 1000)}k ctx`
                            : "—"}
                        </span>
                        {ep.isModerated && (
                          <span className="flex items-center gap-0.5 text-text-secondary">
                            <ShieldCheck className="h-2.5 w-2.5" /> Moderated
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
