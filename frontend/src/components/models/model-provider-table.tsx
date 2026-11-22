import { Badge } from "@/components/ui/badge";
import { formatContextWindow, formatPrice } from "@/lib/formatters";
import type { ModelEndpointDto } from "@oneatlas/backend/shared";
import { Server, ExternalLink, Shield } from "lucide-react";

export interface ModelProviderTableProps {
  endpoints: ModelEndpointDto[];
}

export function ModelProviderTable({ endpoints }: ModelProviderTableProps) {
  if (endpoints.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-2">
        <Server className="h-6 w-6 text-text-tertiary mx-auto" />
        <h4 className="text-sm font-semibold text-text-primary">
          No active provider endpoints
        </h4>
        <p className="text-xs text-text-secondary max-w-sm mx-auto">
          This canonical model does not currently have any active inference provider endpoints registered in the catalog.
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
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Endpoint / Model Key</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Context Limit</th>
              <th className="px-4 py-3 font-medium">Input Price (1M)</th>
              <th className="px-4 py-3 font-medium">Output Price (1M)</th>
              <th className="px-4 py-3 font-medium">Modalities</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-text-secondary">
            {endpoints.map((ep) => {
              const pricing = ep.pricing?.[0];
              const isOnline = ep.status === "ONLINE";

              return (
                <tr
                  key={ep.id || ep.endpointKey}
                  className="hover:bg-surface-elevated/50 transition-colors"
                >
                  {/* Provider Name & Type */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-text-primary">
                        {ep.provider.name}
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {ep.provider.providerType}
                      </Badge>
                      {ep.provider.website && (
                        <a
                          href={ep.provider.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-tertiary hover:text-accent transition-colors"
                          aria-label={`Visit ${ep.provider.name} website`}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Endpoint Key */}
                  <td className="px-4 py-3.5 font-mono text-text-tertiary text-[11px]">
                    {ep.endpointKey}
                  </td>

                  {/* Status Indicator */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isOnline
                            ? "bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                            : "bg-text-tertiary"
                        }`}
                      />
                      <span className="font-medium text-[11px] text-text-primary">
                        {ep.status}
                      </span>
                    </div>
                  </td>

                  {/* Context Limit */}
                  <td className="px-4 py-3.5 font-medium text-text-primary">
                    {formatContextWindow(ep.contextWindow)}
                  </td>

                  {/* Input Price */}
                  <td className="px-4 py-3.5 font-medium text-text-primary">
                    {pricing?.inputPricePerMillion
                      ? formatPrice(pricing.inputPricePerMillion)
                      : "—"}
                  </td>

                  {/* Output Price */}
                  <td className="px-4 py-3.5 font-medium text-text-primary">
                    {pricing?.outputPricePerMillion
                      ? formatPrice(pricing.outputPricePerMillion)
                      : "—"}
                  </td>

                  {/* Modalities & Moderation */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      {ep.inputModalities?.map((m) => (
                        <span
                          key={m}
                          className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-surface-elevated text-text-tertiary"
                        >
                          {m}
                        </span>
                      ))}
                      {ep.isModerated && (
                        <span
                          title="Moderated Endpoint"
                          className="text-[9px] px-1 py-0.2 rounded bg-accent-muted text-accent font-medium flex items-center gap-0.5"
                        >
                          <Shield className="h-2.5 w-2.5" />
                          <span>Mod</span>
                        </span>
                      )}
                    </div>
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
