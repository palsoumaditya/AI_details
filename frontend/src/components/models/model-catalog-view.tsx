"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ModelCard, ModelCardSkeleton } from "./model-card";
import { ModelSearch } from "./model-search";
import { ModelSortSelect } from "./model-sort-select";
import { ModelPagination } from "./model-pagination";
import { ModelFilters, type ModelFiltersState } from "./model-filters";
import type {
  ModelCatalogItemDto,
  ModelCatalogSort,
  PaginationMeta,
  ApiPaginatedResponse,
  ApiErrorResponse,
} from "@oneatlas/backend/shared";
import {
  Compass,
  AlertTriangle,
  RotateCcw,
  X,
  Sparkles,
} from "lucide-react";

export function ModelCatalogView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  // Network State
  const [models, setModels] = useState<ModelCatalogItemDto[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read current parameters directly from URL as single source of truth
  const query = searchParams.get("q") || "";
  const sort = (searchParams.get("sort") as ModelCatalogSort) || "newest";
  const lab = searchParams.get("lab") || undefined;
  const provider = searchParams.get("provider") || undefined;
  const modality = searchParams.get("modality") || undefined;
  const reasoning =
    searchParams.get("reasoning") === "true"
      ? true
      : searchParams.get("reasoning") === "false"
      ? false
      : undefined;
  const openWeights =
    searchParams.get("openWeights") === "true"
      ? true
      : searchParams.get("openWeights") === "false"
      ? false
      : undefined;
  const minimumContext = searchParams.get("minimumContext")
    ? parseInt(searchParams.get("minimumContext")!, 10)
    : undefined;
  const maximumContext = searchParams.get("maximumContext")
    ? parseInt(searchParams.get("maximumContext")!, 10)
    : undefined;
  const maximumInputPrice = searchParams.get("maximumInputPrice")
    ? parseFloat(searchParams.get("maximumInputPrice")!)
    : undefined;
  const maximumOutputPrice = searchParams.get("maximumOutputPrice")
    ? parseFloat(searchParams.get("maximumOutputPrice")!)
    : undefined;

  // Active filters count (excluding sort and page)
  const activeFiltersCount = [
    query,
    lab,
    provider,
    modality,
    reasoning !== undefined,
    openWeights !== undefined,
    minimumContext !== undefined,
    maximumContext !== undefined,
    maximumInputPrice !== undefined,
    maximumOutputPrice !== undefined,
  ].filter(Boolean).length;

  const filtersState: ModelFiltersState = {
    lab,
    provider,
    modality,
    reasoning,
    openWeights,
    minimumContext,
    maximumContext,
    maximumInputPrice,
    maximumOutputPrice,
  };

  // Centralized URL synchronizer
  const updateUrlParams = useCallback(
    (updates: Record<string, string | null | undefined>, replace = true) => {
      const current = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, val]) => {
        if (val === null || val === undefined || val === "") {
          current.delete(key);
        } else {
          current.set(key, val);
        }
      });

      const queryString = current.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

      setIsLoading(true);
      setIsSearching(true);

      startTransition(() => {
        if (replace) {
          router.replace(newUrl, { scroll: false });
        } else {
          router.push(newUrl, { scroll: false });
        }
      });
    },
    [searchParams, pathname, router]
  );

  // Primary Fetch Effect responding to URL changes
  useEffect(() => {
    let ignore = false;
    const abortController = new AbortController();

    async function executeFetch() {
      try {
        const queryString = searchParams.toString();
        const endpoint = queryString
          ? `/api/v1/models?${queryString}`
          : `/api/v1/models`;

        const response = await fetch(endpoint, {
          signal: abortController.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          const errorJson: ApiErrorResponse = await response.json();
          throw new Error(
            errorJson.error?.message ||
              `HTTP ${response.status}: Failed to fetch models`
          );
        }

        const json: ApiPaginatedResponse<ModelCatalogItemDto> =
          await response.json();

        if (!ignore && json.success) {
          setModels(json.data);
          setPagination(json.meta.pagination);
          setError(null);
          setIsLoading(false);
          setIsSearching(false);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!ignore) {
          setError(
            err instanceof Error ? err.message : "Failed to load model catalog."
          );
          setIsLoading(false);
          setIsSearching(false);
        }
      }
    }

    void executeFetch();

    return () => {
      ignore = true;
      abortController.abort();
    };
  }, [searchParams]);

  // Handlers
  const handleSearchChange = (newQuery: string) => {
    updateUrlParams({
      q: newQuery.trim() || null,
      page: "1", // reset page on search
    });
  };

  const handleSortChange = (newSort: ModelCatalogSort) => {
    updateUrlParams({
      sort: newSort,
      page: "1",
    });
  };

  const handleFiltersChange = (newFilters: ModelFiltersState) => {
    updateUrlParams({
      lab: newFilters.lab || null,
      provider: newFilters.provider || null,
      modality: newFilters.modality || null,
      reasoning:
        newFilters.reasoning !== undefined
          ? String(newFilters.reasoning)
          : null,
      openWeights:
        newFilters.openWeights !== undefined
          ? String(newFilters.openWeights)
          : null,
      minimumContext:
        newFilters.minimumContext !== undefined
          ? String(newFilters.minimumContext)
          : null,
      maximumContext:
        newFilters.maximumContext !== undefined
          ? String(newFilters.maximumContext)
          : null,
      maximumInputPrice:
        newFilters.maximumInputPrice !== undefined
          ? String(newFilters.maximumInputPrice)
          : null,
      maximumOutputPrice:
        newFilters.maximumOutputPrice !== undefined
          ? String(newFilters.maximumOutputPrice)
          : null,
      page: "1", // reset page on filter change
    });
  };

  const handleResetFilters = () => {
    setIsLoading(true);
    setIsSearching(true);
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams({ page: String(newPage) }, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetry = () => {
    setIsLoading(true);
    setIsSearching(true);
    setError(null);
    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/v1/models?${queryString}`
      : `/api/v1/models`;

    fetch(endpoint, {
      headers: { Accept: "application/json" },
    })
      .then((res) => res.json())
      .then((json: ApiPaginatedResponse<ModelCatalogItemDto>) => {
        if (json.success) {
          setModels(json.data);
          setPagination(json.meta.pagination);
          setError(null);
        } else {
          setError("Failed to fetch model catalog");
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to retry");
      })
      .finally(() => {
        setIsLoading(false);
        setIsSearching(false);
      });
  };

  return (
    <div className="max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <PageHeader
        title="Explore AI Models"
        description="Unified developer intelligence catalog for frontier and open-weight models across major AI research labs and inference providers."
        badge="Discovery"
        annotation="frontier & open-weight intelligence"
      >
        {pagination && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary bg-surface-elevated border border-border px-3 py-1.5 rounded-lg">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>
              <strong className="text-text-primary font-semibold">
                {pagination.total}
              </strong>{" "}
              Models Available
            </span>
          </div>
        )}
      </PageHeader>

      {/* Main Search and Sort Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <ModelSearch
          value={query}
          onChange={handleSearchChange}
          isSearching={isSearching}
          className="flex-1"
        />
        <div className="flex items-center gap-2 shrink-0">
          <ModelSortSelect value={sort} onChange={handleSortChange} />
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {activeFiltersCount > 0 && (
        <div className="mb-6 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-text-tertiary">Active filters:</span>

          {query && (
            <Badge variant="outline" className="gap-1 bg-surface-elevated">
              <span>Search: &ldquo;{query}&rdquo;</span>
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                aria-label="Remove search filter"
                className="hover:text-text-primary ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {lab && (
            <Badge variant="outline" className="gap-1 bg-surface-elevated">
              <span>Lab: {lab}</span>
              <button
                type="button"
                onClick={() => updateUrlParams({ lab: null, page: "1" })}
                aria-label="Remove lab filter"
                className="hover:text-text-primary ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {provider && (
            <Badge variant="outline" className="gap-1 bg-surface-elevated">
              <span>Provider: {provider}</span>
              <button
                type="button"
                onClick={() => updateUrlParams({ provider: null, page: "1" })}
                aria-label="Remove provider filter"
                className="hover:text-text-primary ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {modality && (
            <Badge variant="outline" className="gap-1 bg-surface-elevated">
              <span>Modality: {modality}</span>
              <button
                type="button"
                onClick={() => updateUrlParams({ modality: null, page: "1" })}
                aria-label="Remove modality filter"
                className="hover:text-text-primary ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {reasoning !== undefined && (
            <Badge variant="outline" className="gap-1 bg-surface-elevated">
              <span>Reasoning: {reasoning ? "Yes" : "No"}</span>
              <button
                type="button"
                onClick={() => updateUrlParams({ reasoning: null, page: "1" })}
                aria-label="Remove reasoning filter"
                className="hover:text-text-primary ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {openWeights !== undefined && (
            <Badge variant="outline" className="gap-1 bg-surface-elevated">
              <span>Weights: {openWeights ? "Open" : "Proprietary"}</span>
              <button
                type="button"
                onClick={() => updateUrlParams({ openWeights: null, page: "1" })}
                aria-label="Remove weights filter"
                className="hover:text-text-primary ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {minimumContext !== undefined && (
            <Badge variant="outline" className="gap-1 bg-surface-elevated">
              <span>Min Context: {minimumContext.toLocaleString()}</span>
              <button
                type="button"
                onClick={() => updateUrlParams({ minimumContext: null, page: "1" })}
                aria-label="Remove min context filter"
                className="hover:text-text-primary ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {(maximumInputPrice !== undefined || maximumOutputPrice !== undefined) && (
            <Badge variant="outline" className="gap-1 bg-surface-elevated">
              <span>
                Price Limit: In &le; ${maximumInputPrice ?? "∞"} | Out &le; $
                {maximumOutputPrice ?? "∞"}
              </span>
              <button
                type="button"
                onClick={() =>
                  updateUrlParams({
                    maximumInputPrice: null,
                    maximumOutputPrice: null,
                    page: "1",
                  })
                }
                aria-label="Remove price filter"
                className="hover:text-text-primary ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-text-secondary hover:text-accent ml-1 underline transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main Two-Column Layout (Sidebar Filters + Models Grid) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Filters Sidebar */}
        <ModelFilters
          filters={filtersState}
          onChange={handleFiltersChange}
          onReset={handleResetFilters}
          activeCount={activeFiltersCount}
        />

        {/* Content Section: Loading, Error, Empty, or Model Grid */}
        <div className="flex-1 w-full min-w-0">
          {error ? (
            /* Error State */
            <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated text-accent">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-text-primary">
                  Unable to load model catalog
                </h3>
                <p className="text-sm text-text-secondary max-w-md mx-auto">
                  {error}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retry Connection</span>
              </Button>
            </div>
          ) : isLoading ? (
            /* Loading Skeleton Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <ModelCardSkeleton key={i} />
              ))}
            </div>
          ) : models.length === 0 ? (
            /* Empty State */
            <EmptyState
              icon={<Compass className="h-7 w-7" />}
              title="No models found"
              description={
                activeFiltersCount > 0
                  ? "We couldn't find any models matching your search or active filter criteria. Try adjusting your parameters or clear all filters."
                  : "No models are currently registered in the database catalog."
              }
              actionLabel={activeFiltersCount > 0 ? "Clear All Filters" : undefined}
              actionHref={activeFiltersCount > 0 ? "/models" : undefined}
            />
          ) : (
            /* Functional Model Card Grid */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {models.map((model) => (
                  <ModelCard key={model.id || model.slug} model={model} />
                ))}
              </div>

              {/* Pagination Controls */}
              {pagination && (
                <ModelPagination
                  pagination={pagination}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
