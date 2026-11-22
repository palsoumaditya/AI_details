"use client";

import type { ModelCatalogSort } from "@oneatlas/backend/shared";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModelSortSelectProps {
  value: ModelCatalogSort;
  onChange: (sort: ModelCatalogSort) => void;
  className?: string;
}

const SORT_OPTIONS: Array<{ value: ModelCatalogSort; label: string }> = [
  { value: "newest", label: "Newest Release" },
  { value: "oldest", label: "Oldest Release" },
  { value: "name_asc", label: "Name (A to Z)" },
  { value: "name_desc", label: "Name (Z to A)" },
  { value: "context_desc", label: "Context Window (Largest)" },
  { value: "context_asc", label: "Context Window (Smallest)" },
  { value: "input_price_asc", label: "Input Price (Lowest)" },
  { value: "input_price_desc", label: "Input Price (Highest)" },
  { value: "output_price_asc", label: "Output Price (Lowest)" },
  { value: "output_price_desc", label: "Output Price (Highest)" },
];

export function ModelSortSelect({ value, onChange, className }: ModelSortSelectProps) {
  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <ArrowUpDown className="absolute left-3 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ModelCatalogSort)}
        aria-label="Sort models by"
        className="h-10 pl-8 pr-8 text-xs font-medium rounded-lg border border-border bg-surface text-text-primary hover:border-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors appearance-none cursor-pointer"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface text-text-primary">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-tertiary">
        ▼
      </div>
    </div>
  );
}
