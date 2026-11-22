import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { modelDetailQueryService } from "@oneatlas/backend/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModelProviderTable } from "@/components/models/model-provider-table";
import { ModelBenchmarks } from "@/components/models/model-benchmarks";
import { ModelPricingHistoryTable } from "@/components/models/model-pricing-history-table";
import { ModelProvenanceCard } from "@/components/models/model-provenance-card";
import { formatContextWindow, formatPrice, formatDate } from "@/lib/formatters";
import type { ModelDetailDto, PricingHistoryResult } from "@oneatlas/backend/shared";
import {
  ArrowLeft,
  Sparkles,
  Layers,
  ShieldCheck,
  Lock,
  Calendar,
  Server,
  DollarSign,
  Info,
  Clock,
  BookOpen,
  Cpu,
} from "lucide-react";

interface ModelDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ModelDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const model = await modelDetailQueryService.getModelDetails(slug);
    if (!model) {
      return {
        title: "Model Not Found | OneAtlas.dev",
      };
    }

    const labName = model.labs[0]?.name || "AI Research";
    return {
      title: `${model.name} (${labName}) — AI Model Specs, Pricing & Benchmarks | OneAtlas.dev`,
      description:
        model.description ||
        `Explore technical specifications, context window limits, inference pricing, and provider endpoints for ${model.name}.`,
    };
  } catch {
    return {
      title: `${slug} — Model Intelligence | OneAtlas.dev`,
    };
  }
}

export default async function ModelDetailPage({ params }: ModelDetailPageProps) {
  const { slug } = await params;

  let model: ModelDetailDto | null = null;
  let pricingHistory: PricingHistoryResult | null = null;
  let connectionError: string | null = null;

  try {
    const [modelResult, historyResult] = await Promise.all([
      modelDetailQueryService.getModelDetails(slug),
      modelDetailQueryService.getModelPricingHistory(slug, {
        limit: 20,
        sort: "newest",
      }),
    ]);
    model = modelResult;
    pricingHistory = historyResult;
  } catch (err: unknown) {
    connectionError =
      err instanceof Error ? err.message : "Database connection failed";
  }

  // Handle true 404 (model slug does not exist)
  if (!model && !connectionError) {
    notFound();
  }

  // Handle database/server connection failure gracefully
  if (connectionError || !model) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-elevated text-accent">
          <Info className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">
          Unable to connect to intelligence catalog
        </h2>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          {connectionError || "Database service temporarily unreachable."}
        </p>
        <div className="pt-2">
          <Link href="/models">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Catalog</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const primaryLab = model.labs[0];
  const lowestInput = model.pricingSummary?.lowestInput;
  const lowestOutput = model.pricingSummary?.lowestOutput;
  const availableProviderCount = model.pricingSummary?.availableProviderCount || 0;

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-10">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <Link
            href="/models"
            className="hover:text-text-primary transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Catalog</span>
          </Link>
          <span>/</span>
          <span className="text-text-secondary">{primaryLab?.name || "Models"}</span>
          <span>/</span>
          <span className="text-text-primary font-medium">{model.name}</span>
        </div>

        <Link href="/models">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Models</span>
          </Button>
        </Link>
      </div>

      {/* SECTION A: Model Header Profile */}
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {primaryLab && (
              <Badge variant="accent" className="text-xs px-2.5 py-0.5">
                {primaryLab.name}
              </Badge>
            )}
            {model.family && (
              <span className="text-xs text-text-tertiary">
                Family: <strong className="text-text-secondary font-medium">{model.family}</strong>
              </span>
            )}
            {model.releaseDate && (
              <span className="text-xs text-text-tertiary flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(model.releaseDate)}</span>
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
              {model.name}
            </h1>
            <p className="text-xs font-mono text-text-tertiary mt-1">
              Canonical Slug: {model.slug}
            </p>
          </div>

          {model.description && (
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-3xl">
              {model.description}
            </p>
          )}

          {/* Key Attribute Badges */}
          <div className="flex items-center gap-2 flex-wrap pt-2">
            {model.contextWindow != null && model.contextWindow > 0 && (
              <Badge variant="outline" className="text-xs gap-1.5 py-1">
                <Layers className="h-3.5 w-3.5 text-accent" />
                <span>{formatContextWindow(model.contextWindow)} Context Window</span>
              </Badge>
            )}

            {model.isReasoning && (
              <Badge variant="accent" className="text-xs gap-1.5 py-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Reasoning Model</span>
              </Badge>
            )}

            {model.isOpenWeight === true ? (
              <Badge variant="success" className="text-xs gap-1.5 py-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Open Weights</span>
              </Badge>
            ) : model.isOpenWeight === false ? (
              <Badge variant="outline" className="text-xs gap-1.5 py-1 text-text-tertiary">
                <Lock className="h-3.5 w-3.5" />
                <span>Proprietary Weights</span>
              </Badge>
            ) : null}

            {/* Input Modalities */}
            {model.inputModalities?.map((mod) => (
              <span
                key={mod}
                className="text-xs uppercase font-mono px-2 py-0.5 rounded-md bg-surface-elevated text-text-secondary border border-border"
              >
                In: {mod}
              </span>
            ))}

            {/* Output Modalities */}
            {model.outputModalities?.map((mod) => (
              <span
                key={mod}
                className="text-xs uppercase font-mono px-2 py-0.5 rounded-md bg-surface-elevated text-text-secondary border border-border"
              >
                Out: {mod}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION B: Pricing Overview Cards */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-accent" />
          <span>Inference Pricing Summary</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Starting Input Price */}
          <Card className="p-4 space-y-1 bg-surface border-border">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Lowest Input Price
            </span>
            <div className="text-xl font-bold text-text-primary">
              {lowestInput ? formatPrice(lowestInput.amount) : "—"}
              <span className="text-xs font-normal text-text-tertiary ml-1">/ 1M tokens</span>
            </div>
            {lowestInput?.provider?.name && (
              <p className="text-[11px] text-text-tertiary truncate">
                via {lowestInput.provider.name}
              </p>
            )}
          </Card>

          {/* Starting Output Price */}
          <Card className="p-4 space-y-1 bg-surface border-border">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Lowest Output Price
            </span>
            <div className="text-xl font-bold text-text-primary">
              {lowestOutput ? formatPrice(lowestOutput.amount) : "—"}
              <span className="text-xs font-normal text-text-tertiary ml-1">/ 1M tokens</span>
            </div>
            {lowestOutput?.provider?.name && (
              <p className="text-[11px] text-text-tertiary truncate">
                via {lowestOutput.provider.name}
              </p>
            )}
          </Card>

          {/* Provider Endpoints Count */}
          <Card className="p-4 space-y-1 bg-surface border-border">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Active Providers
            </span>
            <div className="text-xl font-bold text-text-primary">
              {availableProviderCount}
              <span className="text-xs font-normal text-text-tertiary ml-1">
                endpoint{availableProviderCount !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-[11px] text-text-tertiary">
              {availableProviderCount > 0
                ? "Available across inference providers"
                : "No active endpoints registered"}
            </p>
          </Card>

          {/* AI Lab Affiliation */}
          <Card className="p-4 space-y-1 bg-surface border-border">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Research Organization
            </span>
            <div className="text-xl font-bold text-text-primary truncate">
              {primaryLab?.name || "Independent"}
            </div>
            {primaryLab?.country && (
              <p className="text-[11px] text-text-tertiary">
                Origin: {primaryLab.country}
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* SECTION C: Model Specifications Details */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <Cpu className="h-4 w-4 text-accent" />
          <span>Technical Specifications</span>
        </h3>

        <div className="rounded-xl border border-border bg-surface p-5 divide-y divide-border/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
            <div>
              <span className="text-xs text-text-tertiary block">Context Window Limit</span>
              <span className="text-sm font-semibold text-text-primary">
                {model.contextWindow ? `${model.contextWindow.toLocaleString()} tokens` : "—"}
              </span>
            </div>
            <div>
              <span className="text-xs text-text-tertiary block">Max Output Generation Tokens</span>
              <span className="text-sm font-semibold text-text-primary">
                {model.maxOutputTokens ? `${model.maxOutputTokens.toLocaleString()} tokens` : "—"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div>
              <span className="text-xs text-text-tertiary block">Architecture / Model Family</span>
              <span className="text-sm font-semibold text-text-primary">
                {model.family || model.architectureType || "—"}
              </span>
            </div>
            <div>
              <span className="text-xs text-text-tertiary block">License</span>
              <span className="text-sm font-semibold text-text-primary">
                {model.license || (model.isOpenWeight ? "Open License" : "Proprietary Commercial")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div>
              <span className="text-xs text-text-tertiary block">Knowledge Cutoff Date</span>
              <span className="text-sm font-semibold text-text-primary">
                {model.knowledgeCutoff || "—"}
              </span>
            </div>
            <div>
              <span className="text-xs text-text-tertiary block">Catalog Lifecycle Status</span>
              <span className="text-sm font-semibold text-text-primary uppercase font-mono text-xs">
                {model.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION D: Provider Availability Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Server className="h-4 w-4 text-accent" />
            <span>Available Inference Endpoints</span>
          </h3>
          <span className="text-xs text-text-tertiary">
            {model.endpoints.length} endpoint{model.endpoints.length !== 1 ? "s" : ""}
          </span>
        </div>

        <ModelProviderTable endpoints={model.endpoints} />
      </div>

      {/* SECTION E: Benchmark Evaluations */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" />
          <span>Standardized Benchmark Scorecards</span>
        </h3>

        <ModelBenchmarks benchmarks={model.benchmarks || []} />
      </div>

      {/* SECTION F: Pricing History Stream */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent" />
          <span>Historical Pricing Observations</span>
        </h3>

        <ModelPricingHistoryTable records={pricingHistory?.records || []} />
      </div>

      {/* SECTION G: Data Provenance & Verification */}
      <ModelProvenanceCard
        provenance={model.provenance || {}}
        dataQuality={
          model.dataQuality || {
            status: "VERIFIED",
            lastMetadataUpdate: model.lastUpdated,
            hasConflicts: false,
            conflictCount: 0,
            warnings: [],
          }
        }
      />
    </div>
  );
}
