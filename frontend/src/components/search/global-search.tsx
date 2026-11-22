"use client";

import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, ArrowRight, Layers, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatContextWindow, formatPrice } from "@/lib/formatters";
import type { ModelCatalogItemDto, ApiPaginatedResponse } from "@oneatlas/backend/shared";
import { cn } from "@/lib/utils";

export interface GlobalSearchProps {
  placeholder?: string;
  shortcutHint?: string;
  variant?: "header" | "hero";
  className?: string;
}

export function GlobalSearch({
  placeholder = "Search models, providers, labs...",
  shortcutHint = "⌘K",
  variant = "header",
  className,
}: GlobalSearchProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ModelCatalogItemDto[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Global keyboard shortcut to focus search input (Cmd+K / Ctrl+K or /)
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const isSlash = e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName);

      if (isCmdK || isSlash) {
        e.preventDefault();
        inputRef.current?.focus();
        if (query.trim().length > 0) {
          setIsOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [query]);

  // Outside click listener to dismiss suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query fetcher
  const performSearch = useCallback(async (searchTerm: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/v1/models?q=${encodeURIComponent(searchTerm.trim())}&limit=6`,
        {
          signal: abortController.signal,
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Search request failed");
      }

      const json: ApiPaginatedResponse<ModelCatalogItemDto> = await response.json();
      if (json.success) {
        setSuggestions(json.data);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 300ms debounce triggered when query is non-empty
  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleInputChange = (newQuery: string) => {
    setQuery(newQuery);
    if (!newQuery.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      setIsOpen(false);
      setSelectedIndex(-1);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    } else {
      setIsOpen(true);
      setSelectedIndex(-1);
    }
  };

  const navigateToModel = (slug: string) => {
    setIsOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(`/models/${slug}`);
  };

  const navigateToCatalog = (searchVal: string) => {
    setIsOpen(false);
    inputRef.current?.blur();
    router.push(`/models?q=${encodeURIComponent(searchVal.trim())}`);
  };

  // Keyboard navigation within the dropdown
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      if (query.trim()) {
        setIsOpen(true);
      }
      return;
    }

    // Maximum selectable items: suggestions.length (where suggestions.length is "View all results")
    const maxIndex = suggestions.length;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
        break;

      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          navigateToModel(suggestions[selectedIndex].slug);
        } else if (query.trim()) {
          navigateToCatalog(query);
        }
        break;

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setIsLoading(false);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const isHero = variant === "hero";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Search Input Box */}
      <div className="relative">
        <Search
          className={cn(
            "absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none transition-colors",
            isHero ? "h-5 w-5" : "h-4 w-4"
          )}
          aria-hidden="true"
        />

        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="global-search-listbox"
          aria-label="Search models, providers, and research labs"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (query.trim().length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex w-full rounded-xl border border-border bg-surface text-text-primary placeholder:text-text-tertiary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-transparent transition-all",
            isHero ? "h-12 pl-11 pr-20 text-base" : "h-10 pl-10 pr-16 text-sm"
          )}
        />

        {/* Right action icons (Loading indicator, Clear button, Keyboard shortcut hint) */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {isLoading && (
            <Loader2 className="h-4 w-4 text-accent animate-spin" aria-label="Searching..." />
          )}

          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors"
              aria-label="Clear search input"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {shortcutHint && !query && (
            <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-surface-elevated px-1.5 text-[10px] font-mono text-text-tertiary">
              {shortcutHint}
            </kbd>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown Popup */}
      {isOpen && query.trim().length > 0 && (
        <div
          id="global-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-border bg-surface-elevated/95 backdrop-blur-md shadow-2xl overflow-hidden p-1.5 animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {isLoading && suggestions.length === 0 ? (
            /* Loading State */
            <div className="p-4 space-y-2.5">
              <div className="h-4 w-28 bg-surface rounded animate-pulse" />
              <div className="h-10 w-full bg-surface rounded animate-pulse" />
              <div className="h-10 w-full bg-surface rounded animate-pulse" />
            </div>
          ) : suggestions.length > 0 ? (
            /* Matching Model Results */
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary flex items-center justify-between">
                <span>Matching AI Models</span>
                <span className="text-[10px] lowercase font-normal">Use &uarr;&darr; to navigate</span>
              </div>

              <div className="space-y-1">
                {suggestions.map((model, index) => {
                  const isSelected = index === selectedIndex;
                  const primaryLab = model.labs[0]?.name;
                  const lowestInput = model.pricing?.lowestInput;

                  return (
                    <div
                      key={model.id || model.slug}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => navigateToModel(model.slug)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors",
                        isSelected
                          ? "bg-accent/15 text-text-primary"
                          : "hover:bg-surface text-text-secondary hover:text-text-primary"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface shrink-0 text-text-tertiary group-hover:text-accent">
                          <Sparkles className="h-4 w-4 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-text-primary truncate">
                              {model.name}
                            </span>
                            {primaryLab && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                {primaryLab}
                              </Badge>
                            )}
                            {model.isReasoning && (
                              <span className="text-[10px] px-1 py-0 rounded bg-accent-muted text-accent font-medium">
                                Reasoning
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-text-tertiary truncate">
                            {model.slug}
                          </p>
                        </div>
                      </div>

                      {/* Right Specs Preview */}
                      <div className="hidden sm:flex items-center gap-3 shrink-0 text-xs text-text-tertiary">
                        {model.contextWindow && (
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {formatContextWindow(model.contextWindow)}
                          </span>
                        )}
                        {lowestInput && (
                          <span className="font-medium text-text-primary">
                            {formatPrice(lowestInput.amount)}/1M
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* View All Results Action */}
              <div
                role="option"
                aria-selected={selectedIndex === suggestions.length}
                onClick={() => navigateToCatalog(query)}
                onMouseEnter={() => setSelectedIndex(suggestions.length)}
                className={cn(
                  "mt-1.5 pt-2 border-t border-border flex items-center justify-between p-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                  selectedIndex === suggestions.length
                    ? "bg-accent/15 text-accent"
                    : "text-text-secondary hover:text-accent hover:bg-surface"
                )}
              >
                <span>
                  View all results for &ldquo;<strong className="text-text-primary">{query}</strong>&rdquo;
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  <span>Press Enter</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          ) : (
            /* Empty Search Results */
            <div className="p-6 text-center space-y-2">
              <p className="text-sm text-text-primary font-medium">
                No models found matching &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-text-secondary max-w-xs mx-auto">
                Try searching by canonical name, company, or model family (e.g., &ldquo;Claude&rdquo;, &ldquo;GPT&rdquo;, &ldquo;Llama&rdquo;).
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigateToCatalog(query)}
                  className="text-xs text-accent hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <span>Search full catalog anyway</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
