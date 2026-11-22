import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { labDirectoryQueryService } from "@oneatlas/backend/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/formatters";
import type { AiLabDetailResult } from "@oneatlas/backend/shared";
import {
  ArrowLeft,
  FlaskConical,
  Globe,
  ExternalLink,
  Sparkles,
  Layers,
  ShieldCheck,
  Lock,
  ArrowRight,
  Info,
  Calendar,
  Building2,
} from "lucide-react";

interface LabDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: LabDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const result = await labDirectoryQueryService.getLabBySlug(slug);
    if (!result) {
      return {
        title: "AI Lab Not Found | OneAtlas.dev",
      };
    }
    return {
      title: `${result.lab.name} — AI Research Portfolio & Models | OneAtlas.dev`,
      description:
        result.lab.description ||
        `Explore foundation models, research contributions, and open-weight architectures from ${result.lab.name}.`,
    };
  } catch {
    return {
      title: `${slug} — AI Research Lab | OneAtlas.dev`,
    };
  }
}

export default async function LabDetailPage({ params }: LabDetailPageProps) {
  const { slug } = await params;

  let labDetail: AiLabDetailResult | null = null;
  let connectionError: string | null = null;

  try {
    labDetail = await labDirectoryQueryService.getLabBySlug(slug, {
      limit: 60,
    });
  } catch (err: unknown) {
    connectionError =
      err instanceof Error ? err.message : "Database connection failed";
  }

  // Handle 404 (Lab does not exist)
  if (!labDetail && !connectionError) {
    notFound();
  }

  // Handle database/server connection failure gracefully
  if (connectionError || !labDetail) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-elevated text-accent">
          <Info className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">
          Unable to connect to AI Labs Directory
        </h2>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          {connectionError || "Database service temporarily unreachable."}
        </p>
        <div className="pt-2">
          <Link href="/labs">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Labs Directory</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { lab, familyDistribution, models } = labDetail;

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-10">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <Link
            href="/labs"
            className="hover:text-text-primary transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>AI Labs</span>
          </Link>
          <span>/</span>
          <span className="text-text-primary font-medium">{lab.name}</span>
        </div>

        <Link href="/labs">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All AI Labs</span>
          </Button>
        </Link>
      </div>

      {/* SECTION A: Lab Overview Header */}
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-muted text-accent">
                <FlaskConical className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                  {lab.name}
                </h1>
                <p className="text-xs font-mono text-text-tertiary">
                  Canonical Slug: {lab.slug}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lab.country && (
                <Badge variant="outline" className="gap-1.5 py-1 text-xs">
                  <Globe className="h-3.5 w-3.5 text-text-tertiary" />
                  <span>{lab.country}</span>
                </Badge>
              )}
              {lab.website && (
                <a
                  href={lab.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline bg-accent-muted px-3 py-1.5 rounded-lg transition-colors"
                >
                  <span>Official Website</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {lab.description && (
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-3xl">
              {lab.description}
            </p>
          )}

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/60">
            <div className="rounded-xl bg-surface-elevated/70 p-3.5 border border-border/50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary block">
                Total Models
              </span>
              <span className="text-xl font-bold text-text-primary mt-1 block">
                {lab.modelCount}
              </span>
            </div>

            <div className="rounded-xl bg-surface-elevated/70 p-3.5 border border-border/50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary block">
                Created
              </span>
              <span className="text-xl font-bold text-text-primary mt-1 block">
                {lab.creatorModelCount}
              </span>
            </div>

            <div className="rounded-xl bg-surface-elevated/70 p-3.5 border border-border/50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary block">
                Published
              </span>
              <span className="text-xl font-bold text-text-primary mt-1 block">
                {lab.publisherModelCount}
              </span>
            </div>

            <div className="rounded-xl bg-surface-elevated/70 p-3.5 border border-border/50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary block">
                Collaborations
              </span>
              <span className="text-xl font-bold text-text-primary mt-1 block">
                {lab.collaboratorModelCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B: Model Family Distribution */}
      {familyDistribution.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            <span>Model Family Architecture Distribution</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {familyDistribution.map((item) => (
              <div
                key={item.family || "unassigned"}
                className="rounded-xl border border-border bg-surface p-3.5 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-semibold text-text-primary block">
                    {item.family || "General Foundation"}
                  </span>
                  <span className="text-[11px] text-text-tertiary">
                    {item.modelCount} model{item.modelCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="h-7 w-7 rounded-lg bg-surface-elevated flex items-center justify-center font-mono text-xs font-bold text-accent">
                  {item.modelCount}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION C: Model Portfolio */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span>Associated Foundation Models ({models.length})</span>
          </h3>
          <Link
            href={`/models?lab=${lab.slug}`}
            className="text-xs text-accent hover:underline flex items-center gap-1"
          >
            <span>View in Catalog Filter</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {models.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-2">
            <Building2 className="h-6 w-6 text-text-tertiary mx-auto" />
            <h4 className="text-sm font-semibold text-text-primary">
              No models currently attributed
            </h4>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              This organization does not currently have any active models registered in the database catalog.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((m) => (
              <Link
                key={m.id || m.slug}
                href={`/models/${m.slug}`}
                className="block group h-full"
              >
                <Card
                  hover
                  className="h-full flex flex-col justify-between p-4 border-border bg-surface hover:border-text-tertiary transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors flex items-center gap-1">
                          <span>{m.name}</span>
                          <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent" />
                        </h4>
                        <p className="text-xs font-mono text-text-tertiary">
                          {m.slug}
                        </p>
                      </div>

                      {m.releaseDate && (
                        <span className="text-[10px] text-text-tertiary flex items-center gap-1 shrink-0">
                          <Calendar className="h-2.5 w-2.5" />
                          <span>{formatDate(m.releaseDate)}</span>
                        </span>
                      )}
                    </div>

                    {m.family && (
                      <p className="text-xs text-text-secondary">
                        Family: <strong className="text-text-primary font-medium">{m.family}</strong>
                      </p>
                    )}

                    {/* Attribute Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {m.isReasoning && (
                        <Badge variant="accent" className="text-[10px] gap-1 px-1.5 py-0">
                          <Sparkles className="h-2.5 w-2.5" />
                          <span>Reasoning</span>
                        </Badge>
                      )}

                      {m.isOpenWeight === true ? (
                        <Badge variant="success" className="text-[10px] gap-1 px-1.5 py-0">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          <span>Open Weights</span>
                        </Badge>
                      ) : m.isOpenWeight === false ? (
                        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 text-text-tertiary">
                          <Lock className="h-2.5 w-2.5" />
                          <span>Proprietary</span>
                        </Badge>
                      ) : null}

                      {/* Relationship Roles */}
                      {m.relationshipTypes?.map((role) => (
                        <span
                          key={role}
                          className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-surface-elevated text-text-tertiary"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-border/50 text-[11px] text-text-tertiary flex items-center justify-between">
                    <span>View Specifications</span>
                    <ArrowRight className="h-3 w-3 text-accent" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
