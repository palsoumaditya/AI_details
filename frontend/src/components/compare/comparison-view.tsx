"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModelSelector } from "./model-selector";
import { ComparisonHeader } from "./comparison-header";
import { ComparisonSpecificationTable } from "./comparison-specification-table";
import { ComparisonPricing } from "./comparison-pricing";
import { ComparisonBenchmarks } from "./comparison-benchmarks";
import { ComparisonProviderTable } from "./comparison-provider-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ModelComparisonDto } from "@oneatlas/backend/shared";
import { AlertCircle, RefreshCw, GitCompareArrows } from "lucide-react";

/**
 * Multi-model comparison workspace component.
 *
 * Coordinates side-by-side comparative analysis of 2 to 4 canonical AI models.
 * Synchronizes selected model slugs with the `?models=slug1,slug2` URL query parameter,
 * displaying synchronized specification tables, pricing differentials, and benchmark matrices.
 */
export function ComparisonView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialModelsParam = searchParams.get("models");
  const initialSlugs = initialModelsParam
    ? initialModelsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(initialSlugs);
  const [data, setData] = useState<ModelComparisonDto | null>(null);
  const [isLoading, setIsLoading] = useState(initialSlugs.length >= 2);
  const [error, setError] = useState<string | null>(null);

  /**
   * Synchronizes active comparison models to URL query parameters without full page reload.
   */
  const updateUrl = useCallback(
    (slugs: string[]) => {
      const params = new URLSearchParams(window.location.search);
      if (slugs.length > 0) {
        params.set("models", slugs.join(","));
      } else {
        params.delete("models");
      }
      const newUrl = params.toString() ? `/compare?${params.toString()}` : "/compare";
      router.replace(newUrl, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    let ignore = false;
    const abortController = new AbortController();

    async function executeFetch() {
      if (selectedSlugs.length < 2) {
        return;
      }

      try {
        const res = await fetch("/api/v1/compare", {
          method: "POST",
          signal: abortController.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelSlugs: selectedSlugs }),
        });

        const json = await res.json();
        if (!ignore) {
          if (!res.ok || !json.success) {
            throw new Error(json.error?.message || "Failed to fetch model comparison data.");
          }
          setData(json.data);
          setError(null);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!ignore) {
          setError(err instanceof Error ? err.message : "An unexpected error occurred.");
          setIsLoading(false);
        }
      }
    }

    executeFetch();

    return () => {
      ignore = true;
      abortController.abort();
    };
  }, [selectedSlugs]);

  const handleAddSlug = (slug: string) => {
    if (!selectedSlugs.includes(slug) && selectedSlugs.length < 4) {
      const updated = [...selectedSlugs, slug];
      setSelectedSlugs(updated);
      updateUrl(updated);
      if (updated.length >= 2) {
        setIsLoading(true);
        setError(null);
      }
    }
  };

  const handleRemoveSlug = (slug: string) => {
    const updated = selectedSlugs.filter((s) => s !== slug);
    setSelectedSlugs(updated);
    updateUrl(updated);
    if (updated.length >= 2) {
      setIsLoading(true);
      setError(null);
    } else {
      setData(null);
      setIsLoading(false);
      setError(null);
    }
  };

  const handleSelectPreset = (slugs: string[]) => {
    setSelectedSlugs(slugs);
    updateUrl(slugs);
    setIsLoading(true);
    setError(null);
  };

  const handleClearAll = () => {
    setSelectedSlugs([]);
    updateUrl([]);
    setData(null);
    setIsLoading(false);
    setError(null);
  };

  const handleRetry = () => {
    if (selectedSlugs.length < 2) return;
    setIsLoading(true);
    setError(null);

    fetch("/api/v1/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelSlugs: selectedSlugs }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          throw new Error(json.error?.message || "Failed to fetch model comparison data.");
        }
        setData(json.data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        setIsLoading(false);
      });
  };

  return (
    <div className="space-y-8">
      <ModelSelector
        selectedSlugs={selectedSlugs}
        onAddSlug={handleAddSlug}
        onRemoveSlug={handleRemoveSlug}
        onSelectPreset={handleSelectPreset}
        onClearAll={handleClearAll}
      />

      {selectedSlugs.length < 2 && (
        <Card className="p-8 text-center space-y-4 bg-surface border-border">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-elevated text-accent">
            <GitCompareArrows className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text-primary">
              Select at least 2 models to compare
            </h3>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              Choose between 2 and 4 AI models using the search box above or click one of the popular preset pairs to inspect side-by-side technical specs, inference costs, and benchmark evaluations.
            </p>
          </div>
        </Card>
      )}

      {error && selectedSlugs.length >= 2 && (
        <Card className="p-6 bg-red-500/10 border-red-500/30 text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-text-primary">
              Comparison Unavailable
            </h3>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              {error}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="text-xs gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-xs"
            >
              Clear Selection
            </Button>
          </div>
        </Card>
      )}

      {isLoading && selectedSlugs.length >= 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {selectedSlugs.map((slug) => (
              <Skeleton key={slug} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      )}

      {!isLoading && !error && data && data.models.length >= 2 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <ComparisonHeader
            models={data.models}
            onRemoveModel={handleRemoveSlug}
          />

          <ComparisonPricing
            models={data.models}
            specsSummary={data.comparisonMatrix.specsSummary}
          />

          <ComparisonSpecificationTable
            models={data.models}
            specsSummary={data.comparisonMatrix.specsSummary}
          />

          <ComparisonBenchmarks
            models={data.models}
            benchmarks={data.comparisonMatrix.benchmarks}
          />

          <ComparisonProviderTable models={data.models} />
        </div>
      )}
    </div>
  );
}
