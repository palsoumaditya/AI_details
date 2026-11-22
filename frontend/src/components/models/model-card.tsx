import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatContextWindow, formatPrice, formatDate } from "@/lib/formatters";
import type { ModelCatalogItemDto } from "@oneatlas/backend/shared";
import {
  Sparkles,
  Layers,
  Server,
  ArrowRight,
  ShieldCheck,
  Lock,
  GitCompareArrows,
} from "lucide-react";

export interface ModelCardProps {
  model: ModelCatalogItemDto;
}

export function ModelCard({ model }: ModelCardProps) {
  const primaryLab = model.labs[0]?.name || "Independent";
  const lowestInput = model.pricing.lowestInput;
  const lowestOutput = model.pricing.lowestOutput;
  const providerCount = model.pricing.availableProviderCount;

  return (
    <Card
      hover
      className="h-full flex flex-col justify-between transition-all duration-200 border-border hover:border-text-tertiary bg-surface relative group"
    >
      {/* Absolute click target for entire card navigation to detail */}
      <Link
        href={`/models/${model.slug}`}
        className="absolute inset-0 z-0"
        aria-label={`View ${model.name} details`}
      />

      {/* Top Header Section */}
      <div className="space-y-3 relative z-10 pointer-events-none">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-accent bg-accent-muted px-2 py-0.5 rounded-md">
              {primaryLab}
            </span>
            {model.family && (
              <span className="text-xs text-text-tertiary">
                {model.family}
              </span>
            )}
          </div>
          {model.releaseDate && (
            <span className="text-[11px] text-text-tertiary">
              {formatDate(model.releaseDate)}
            </span>
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors flex items-center gap-1.5">
            <span>{model.name}</span>
            <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent shrink-0" />
          </h3>
          <p className="text-xs font-mono text-text-tertiary truncate mt-0.5">
            {model.slug}
          </p>
        </div>

        {model.description && (
          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {model.description}
          </p>
        )}

        {/* Feature Badges & Specs */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {/* Context Window */}
          {model.contextWindow != null && model.contextWindow > 0 && (
            <Badge variant="outline" className="text-[11px] gap-1">
              <Layers className="h-3 w-3 text-text-tertiary" />
              <span>{formatContextWindow(model.contextWindow)} context</span>
            </Badge>
          )}

          {/* Reasoning Capability */}
          {model.isReasoning && (
            <Badge variant="accent" className="text-[11px] gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Reasoning</span>
            </Badge>
          )}

          {/* Open Weight vs Proprietary */}
          {model.isOpenWeight === true ? (
            <Badge variant="success" className="text-[11px] gap-1">
              <ShieldCheck className="h-3 w-3" />
              <span>Open Weights</span>
            </Badge>
          ) : model.isOpenWeight === false ? (
            <Badge variant="outline" className="text-[11px] gap-1 text-text-tertiary">
              <Lock className="h-3 w-3" />
              <span>Proprietary</span>
            </Badge>
          ) : null}

          {/* Modalities */}
          {model.inputModalities.map((modality) => (
            <span
              key={modality}
              className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-text-tertiary"
            >
              {modality}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Pricing & Provider Availability Section */}
      <div className="mt-5 pt-3 border-t border-border/60 relative z-10">
        <div className="flex items-center justify-between text-xs">
          {/* Pricing details */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <span className="text-[11px] text-text-tertiary">In:</span>
              <span className="font-medium text-text-primary">
                {lowestInput ? formatPrice(lowestInput.amount) : "—"}
              </span>
              <span className="text-[10px] text-text-tertiary">/ 1M</span>
            </div>
            <div className="flex items-center gap-1.5 text-text-secondary">
              <span className="text-[11px] text-text-tertiary">Out:</span>
              <span className="font-medium text-text-primary">
                {lowestOutput ? formatPrice(lowestOutput.amount) : "—"}
              </span>
              <span className="text-[10px] text-text-tertiary">/ 1M</span>
            </div>
          </div>

          {/* Provider count and Compare Link */}
          <div className="flex flex-col items-end gap-1.5">
            <div className="inline-flex items-center gap-1 text-[11px] text-text-tertiary bg-surface-elevated px-2 py-0.5 rounded-md">
              <Server className="h-3 w-3 text-text-tertiary" />
              <span>
                {providerCount > 0
                  ? `${providerCount} provider${providerCount > 1 ? "s" : ""}`
                  : "No endpoints"}
              </span>
            </div>
            <Link
              href={`/compare?models=${model.slug}`}
              className="text-[11px] text-accent hover:underline flex items-center gap-1 font-medium transition-colors"
              title={`Compare ${model.name}`}
            >
              <GitCompareArrows className="h-3 w-3" />
              <span>Compare</span>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ModelCardSkeleton() {
  return (
    <Card className="h-full flex flex-col justify-between border-border bg-surface p-5 animate-pulse">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 bg-surface-elevated rounded" />
          <div className="h-3 w-16 bg-surface-elevated rounded" />
        </div>
        <div className="h-5 w-3/4 bg-surface-elevated rounded" />
        <div className="h-3 w-1/2 bg-surface-elevated rounded" />
        <div className="space-y-1.5 pt-1">
          <div className="h-3 w-full bg-surface-elevated rounded" />
          <div className="h-3 w-4/5 bg-surface-elevated rounded" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-5 w-16 bg-surface-elevated rounded" />
          <div className="h-5 w-20 bg-surface-elevated rounded" />
        </div>
      </div>
      <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between">
        <div className="h-8 w-24 bg-surface-elevated rounded" />
        <div className="h-6 w-20 bg-surface-elevated rounded" />
      </div>
    </Card>
  );
}
