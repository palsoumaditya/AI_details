"use client";

import { Search, X, ArrowUpDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LeaderboardFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedLab: string;
  onLabChange: (lab: string) => void;
  selectedSort: string;
  onSortChange: (sort: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

const SORT_OPTIONS = [
  { value: "rank_asc", label: "Rank (Best First)" },
  { value: "rank_desc", label: "Rank (Lowest First)" },
  { value: "score_desc", label: "Score (High to Low)" },
  { value: "score_asc", label: "Score (Low to High)" },
  { value: "name_asc", label: "Model Name (A-Z)" },
  { value: "name_desc", label: "Model Name (Z-A)" },
];

export function LeaderboardFilters({
  searchQuery,
  onSearchChange,
  selectedLab,
  onLabChange,
  selectedSort,
  onSortChange,
  onReset,
  hasActiveFilters,
}: LeaderboardFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter models..."
          className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-border bg-surface-elevated text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-accent transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Lab Filter Input */}
        <div className="relative w-full sm:w-44">
          <input
            type="text"
            value={selectedLab}
            onChange={(e) => onLabChange(e.target.value)}
            placeholder="Filter by lab..."
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-surface-elevated text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-accent transition-colors"
          />
          {selectedLab && (
            <button
              type="button"
              onClick={() => onLabChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="relative w-full sm:w-48">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-elevated text-text-primary text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
            <select
              value={selectedSort}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Sort rankings"
              className="w-full bg-transparent text-text-primary text-xs focus:outline-hidden cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-surface text-text-primary"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-text-tertiary hover:text-text-primary h-8 gap-1 px-2 shrink-0"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </Button>
        )}
      </div>
    </div>
  );
}
