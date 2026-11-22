"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ProviderCard, ProviderCardSkeleton } from "./provider-card";
import type {
  ProviderDirectoryItemDto,
  PaginationMeta,
  ApiPaginatedResponse,
  ApiErrorResponse,
} from "@oneatlas/backend/shared";
import {
  Server,
  Search,
  X,
  Loader2,
  ArrowUpDown,
  RotateCcw,
  AlertTriangle,
  Radio,
} from "lucide-react";

const PROVIDER_SORTS = [
  { value: "name_asc", label: "Name (A to Z)" },
  { value: "name_desc", label: "Name (Z to A)" },
  { value: "models_desc", label: "Most Models Hosted" },
  { value: "endpoints_desc", label: "Most Endpoints" },
] as const;

type ProviderSort = (typeof PROVIDER_SORTS)[number]["value"];

const PROVIDER_TYPES = [
  { value: "DIRECT", label: "Direct Lab API" },
  { value: "CLOUD", label: "Cloud Platform" },
  { value: "AGGREGATOR", label: "API Aggregator" },
  { value: "HOSTING", label: "Specialized Hosting" },
];

export function ProviderDirectoryView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [providers, setProviders] = useState<ProviderDirectoryItemDto[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get("q") || "";
  const providerType = searchParams.get("providerType") || "";
  const hasOnlineEndpoints = searchParams.get("hasOnlineEndpoints") === "true";
  const sort = (searchParams.get("sort") as ProviderSort) || "name_asc";

  const [localSearch, setLocalSearch] = useState(query);
  const [prevSearch, setPrevSearch] = useState(query);

  if (query !== prevSearch) {
    setPrevSearch(query);
    setLocalSearch(query);
  }

  const activeFiltersCount = [
    query,
    providerType,
    hasOnlineEndpoints ? "online" : undefined,
  ].filter(Boolean).length;

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

  // 300ms debounce for text search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== query) {
        updateUrlParams({
          q: localSearch.trim() || null,
          page: "1",
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, query, updateUrlParams]);

  // Primary Fetch Effect
  useEffect(() => {
    let ignore = false;
    const abortController = new AbortController();

    async function executeFetch() {
      try {
        const queryString = searchParams.toString();
        const endpoint = queryString
          ? `/api/v1/providers?${queryString}`
          : `/api/v1/providers`;

        const response = await fetch(endpoint, {
          signal: abortController.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          const errJson: ApiErrorResponse = await response.json();
          throw new Error(errJson.error?.message || "Failed to fetch providers");
        }

        const json: ApiPaginatedResponse<ProviderDirectoryItemDto> = await response.json();
        if (!ignore && json.success) {
          setProviders(json.data);
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
          setError(err instanceof Error ? err.message : "Failed to load providers");
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

  const handleTypeChange = (newType: string) => {
    updateUrlParams({
      providerType: newType || null,
      page: "1",
    });
  };

  const handleOnlineToggle = () => {
    updateUrlParams({
      hasOnlineEndpoints: hasOnlineEndpoints ? null : "true",
      page: "1",
    });
  };

  const handleSortChange = (newSort: ProviderSort) => {
    updateUrlParams({
      sort: newSort,
      page: "1",
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

  return (
    <div className="max-w-7xl mx-auto pb-16">
      {/* Header */}
      <PageHeader
        title="Inference Providers"
        description="Discover and evaluate AI execution infrastructure, cloud providers, hardware-accelerated endpoints, and model routing aggregators."
        badge="Infrastructure"
      >
        {pagination && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary bg-surface-elevated border border-border px-3 py-1.5 rounded-lg">
            <Server className="h-3.5 w-3.5 text-accent" />
            <span>
              <strong className="text-text-primary font-semibold">
                {pagination.total}
              </strong>{" "}
              Providers Indexed
            </span>
          </div>
        )}
      </PageHeader>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search inference providers by name or slug..."
            aria-label="Search providers"
            className="flex h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-10 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-transparent transition-colors"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isSearching && (
              <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
            )}
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch("")}
                className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Provider Type Selector */}
        <div className="relative shrink-0">
          <select
            value={providerType}
            onChange={(e) => handleTypeChange(e.target.value)}
            aria-label="Filter by provider type"
            className="h-10 pl-3 pr-8 text-xs font-medium rounded-lg border border-border bg-surface text-text-primary hover:border-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors appearance-none cursor-pointer"
          >
            <option value="">All Provider Types</option>
            {PROVIDER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-tertiary">
            ▼
          </div>
        </div>

        {/* Online Toggle Button */}
        <Button
          type="button"
          variant={hasOnlineEndpoints ? "secondary" : "outline"}
          size="sm"
          onClick={handleOnlineToggle}
          className={`h-10 text-xs gap-1.5 shrink-0 ${
            hasOnlineEndpoints ? "border-success/50 text-success" : ""
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          <span>Active Endpoints Only</span>
        </Button>

        {/* Sort Selector */}
        <div className="relative shrink-0 inline-flex items-center">
          <ArrowUpDown className="absolute left-3 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value as ProviderSort)}
            aria-label="Sort providers"
            className="h-10 pl-8 pr-8 text-xs font-medium rounded-lg border border-border bg-surface text-text-primary hover:border-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors appearance-none cursor-pointer"
          >
            {PROVIDER_SORTS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-tertiary">
            ▼
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="mb-6 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-text-tertiary">Active filters:</span>
          {query && (
            <Badge variant="outline" className="gap-1 bg-surface-elevated">
              <span>Query: &ldquo;{query}&rdquo;</span>
              <button
                type="button"
                onClick={() => setLocalSearch("")}
                className="hover:text-text-primary ml-0.5"
                aria-label="Remove search filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {providerType && (
            <Badge variant="outline" className="gap-1 bg-surface-elevated">
              <span>Type: {providerType}</span>
              <button
                type="button"
                onClick={() => handleTypeChange("")}
                className="hover:text-text-primary ml-0.5"
                aria-label="Remove provider type filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {hasOnlineEndpoints && (
            <Badge variant="outline" className="gap-1 bg-surface-elevated text-success border-success/40">
              <span>Active Endpoints</span>
              <button
                type="button"
                onClick={handleOnlineToggle}
                className="hover:text-text-primary ml-0.5"
                aria-label="Remove active endpoints filter"
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

      {/* Main Grid View */}
      {error ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated text-accent">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text-primary">
              Unable to load inference providers
            </h3>
            <p className="text-sm text-text-secondary max-w-md mx-auto">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsLoading(true);
              setLocalSearch("");
            }}
            className="gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Retry Connection</span>
          </Button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProviderCardSkeleton key={i} />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <EmptyState
          icon={<Server className="h-7 w-7" />}
          title="No inference providers found"
          description={
            activeFiltersCount > 0
              ? "No providers match your filter criteria. Try resetting your search or filters."
              : "No inference providers are currently registered in the catalog."
          }
          actionLabel={activeFiltersCount > 0 ? "Clear All Filters" : undefined}
          actionHref={activeFiltersCount > 0 ? "/providers" : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((p) => (
              <ProviderCard key={p.id || p.slug} provider={p} />
            ))}
          </div>

          {pagination && (
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              itemLabel="inference providers"
            />
          )}
        </>
      )}
    </div>
  );
}
