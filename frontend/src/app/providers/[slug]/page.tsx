import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { providerDirectoryQueryService } from "@oneatlas/backend/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatContextWindow } from "@/lib/formatters";
import type { ProviderDetailResult } from "@oneatlas/backend/shared";
import {
  ArrowLeft,
  Server,
  ExternalLink,
  ArrowRight,
  Info,
  Shield,
  Radio,
} from "lucide-react";

interface ProviderDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProviderDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const result = await providerDirectoryQueryService.getProviderBySlug(slug);
    if (!result) {
      return {
        title: "Provider Not Found | AI Details",
      };
    }
    return {
      title: `${result.provider.name} — AI Inference Endpoints & Hosted Models | AI Details`,
      description:
        result.provider.description ||
        `Explore supported models, context limits, pricing, and active endpoint availability for ${result.provider.name}.`,
    };
  } catch {
    return {
      title: `${slug} — Inference Provider | AI Details`,
    };
  }
}

export default async function ProviderDetailPage({
  params,
}: ProviderDetailPageProps) {
  const { slug } = await params;

  let providerDetail: ProviderDetailResult | null = null;
  let connectionError: string | null = null;

  try {
    providerDetail = await providerDirectoryQueryService.getProviderBySlug(
      slug,
      { limit: 60 }
    );
  } catch (err: unknown) {
    connectionError =
      err instanceof Error ? err.message : "Database connection failed";
  }

  // Handle 404 (Provider does not exist)
  if (!providerDetail && !connectionError) {
    notFound();
  }

  // Handle database/server connection failure gracefully
  if (connectionError || !providerDetail) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-elevated text-accent">
          <Info className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">
          Unable to connect to Inference Providers Directory
        </h2>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          {connectionError || "Database service temporarily unreachable."}
        </p>
        <div className="pt-2">
          <Link href="/providers">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Providers Directory</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { provider, endpoints } = providerDetail;

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-10">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <Link
            href="/providers"
            className="hover:text-text-primary transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Providers</span>
          </Link>
          <span>/</span>
          <span className="text-text-primary font-medium">{provider.name}</span>
        </div>

        <Link href="/providers">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Providers</span>
          </Button>
        </Link>
      </div>

      {/* SECTION A: Provider Overview Header */}
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-muted text-accent">
                <Server className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                  {provider.name}
                </h1>
                <p className="text-xs font-mono text-text-tertiary">
                  Canonical Slug: {provider.slug}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs uppercase font-mono px-2 py-1">
                {provider.providerType}
              </Badge>
              {provider.website && (
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline bg-accent-muted px-3 py-1.5 rounded-lg transition-colors"
                >
                  <span>Provider Portal</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {provider.description && (
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-3xl">
              {provider.description}
            </p>
          )}

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/60">
            <div className="rounded-xl bg-surface-elevated/70 p-3.5 border border-border/50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary block">
                Hosted Models
              </span>
              <span className="text-xl font-bold text-text-primary mt-1 block">
                {provider.modelCount}
              </span>
            </div>

            <div className="rounded-xl bg-surface-elevated/70 p-3.5 border border-border/50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary block">
                Online Endpoints
              </span>
              <span className="text-xl font-bold text-success mt-1 block">
                {provider.onlineEndpointCount}
              </span>
            </div>

            <div className="rounded-xl bg-surface-elevated/70 p-3.5 border border-border/50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary block">
                Total Endpoints
              </span>
              <span className="text-xl font-bold text-text-primary mt-1 block">
                {provider.endpointCount}
              </span>
            </div>

            <div className="rounded-xl bg-surface-elevated/70 p-3.5 border border-border/50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary block">
                Health Status
              </span>
              <span className="text-sm font-semibold text-text-primary mt-1.5 flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    provider.onlineEndpointCount > 0 ? "bg-success" : "bg-text-tertiary"
                  }`}
                />
                <span>
                  {provider.onlineEndpointCount > 0 ? "Active Routing" : "Standby"}
                </span>
              </span>
            </div>
          </div>

          {/* Supported Modalities Tags */}
          <div className="flex items-center gap-2 flex-wrap pt-2 text-xs">
            <span className="text-text-tertiary">Supported Modalities:</span>
            {provider.supportedInputModalities?.map((m) => (
              <span
                key={m}
                className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-surface-elevated text-text-secondary border border-border"
              >
                In: {m}
              </span>
            ))}
            {provider.supportedOutputModalities?.map((m) => (
              <span
                key={m}
                className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-surface-elevated text-text-secondary border border-border"
              >
                Out: {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION B: Endpoints & Hosted Models Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Radio className="h-4 w-4 text-accent" />
            <span>Hosted Model Endpoints ({endpoints.length})</span>
          </h3>
          <Link
            href={`/models?provider=${provider.slug}`}
            className="text-xs text-accent hover:underline flex items-center gap-1"
          >
            <span>Filter Models Catalog</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {endpoints.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-2">
            <Server className="h-6 w-6 text-text-tertiary mx-auto" />
            <h4 className="text-sm font-semibold text-text-primary">
              No active endpoints recorded
            </h4>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              This provider does not currently have any active endpoints registered in the catalog.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-surface-elevated text-text-tertiary uppercase font-mono text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-medium">Model</th>
                    <th className="px-4 py-3 font-medium">Endpoint Key</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Context Limit</th>
                    <th className="px-4 py-3 font-medium">Modalities</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-text-secondary">
                  {endpoints.map((ep) => {
                    const isOnline = ep.status === "ONLINE";

                    return (
                      <tr
                        key={ep.id || ep.endpointKey}
                        className="hover:bg-surface-elevated/50 transition-colors"
                      >
                        {/* Model Name & Family */}
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/models/${ep.model.slug}`}
                            className="font-semibold text-text-primary hover:text-accent transition-colors flex items-center gap-1"
                          >
                            <span>{ep.model.name}</span>
                            <ArrowRight className="h-3 w-3 text-accent shrink-0" />
                          </Link>
                          {ep.model.family && (
                            <span className="text-[11px] text-text-tertiary block mt-0.5">
                              {ep.model.family}
                            </span>
                          )}
                        </td>

                        {/* Endpoint Key */}
                        <td className="px-4 py-3.5 font-mono text-text-tertiary text-[11px]">
                          {ep.endpointKey}
                        </td>

                        {/* Status */}
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
                                title="Moderated"
                                className="text-[9px] px-1 py-0.2 rounded bg-accent-muted text-accent font-medium flex items-center gap-0.5"
                              >
                                <Shield className="h-2.5 w-2.5" />
                                <span>Mod</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Action Link to Model Detail */}
                        <td className="px-4 py-3.5 text-right">
                          <Link href={`/models/${ep.model.slug}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                              <span>Profile</span>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
