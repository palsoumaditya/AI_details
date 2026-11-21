"use client";

import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { type InputHTMLAttributes, forwardRef } from "react";

export interface SearchFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  shortcutHint?: string;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ className, shortcutHint, ...props }, ref) => {
    return (
      <div className={cn("relative", className)}>
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={ref}
          type="search"
          className={cn(
            "flex h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-3 py-2 text-sm text-text-primary",
            "placeholder:text-text-tertiary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-transparent",
            shortcutHint && "pr-16"
          )}
          {...props}
        />
        {shortcutHint && (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-surface-elevated px-1.5 text-[10px] font-mono text-text-tertiary">
            {shortcutHint}
          </kbd>
        )}
      </div>
    );
  }
);
SearchField.displayName = "SearchField";
