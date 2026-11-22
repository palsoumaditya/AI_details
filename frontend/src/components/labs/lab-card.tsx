import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AiLabDirectoryItemDto } from "@oneatlas/backend/shared";
import {
  FlaskConical,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Globe,
} from "lucide-react";

export interface LabCardProps {
  lab: AiLabDirectoryItemDto;
}

export function LabCard({ lab }: LabCardProps) {
  return (
    <Link href={`/labs/${lab.slug}`} className="block group h-full">
      <Card
        hover
        className="h-full flex flex-col justify-between transition-all duration-200 border-border hover:border-text-tertiary bg-surface"
      >
        {/* Top Header Section */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-800 border border-slate-200 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all duration-200 shadow-2xs">
                <FlaskConical className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors flex items-center gap-1.5">
                  <span>{lab.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent shrink-0" />
                </h3>
                <p className="text-xs font-mono text-text-tertiary">
                  {lab.slug}
                </p>
              </div>
            </div>

            {/* Country Badge */}
            {lab.country && (
              <Badge variant="outline" className="text-[11px] gap-1 shrink-0">
                <Globe className="h-3 w-3 text-text-tertiary" />
                <span>{lab.country}</span>
              </Badge>
            )}
          </div>

          {/* Synopsis */}
          {lab.description && (
            <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed pt-1">
              {lab.description}
            </p>
          )}

          {/* Model Count & Role Badges */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            <Badge variant="accent" className="text-[11px] gap-1">
              <Sparkles className="h-3 w-3" />
              <span>
                {lab.modelCount} Model{lab.modelCount !== 1 ? "s" : ""}
              </span>
            </Badge>

            {lab.creatorModelCount > 0 && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                {lab.creatorModelCount} Created
              </span>
            )}

            {lab.publisherModelCount > 0 && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                {lab.publisherModelCount} Published
              </span>
            )}
          </div>
        </div>

        {/* Bottom Link Section */}
        <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-tertiary">
          <span>Explore Research Portfolio</span>
          {lab.website && (
            <span
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="hover:text-accent transition-colors flex items-center gap-1 text-[11px]"
            >
              <ExternalLink className="h-3 w-3" />
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}

export function LabCardSkeleton() {
  return (
    <Card className="h-full flex flex-col justify-between border-border bg-surface p-5 animate-pulse">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-surface-elevated rounded-lg" />
            <div className="space-y-1">
              <div className="h-4 w-28 bg-surface-elevated rounded" />
              <div className="h-3 w-16 bg-surface-elevated rounded" />
            </div>
          </div>
          <div className="h-5 w-20 bg-surface-elevated rounded" />
        </div>
        <div className="space-y-1.5 pt-2">
          <div className="h-3 w-full bg-surface-elevated rounded" />
          <div className="h-3 w-4/5 bg-surface-elevated rounded" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-5 w-16 bg-surface-elevated rounded" />
          <div className="h-5 w-20 bg-surface-elevated rounded" />
        </div>
      </div>
      <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between">
        <div className="h-3 w-28 bg-surface-elevated rounded" />
        <div className="h-3 w-4 bg-surface-elevated rounded" />
      </div>
    </Card>
  );
}
