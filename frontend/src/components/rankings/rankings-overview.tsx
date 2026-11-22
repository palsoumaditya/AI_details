"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BenchmarkCard, BenchmarkCardSkeleton } from "./benchmark-card";
import { BenchmarkCategoryFilter } from "./benchmark-category-filter";
import type {
  BenchmarkDirectoryItemDto,
  RankingsDirectoryResult,
  ApiSuccessResponse,
  ApiErrorResponse,
} from "@oneatlas/backend/shared";
import {
  Trophy,
  Search,
  X,
  Loader2,
  RotateCcw,
  AlertTriangle,
  Layers,
} from "lucide-react";

export function RankingsOverview() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [benchmarks, setBenchmarks] = useState<BenchmarkDirectoryItemDto[]>([]);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [totalBenchmarks, setTotalBenchmarks] = useState(0);
  const [totalEvaluatedModels, setTotalEvaluatedModels] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";

  const [localSearch, setLocalSearch] = useState(query);
  const [prevSearch, setPrevSearch] = useState(query);

  if (query !== prevSearch) {
    setPrevSearch(query);
    setLocalSearch(query);
  }

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
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        if (replace) {
          router.replace(targetUrl, { scroll: false });
        } else {
          router.push(targetUrl, { scroll: false });
        }
      });
    },
    [searchParams, pathname, router]
  );

  // Debounced search handler
  useEffect(() => {
    if (localSearch === query) return;

    const timer = setTimeout(() => {
      updateUrlParams({ q: localSearch || null });
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, query, updateUrlParams]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch directory from API
  useEffect(() => {
    let ignore = false;
    const abortController = new AbortController();

    async function executeFetch() {
      try {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (query) params.set("q", query);

        const res = await fetch(`/api/v1/rankings?${params.toString()}`, {
          signal: abortController.signal,
          headers: { Accept: "application/json" },
        });
        const json: ApiSuccessResponse<RankingsDirectoryResult> | ApiErrorResponse =
          await res.json();

        if (!res.ok || !json.success) {
          throw new Error(
            ("error" in json && json.error.message) ||
              "Failed to load rankings directory"
          );
        }

        if (!ignore) {
          setBenchmarks(json.data.benchmarks);
          setCategories(json.data.categories);
          setTotalBenchmarks(json.data.totalBenchmarks);
          setTotalEvaluatedModels(json.data.totalEvaluatedModels);
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
            err instanceof Error ? err.message : "An unexpected network error occurred."
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
  }, [category, query, refreshTrigger]);

  const handleRetry = () => {
    setIsSearching(true);
    setRefreshTrigger((c) => c + 1);
  };

  const handleSelectCategory = (newCategory: string) => {
    updateUrlParams({ category: newCategory || null });
  };

  const handleClearFilters = () => {
    setLocalSearch("");
    updateUrlParams({ q: null, category: null });
  };

  const hasActiveFilters = Boolean(query || category);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Rankings & Benchmarks"
        description="Explore standardized AI model evaluations across reasoning, coding, knowledge, and throughput leaderboards."
        badge="Leaderboards"
        annotation="verified benchmarks & leaderboards"
      />

      {/* Directory Metrics & Summary Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-text-secondary">
          <Trophy className="h-4 w-4 text-accent" />
          <span>Total Benchmarks:</span>
          <span className="font-mono font-bold text-text-primary">
            {totalBenchmarks}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-text-secondary">
          <Layers className="h-4 w-4 text-emerald-400" />
          <span>Evaluated Models:</span>
          <span className="font-mono font-bold text-text-primary">
            {totalEvaluatedModels}
          </span>
        </div>

        {isSearching && (
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
            <span>Updating benchmarks...</span>
          </div>
        )}
      </div>

      {/* Category Pills & Search Controls */}
      <div className="space-y-4">
        <BenchmarkCategoryFilter
          categories={categories}
          selectedCategory={category}
          onSelectCategory={handleSelectCategory}
          totalCount={totalBenchmarks}
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search benchmarks by name, category, or description..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-accent transition-colors"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs text-text-secondary hover:text-text-primary h-8.5 gap-1.5 self-start sm:self-auto shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </Button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="text-xs text-red-300 border-red-500/30 hover:bg-red-500/20"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <BenchmarkCardSkeleton key={i} />
          ))}
        </div>
      ) : benchmarks.length > 0 ? (
        /* Benchmark Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {benchmarks.map((benchmark) => (
            <BenchmarkCard key={benchmark.id} benchmark={benchmark} />
          ))}
        </div>
      ) : (
        /* Empty Filter State */
        <EmptyState
          icon={<Trophy className="h-6 w-6 text-text-tertiary" />}
          title="No benchmarks found"
          description={
            hasActiveFilters
              ? "No benchmarks match your active filters or search criteria. Try broadening your search or resetting filters."
              : "No benchmark datasets are registered in the system yet."
          }
          actionLabel={hasActiveFilters ? "View All Benchmarks" : "Back to Discover"}
          actionHref={hasActiveFilters ? "/rankings" : "/models"}
        />
      )}
    </div>
  );
}
