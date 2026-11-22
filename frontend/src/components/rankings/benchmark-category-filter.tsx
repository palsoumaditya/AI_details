"use client";

import { Badge } from "@/components/ui/badge";

export interface BenchmarkCategoryFilterProps {
  categories: { category: string; count: number }[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  totalCount?: number;
}

const ORDERED_CATEGORIES = [
  "ALL",
  "REASONING",
  "CODING",
  "MATH",
  "KNOWLEDGE",
  "MULTIMODAL",
  "SPEED",
  "COMPOSITE",
];

export function BenchmarkCategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  totalCount,
}: BenchmarkCategoryFilterProps) {
  // Build lookup map for counts
  const countMap = new Map<string, number>();
  for (const c of categories) {
    countMap.set(c.category, c.count);
  }

  // Filter out categories that have 0 benchmarks (except ALL)
  const availableCategories = ORDERED_CATEGORIES.filter((cat) => {
    if (cat === "ALL") return true;
    return (countMap.get(cat) ?? 0) > 0;
  });

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      {availableCategories.map((category) => {
        const isSelected =
          (selectedCategory === "" && category === "ALL") ||
          selectedCategory === category;

        const count =
          category === "ALL"
            ? totalCount ?? categories.reduce((sum, c) => sum + c.count, 0)
            : countMap.get(category) ?? 0;

        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelectCategory(category === "ALL" ? "" : category)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
              isSelected
                ? "bg-accent text-accent-foreground border-accent shadow-xs"
                : "bg-surface text-text-secondary border-border hover:border-text-tertiary hover:text-text-primary"
            }`}
          >
            <span>{category === "ALL" ? "All Categories" : category}</span>
            <Badge
              variant={isSelected ? "default" : "outline"}
              className={`text-[10px] px-1.5 py-0 min-w-4 text-center font-mono ${
                isSelected
                  ? "bg-white/20 text-accent-foreground border-transparent"
                  : "bg-surface-elevated text-text-tertiary border-border"
              }`}
            >
              {count}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
