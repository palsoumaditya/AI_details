import { Badge } from "@/components/ui/badge";
import type {
  FieldProvenanceDto,
  DataQualitySummaryDto,
} from "@oneatlas/backend/shared";
import { Database, AlertTriangle, CheckCircle2 } from "lucide-react";

export interface ModelProvenanceCardProps {
  provenance: Record<string, FieldProvenanceDto>;
  dataQuality: DataQualitySummaryDto;
}

export function ModelProvenanceCard({
  provenance,
  dataQuality,
}: ModelProvenanceCardProps) {
  const provenanceEntries = Object.entries(provenance || {});

  // Distinct contributing data sources
  const contributingSources = Array.from(
    new Set(provenanceEntries.map(([, p]) => p.sourceName))
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-accent" />
          <h4 className="text-sm font-semibold text-text-primary">
            Data Provenance & Verification
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              dataQuality.status === "VERIFIED"
                ? "success"
                : dataQuality.status === "CONFLICTED"
                ? "accent"
                : "default"
            }
            className="text-[10px] uppercase font-mono"
          >
            {dataQuality.status}
          </Badge>
          {dataQuality.hasConflicts && (
            <Badge variant="outline" className="text-[10px] text-accent gap-1">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>{dataQuality.conflictCount} Conflicts Flagged</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Contributing Sources */}
      <div className="space-y-1.5 text-xs">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
          Contributing Upstream Catalogs:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {contributingSources.length > 0 ? (
            contributingSources.map((source) => (
              <span
                key={source}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-elevated text-text-secondary border border-border text-[11px]"
              >
                <CheckCircle2 className="h-3 w-3 text-accent" />
                <span>{source}</span>
              </span>
            ))
          ) : (
            <span className="text-text-tertiary">Authoritative Seed / Direct Laboratory</span>
          )}
        </div>
      </div>

      {/* Field Level Attribution */}
      {provenanceEntries.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Field-Level Ownership:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {provenanceEntries.map(([field, prov]) => (
              <div
                key={field}
                className="rounded-lg bg-surface-elevated/60 p-2 text-[11px] border border-border/40"
              >
                <div className="font-mono text-text-tertiary truncate">{field}</div>
                <div className="font-medium text-text-primary truncate mt-0.5">
                  {prov.sourceName}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
