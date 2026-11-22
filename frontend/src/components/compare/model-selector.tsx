"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { ModelCatalogItemDto } from "@oneatlas/backend/shared";
import {
  Search,
  X,
  Plus,
  Sparkles,
  Layers,
  AlertCircle,
  Check,
} from "lucide-react";

export interface ModelSelectorProps {
  selectedSlugs: string[];
  onAddSlug: (slug: string) => void;
  onRemoveSlug: (slug: string) => void;
  onSelectPreset: (slugs: string[]) => void;
  onClearAll: () => void;
}

const PRESET_COMPARISONS = [
  {
    name: "Frontier Flagships",
    slugs: ["gpt-4o", "claude-3-5-sonnet"],
  },
  {
    name: "Reasoning Leaders",
    slugs: ["o1", "deepseek-r1"],
  },
  {
    name: "Open Weight Giants",
    slugs: ["llama-3-3-70b-instruct", "qwen-2-5-72b-instruct"],
  },
];

export function ModelSelector({
  selectedSlugs,
  onAddSlug,
  onRemoveSlug,
  onSelectPreset,
  onClearAll,
}: ModelSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ModelCatalogItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMaxReached = selectedSlugs.length >= 4;

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/models?q=${encodeURIComponent(query)}&limit=6`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setResults(json.data);
            setIsOpen(true);
          }
        }
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          console.error("Search fetch failed:", err);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    setIsOpen(true);
  };

  const handleSelectModel = (slug: string) => {
    if (selectedSlugs.includes(slug)) {
      onRemoveSlug(slug);
    } else if (!isMaxReached) {
      onAddSlug(slug);
      setQuery("");
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6 space-y-4 bg-surface border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-primary">
              Compare AI Models
            </h2>
            <Badge
              variant={selectedSlugs.length >= 2 ? "accent" : "outline"}
              className="text-xs"
            >
              {selectedSlugs.length} / 4 Selected
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Select 2 to 4 models to inspect specifications, provider pricing, and benchmark scorecards side by side.
          </p>
        </div>

        {selectedSlugs.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs text-text-tertiary hover:text-text-primary self-start sm:self-auto h-7 px-2"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Selected Model Chips */}
      <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
        {selectedSlugs.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-text-tertiary italic">
            <AlertCircle className="h-3.5 w-3.5 text-accent" />
            <span>No models currently selected. Search below or pick a preset comparison.</span>
          </div>
        ) : (
          selectedSlugs.map((slug) => (
            <div
              key={slug}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs font-medium text-text-primary shadow-xs"
            >
              <span className="font-mono text-text-secondary">{slug}</span>
              <button
                type="button"
                onClick={() => onRemoveSlug(slug)}
                className="text-text-tertiary hover:text-red-400 p-0.5 rounded transition-colors"
                title={`Remove ${slug}`}
                aria-label={`Remove ${slug}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Search Bar & Auto-Suggest */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-text-tertiary pointer-events-none" />
          <Input
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
            placeholder={
              isMaxReached
                ? "Maximum 4 models selected (remove one to add another)"
                : "Search model by name or slug to add (e.g. gpt-4o, claude-3-5-sonnet)..."
            }
            disabled={isMaxReached}
            className="pl-9 h-10 text-xs sm:text-sm bg-surface-elevated"
          />
        </div>

        {/* Dropdown Results */}
        {isOpen && query.trim() && (
          <div className="absolute z-30 left-0 right-0 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-border bg-surface-elevated shadow-xl p-1 space-y-1">
            {isLoading ? (
              <div className="p-3 text-center text-xs text-text-tertiary animate-pulse">
                Searching intelligence catalog...
              </div>
            ) : results.length === 0 ? (
              <div className="p-3 text-center text-xs text-text-tertiary">
                No matching models found for &quot;{query}&quot;.
              </div>
            ) : (
              results.map((m) => {
                const isSelected = selectedSlugs.includes(m.slug);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectModel(m.slug)}
                    disabled={isMaxReached && !isSelected}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors text-xs ${
                      isSelected
                        ? "bg-accent/15 text-accent font-medium"
                        : isMaxReached
                        ? "opacity-50 cursor-not-allowed text-text-tertiary"
                        : "hover:bg-surface text-text-primary"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span>{m.name}</span>
                        {m.labs[0] && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border text-text-secondary">
                            {m.labs[0].name}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-text-tertiary">
                        {m.slug}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {m.contextWindow && (
                        <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                          <Layers className="h-2.5 w-2.5" />
                          {Math.round(m.contextWindow / 1000)}k
                        </span>
                      )}
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 text-accent" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 text-text-tertiary" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Preset Quick Comparisons */}
      <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
        <span className="text-text-tertiary flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-accent" />
          <span>Popular:</span>
        </span>
        {PRESET_COMPARISONS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => onSelectPreset(preset.slugs)}
            className="text-[11px] text-text-secondary hover:text-accent bg-surface-elevated hover:bg-surface border border-border px-2.5 py-1 rounded-md transition-colors"
          >
            {preset.name}
          </button>
        ))}
      </div>
    </Card>
  );
}
