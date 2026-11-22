import { formatPrice } from "@/lib/formatters";
import type { PricingHistoryRecordDto } from "@oneatlas/backend/shared";
import { History, Calendar } from "lucide-react";

export interface ModelPricingHistoryTableProps {
  records: PricingHistoryRecordDto[];
}

export function ModelPricingHistoryTable({
  records,
}: ModelPricingHistoryTableProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-2">
        <History className="h-6 w-6 text-text-tertiary mx-auto" />
        <h4 className="text-sm font-semibold text-text-primary">
          No historical price changes
        </h4>
        <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
          Current catalog pricing represents the initial observed baseline. Subsequent rate changes from inference providers will be archived chronologically here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-surface-elevated text-text-tertiary uppercase font-mono text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-3 font-medium">Observed Date</th>
              <th className="px-4 py-3 font-medium">Inference Provider</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Input / 1M Tokens</th>
              <th className="px-4 py-3 font-medium">Output / 1M Tokens</th>
              <th className="px-4 py-3 font-medium">Cache Read / 1M</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-text-secondary">
            {records.map((rec) => {
              const date = new Date(rec.observedAt);
              const formattedDate = !isNaN(date.getTime())
                ? date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : rec.observedAt;

              return (
                <tr
                  key={rec.id}
                  className="hover:bg-surface-elevated/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-text-primary flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-text-tertiary" />
                    <span>{formattedDate}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-text-primary">
                    {rec.provider.name}
                  </td>
                  <td className="px-4 py-3 text-text-tertiary">
                    {rec.source?.name || "Direct Provider"}
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-text-primary">
                    {rec.inputPricePerMillion
                      ? formatPrice(rec.inputPricePerMillion)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-text-primary">
                    {rec.outputPricePerMillion
                      ? formatPrice(rec.outputPricePerMillion)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-text-tertiary">
                    {rec.cacheReadPricePerMillion
                      ? formatPrice(rec.cacheReadPricePerMillion)
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
