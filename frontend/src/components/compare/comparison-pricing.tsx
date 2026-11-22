import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/formatters";
import type { ModelDetailDto, ModelComparisonSpecsSummaryDto } from "@oneatlas/backend/shared";
import { DollarSign, Server, Award, TrendingDown } from "lucide-react";

export interface ComparisonPricingProps {
  models: ModelDetailDto[];
  specsSummary?: ModelComparisonSpecsSummaryDto;
}

export function ComparisonPricing({ models, specsSummary }: ComparisonPricingProps) {
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
          <DollarSign className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">
            Inference Pricing & Provider Availability
          </h3>
        </div>
        <span className="text-xs text-text-tertiary">
          Prices standardized per 1,000,000 tokens (USD)
        </span>
      </div>

      {/* Pricing Cards Grid */}
      <div className={`grid ${getGridCols()} gap-4`}>
        {models.map((model) => {
          const pricing = model.pricingSummary;
          const lowestInput = pricing?.lowestInput;
          const lowestOutput = pricing?.lowestOutput;
          const isCheapestInput = specsSummary?.cheapestInputSlug === model.slug && models.length > 1;
          const isCheapestOutput = specsSummary?.cheapestOutputSlug === model.slug && models.length > 1;
          const providerCount = pricing?.availableProviderCount ?? 0;

          return (
            <div
              key={model.slug}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-4 transition-all ${
                isCheapestInput && isCheapestOutput
                  ? "border-emerald-500/40 bg-emerald-500/5 shadow-xs"
                  : "border-border bg-surface-elevated/40"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-text-primary truncate">
                    {model.name}
                  </span>
                  {(isCheapestInput || isCheapestOutput) && (
                    <Badge variant="success" className="text-[10px] gap-1 px-1.5 py-0 shrink-0">
                      <TrendingDown className="h-3 w-3" />
                      <span>Best Value</span>
                    </Badge>
                  )}
                </div>

                {/* Input Price */}
                <div className="p-2.5 rounded-lg bg-surface border border-border/60 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-tertiary">Input Tokens</span>
                    {isCheapestInput && (
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
                        <Award className="h-2.5 w-2.5" /> Cheapest
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-text-primary">
                      {lowestInput ? formatPrice(lowestInput.amount) : "—"}
                    </span>
                    <span className="text-xs text-text-tertiary">/ 1M tokens</span>
                  </div>
                  {lowestInput?.provider?.name && (
                    <p className="text-[10px] text-text-tertiary truncate">
                      via {lowestInput.provider.name}
                    </p>
                  )}
                </div>

                {/* Output Price */}
                <div className="p-2.5 rounded-lg bg-surface border border-border/60 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-tertiary">Output Tokens</span>
                    {isCheapestOutput && (
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
                        <Award className="h-2.5 w-2.5" /> Cheapest
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-text-primary">
                      {lowestOutput ? formatPrice(lowestOutput.amount) : "—"}
                    </span>
                    <span className="text-xs text-text-tertiary">/ 1M tokens</span>
                  </div>
                  {lowestOutput?.provider?.name && (
                    <p className="text-[10px] text-text-tertiary truncate">
                      via {lowestOutput.provider.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Provider Count */}
              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-text-tertiary">
                <span className="flex items-center gap-1.5">
                  <Server className="h-3 w-3" />
                  <span>Available Endpoints</span>
                </span>
                <span className="font-semibold text-text-secondary">
                  {providerCount > 0
                    ? `${providerCount} provider${providerCount > 1 ? "s" : ""}`
                    : "No endpoints"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
