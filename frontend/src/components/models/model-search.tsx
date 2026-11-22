"use client";

import { useEffect, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModelSearchProps {
  value: string;
  onChange: (value: string) => void;
  isSearching?: boolean;
  placeholder?: string;
  className?: string;
}

export function ModelSearch({
  value,
  onChange,
  isSearching = false,
  placeholder = "Search by model name, slug, or family...",
  className,
}: ModelSearchProps) {
  const [localValue, setLocalValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  // Official React pattern for adjusting state when prop changes without cascading effect renders
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalValue(value);
  }

  // 300ms debounce for user typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, value, onChange]);

  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  return (
    <div className={cn("relative flex-1", className)}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="search"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search models"
        className="flex h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-10 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-transparent transition-colors"
      />
      {/* Right Icon: Loader when searching, or Clear button */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {isSearching && (
          <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
        )}
        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
