"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LeaderboardTable, LeaderboardTableSkeleton } from "./leaderboard-table";
import { LeaderboardFilters } from "./leaderboard-filters";
import { LeaderboardPagination } from "./leaderboard-pagination";
import type {
  BenchmarkLeaderboardResult,
  ApiSuccessResponse,
  ApiErrorResponse,
} from "@oneatlas/backend/shared";
import { formatDate } from "@/lib/formatters";
import {
  Trophy,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Layers,
  Calendar,
  AlertTriangle,
  Loader2,
  Info,
} from "lucide-react";

export interface LeaderboardViewProps {
  benchmarkSlug: string;
}

/**
 * Benchmark leaderboard view displaying competitive model rankings.
 *
 * Implements Standard Competition Ranking ("1224" rank scheme) where tied models receive equal
 * ranks and subsequent ranks skip. Supports URL-synchronized search, lab filtering, and pagination.
 */
export function LeaderboardView({ benchmarkSlug }: LeaderboardViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [data, setData] = useState<BenchmarkLeaderboardResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get("q") || "";
  const lab = searchParams.get("lab") || "";
  const sort = searchParams.get("sort") || "rank_asc";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [localSearch, setLocalSearch] = useState(query);
  const [prevSearch, setPrevSearch] = useState(query);

  if (query !== prevSearch) {
    setPrevSearch(query);
    setLocalSearch(query);
  }

  const [localLab, setLocalLab] = useState(lab);
  const [prevLab, setPrevLab] = useState(lab);

  if (lab !== prevLab) {
    setPrevLab(lab);
    setLocalLab(lab);
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

  // Debounced search handlers
  useEffect(() => {
    if (localSearch === query) return;
    const timer = setTimeout(() => {
      updateUrlParams({ q: localSearch || null, page: "1" });
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, query, updateUrlParams]);

  useEffect(() => {
    if (localLab === lab) return;
    const timer = setTimeout(() => {
      updateUrlParams({ lab: localLab || null, page: "1" });
    }, 300);
    return () => clearTimeout(timer);
  }, [localLab, lab, updateUrlParams]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch benchmark leaderboard data
  useEffect(() => {
    let ignore = false;
    const abortController = new AbortController();

    async function executeFetch() {
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (lab) params.set("lab", lab);
        if (sort) params.set("sort", sort);
        if (page > 1) params.set("page", page.toString());

        const res = await fetch(
          `/api/v1/rankings/${benchmarkSlug}?${params.toString()}`,
          {
            signal: abortController.signal,
            headers: { Accept: "application/json" },
          }
        );
        const json: ApiSuccessResponse<BenchmarkLeaderboardResult> | ApiErrorResponse =
          await res.json();

        if (!res.ok || !json.success) {
          throw new Error(
            ("error" in json && json.error.message) || "Failed to load benchmark leaderboard"
          );
        }

        if (!ignore) {
          setData(json.data);
          setError(null);
          setIsLoading(false);
          setIsUpdating(false);
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
          setIsUpdating(false);
        }
      }
    }

    void executeFetch();

    return () => {
      ignore = true;
      abortController.abort();
    };
  }, [benchmarkSlug, query, lab, sort, page, refreshTrigger]);

  const handleRetry = () => {
    setIsUpdating(true);
    setRefreshTrigger((c) => c + 1);
  };

  const handleSortChange = (newSort: string) => {
    updateUrlParams({ sort: newSort, page: "1" });
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams({ page: newPage > 1 ? newPage.toString() : null }, false);
  };

  const handleResetFilters = () => {
    setLocalSearch("");
    setLocalLab("");
    updateUrlParams({ q: null, lab: null, sort: null, page: null });
  };

  const hasActiveFilters = Boolean(query || lab || sort !== "rank_asc" || page > 1);

  const formatUnitDisplay = (unit: string) => {
    switch (unit) {
      case "PERCENTAGE":
        return "%";
      case "TOKENS_PER_SEC":
        return "tok/s";
      case "MILLISECONDS":
        return "ms";
      default:
        return unit.toLowerCase();
    }
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-6 w-36 rounded bg-surface-elevated animate-pulse" />
        <div className="h-28 rounded-xl bg-surface border border-border animate-pulse" />
        <LeaderboardTableSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Link
          href="/rankings"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to All Benchmarks</span>
        </Link>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-400 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span>Benchmark not found or unavailable</span>
          </div>
          <p className="text-xs text-red-300">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="text-xs text-red-300 border-red-500/30 hover:bg-red-500/20"
          >
            Retry Request
          </Button>
        </div>
      </div>
    );
  }

  const benchmark = data?.benchmark;
  const rankings = data?.rankings ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <Link
          href="/rankings"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to All Benchmarks</span>
        </Link>
      </div>

      {benchmark && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-elevated text-accent shrink-0">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                    {benchmark.name}
                  </h1>
                  <span className="homemade-apple-regular text-sm text-slate-500 select-none">
                    ~ standard competition ranking
                  </span>
                  <Badge variant="accent" className="text-[10px] uppercase font-mono">
                    {benchmark.category}
                  </Badge>
                  <span className="text-xs font-mono text-text-tertiary">
                    v{benchmark.version}
                  </span>
                </div>
                <p className="text-xs font-mono text-text-tertiary">
                  slug: {benchmark.slug}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs gap-1.5 py-1 px-2.5">
                <span>{benchmark.metricName}</span>
                <span className="text-text-tertiary font-mono">
                  ({formatUnitDisplay(benchmark.metricUnit)})
                </span>
              </Badge>

              {benchmark.higherIsBetter ? (
                <Badge
                  variant="outline"
                  className="text-xs gap-1.5 py-1 px-2.5 text-slate-700 border-slate-200 bg-white"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Higher is better</span>
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs gap-1.5 py-1 px-2.5 text-slate-700 border-slate-200 bg-white"
                >
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>Lower is better</span>
                </Badge>
              )}
            </div>
          </div>

          {benchmark.description && (
            <p className="text-sm text-text-secondary leading-relaxed pt-1">
              {benchmark.description}
            </p>
          )}

          <div className="flex items-center gap-4 flex-wrap pt-3 border-t border-border/60 text-xs text-text-tertiary">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              <span className="font-medium text-text-primary">
                {benchmark.evaluatedModelCount}
              </span>
              <span>models evaluated</span>
            </div>

            {benchmark.latestEvaluationDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Latest evaluation:</span>
                <span className="text-text-primary">
                  {formatDate(benchmark.latestEvaluationDate)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 text-[11px] text-text-tertiary ml-auto">
              <Info className="h-3 w-3" />
              <span>Standard Competition Ranking (&quot;1224&quot;)</span>
            </div>
          </div>
        </div>
      )}

      <LeaderboardFilters
        searchQuery={localSearch}
        onSearchChange={setLocalSearch}
        selectedLab={localLab}
        onLabChange={setLocalLab}
        selectedSort={sort}
        onSortChange={handleSortChange}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {isUpdating && (
        <div className="flex items-center gap-1.5 text-xs text-text-tertiary animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
          <span>Updating leaderboard...</span>
        </div>
      )}

      {benchmark && (
        <LeaderboardTable
          rankings={rankings}
          metricName={benchmark.metricName}
          metricUnit={benchmark.metricUnit}
          higherIsBetter={benchmark.higherIsBetter}
          benchmarkSlug={benchmarkSlug}
        />
      )}

      {pagination && (
        <LeaderboardPagination
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
