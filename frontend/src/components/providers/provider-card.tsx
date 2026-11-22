import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ProviderDirectoryItemDto } from "@oneatlas/backend/shared";
import {
  Server,
  ArrowRight,
  ExternalLink,
  Cpu,
} from "lucide-react";

export interface ProviderCardProps {
  provider: ProviderDirectoryItemDto;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  const isOnline = provider.onlineEndpointCount > 0;

  return (
    <Link href={`/providers/${provider.slug}`} className="block group h-full">
      <Card
        hover
        className="h-full flex flex-col justify-between transition-all duration-200 border-border hover:border-text-tertiary bg-surface"
      >
        {/* Top Header Section */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-elevated text-accent group-hover:bg-accent-muted transition-colors">
                <Server className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors flex items-center gap-1.5">
                  <span>{provider.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent shrink-0" />
                </h3>
                <p className="text-xs font-mono text-text-tertiary">
                  {provider.slug}
                </p>
              </div>
            </div>

            {/* Provider Type Badge */}
            <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0.5 shrink-0">
              {provider.providerType}
            </Badge>
          </div>

          {/* Description */}
          {provider.description && (
            <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed pt-1">
              {provider.description}
            </p>
          )}

          {/* Endpoint Metrics Badges */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            <Badge variant="accent" className="text-[11px] gap-1">
              <Cpu className="h-3 w-3" />
              <span>
                {provider.modelCount} Model{provider.modelCount !== 1 ? "s" : ""}
              </span>
            </Badge>

            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-surface-elevated text-text-secondary border border-border">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isOnline ? "bg-success" : "bg-text-tertiary"
                }`}
              />
              <span>
                {provider.onlineEndpointCount} / {provider.endpointCount} Online
              </span>
            </span>

            {/* Modalities */}
            {provider.supportedInputModalities?.slice(0, 3).map((mod) => (
              <span
                key={mod}
                className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-text-tertiary"
              >
                {mod}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Link Section */}
        <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-tertiary">
          <span>View Endpoint Offerings</span>
          {provider.website && (
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

export function ProviderCardSkeleton() {
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
          <div className="h-5 w-16 bg-surface-elevated rounded" />
        </div>
        <div className="space-y-1.5 pt-2">
          <div className="h-3 w-full bg-surface-elevated rounded" />
          <div className="h-3 w-4/5 bg-surface-elevated rounded" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-5 w-20 bg-surface-elevated rounded" />
          <div className="h-5 w-24 bg-surface-elevated rounded" />
        </div>
      </div>
      <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between">
        <div className="h-3 w-28 bg-surface-elevated rounded" />
        <div className="h-3 w-4 bg-surface-elevated rounded" />
      </div>
    </Card>
  );
}
