"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { LabCard, LabCardSkeleton } from "./lab-card";
import type {
  AiLabDirectoryItemDto,
  PaginationMeta,
  ApiPaginatedResponse,
  ApiErrorResponse,
} from "@oneatlas/backend/shared";
import {
  FlaskConical,
  Search,
  X,
  Loader2,
  ArrowUpDown,
  RotateCcw,
  AlertTriangle,
  Globe,
} from "lucide-react";

const LAB_SORTS = [
  { value: "name_asc", label: "Name (A to Z)" },
  { value: "name_desc", label: "Name (Z to A)" },
  { value: "models_desc", label: "Most Models" },
] as const;

type LabSort = (typeof LAB_SORTS)[number]["value"];

const COMMON_COUNTRIES = [
  "United States",
  "France",
  "China",
  "United Kingdom",
  "Germany",
  "Canada",
];

export function LabDirectoryView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [labs, setLabs] = useState<AiLabDirectoryItemDto[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get("q") || "";
  const country = searchParams.get("country") || "";
  const sort = (searchParams.get("sort") as LabSort) || "name_asc";

  const [localSearch, setLocalSearch] = useState(query);
  const [prevSearch, setPrevSearch] = useState(query);

  if (query !== prevSearch) {
    setPrevSearch(query);
    setLocalSearch(query);
  }

  const activeFiltersCount = [query, country].filter(Boolean).length;

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
          ? `/api/v1/labs?${queryString}`
          : `/api/v1/labs`;

        const response = await fetch(endpoint, {
          signal: abortController.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          const errJson: ApiErrorResponse = await response.json();
          throw new Error(errJson.error?.message || "Failed to fetch labs directory");
        }

        const json: ApiPaginatedResponse<AiLabDirectoryItemDto> = await response.json();
        if (!ignore && json.success) {
          setLabs(json.data);
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
          setError(err instanceof Error ? err.message : "Failed to load AI labs");
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

  const handleCountryChange = (newCountry: string) => {
    updateUrlParams({
      country: newCountry || null,
      page: "1",
    });
  };

  const handleSortChange = (newSort: LabSort) => {
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
        title="AI Research Labs"
        description="Explore pioneering AI research laboratories, frontier foundation model creators, open-weight publishers, and academic research institutions."
        badge="Organizations"
        annotation="research organizations & creators"
      >
        {pagination && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary bg-surface-elevated border border-border px-3 py-1.5 rounded-lg">
            <FlaskConical className="h-3.5 w-3.5 text-accent" />
            <span>
              <strong className="text-text-primary font-semibold">
                {pagination.total}
              </strong>{" "}
              Labs Indexed
            </span>
          </div>
        )}
      </PageHeader>

      {/* Toolbar (Search, Country, Sort) */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search AI labs by name or slug..."
            aria-label="Search AI labs"
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

        {/* Country Selector */}
        <div className="relative shrink-0">
          <select
            value={country}
            onChange={(e) => handleCountryChange(e.target.value)}
            aria-label="Filter by country"
            className="h-10 pl-3 pr-8 text-xs font-medium rounded-lg border border-border bg-surface text-text-primary hover:border-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors appearance-none cursor-pointer"
          >
            <option value="">All Countries</option>
            {COMMON_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-tertiary">
            ▼
          </div>
        </div>

        {/* Sort Selector */}
        <div className="relative shrink-0 inline-flex items-center">
          <ArrowUpDown className="absolute left-3 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value as LabSort)}
            aria-label="Sort AI labs"
            className="h-10 pl-8 pr-8 text-xs font-medium rounded-lg border border-border bg-surface text-text-primary hover:border-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors appearance-none cursor-pointer"
          >
            {LAB_SORTS.map((opt) => (
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
          {country && (
            <Badge variant="outline" className="gap-1 bg-surface-elevated">
              <Globe className="h-3 w-3 text-text-tertiary" />
              <span>Country: {country}</span>
              <button
                type="button"
                onClick={() => handleCountryChange("")}
                className="hover:text-text-primary ml-0.5"
                aria-label="Remove country filter"
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
              Unable to load AI research labs
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
            <LabCardSkeleton key={i} />
          ))}
        </div>
      ) : labs.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="h-7 w-7" />}
          title="No AI labs found"
          description={
            activeFiltersCount > 0
              ? "No research organizations match your search or filter criteria. Try clearing your search parameters."
              : "No AI research organizations are currently registered in the catalog."
          }
          actionLabel={activeFiltersCount > 0 ? "Clear All Filters" : undefined}
          actionHref={activeFiltersCount > 0 ? "/labs" : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {labs.map((lab) => (
              <LabCard key={lab.id || lab.slug} lab={lab} />
            ))}
          </div>

          {pagination && (
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              itemLabel="AI research labs"
            />
          )}
        </>
      )}
    </div>
  );
}
