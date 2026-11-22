"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ModelDetailDto } from "@oneatlas/backend/shared";
import { X, ExternalLink, Calendar } from "lucide-react";
import { formatDate } from "@/lib/formatters";

export interface ComparisonHeaderProps {
  models: ModelDetailDto[];
  onRemoveModel: (slug: string) => void;
}

export function ComparisonHeader({ models, onRemoveModel }: ComparisonHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl border border-border bg-surface shadow-xs">
      {models.map((model) => {
        const primaryLab = model.labs[0];
        return (
          <div
            key={model.slug}
            className="flex flex-col justify-between p-3.5 rounded-lg border border-border/70 bg-surface-elevated/40 space-y-3 relative group"
          >
            {/* Top Lab & Remove Button */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {primaryLab ? (
                  <Badge variant="accent" className="text-[11px] px-2 py-0.5">
                    {primaryLab.name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px]">
                    Independent
                  </Badge>
                )}
                {model.family && (
                  <span className="text-[11px] text-text-tertiary">
                    {model.family}
                  </span>
                )}
              </div>

              {models.length > 2 && (
                <button
                  type="button"
                  onClick={() => onRemoveModel(model.slug)}
                  className="text-text-tertiary hover:text-red-400 p-1 rounded-md hover:bg-surface transition-colors"
                  title={`Remove ${model.name}`}
                  aria-label={`Remove ${model.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Model Name and Slug */}
            <div>
              <Link
                href={`/models/${model.slug}`}
                className="text-sm sm:text-base font-bold text-text-primary hover:text-accent transition-colors flex items-center gap-1.5"
              >
                <span>{model.name}</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-accent shrink-0" />
              </Link>
              <div className="text-[11px] font-mono text-text-tertiary truncate mt-0.5">
                {model.slug}
              </div>
            </div>

            {/* Release Date & View Profile Action */}
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-text-tertiary">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(model.releaseDate)}</span>
              </div>
              <Link href={`/models/${model.slug}`}>
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]">
                  View Profile
                </Button>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
