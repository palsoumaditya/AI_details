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

export interface ComparisonPreset {
  id: string;
  name: string;
  description: string;
  slugs: string[];
  available: boolean;
  unavailableReason?: string;
}

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
  const [presets, setPresets] = useState<ComparisonPreset[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMaxReached = selectedSlugs.length >= 4;

  // Dynamically load database-backed presets from live catalog
  useEffect(() => {
    let ignore = false;
    async function loadPresets() {
      try {
        const [leadersRes, reasoningRes, openWeightsRes] = await Promise.all([
          fetch("/api/v1/models?limit=2"),
          fetch("/api/v1/models?reasoning=true&limit=2"),
          fetch("/api/v1/models?openWeights=true&limit=2"),
        ]);

        const leadersJson = leadersRes.ok ? await leadersRes.json() : null;
        const reasoningJson = reasoningRes.ok ? await reasoningRes.json() : null;
        const openWeightsJson = openWeightsRes.ok ? await openWeightsRes.json() : null;

        if (ignore) return;

        const dynamicPresets: ComparisonPreset[] = [];

        // 1. Catalog Leaders Preset
        const leaders =
          leadersJson?.success && Array.isArray(leadersJson.data) ? leadersJson.data : [];
        if (leaders.length >= 2) {
          dynamicPresets.push({
            id: "catalog-leaders",
            name: `${leaders[0].name} vs ${leaders[1].name}`,
            description: "Catalog Leaders",
            slugs: [leaders[0].slug, leaders[1].slug],
            available: true,
          });
        } else {
          dynamicPresets.push({
            id: "catalog-leaders",
            name: "Catalog Leaders",
            description: "Catalog Leaders",
            slugs: [],
            available: false,
            unavailableReason: "Requires at least 2 models in the database catalog",
          });
        }

        // 2. Reasoning Models Preset
        const reasoningModels =
          reasoningJson?.success && Array.isArray(reasoningJson.data)
            ? reasoningJson.data
            : [];
        if (reasoningModels.length >= 2) {
          dynamicPresets.push({
            id: "reasoning-models",
            name: `${reasoningModels[0].name} vs ${reasoningModels[1].name}`,
            description: "Reasoning Models",
            slugs: [reasoningModels[0].slug, reasoningModels[1].slug],
            available: true,
          });
        } else {
          dynamicPresets.push({
            id: "reasoning-models",
            name: "Reasoning Models",
            description: "Reasoning Models",
            slugs: [],
            available: false,
            unavailableReason: "Requires at least 2 reasoning models in the database catalog",
          });
        }

        // 3. Open Weights Preset
        const openWeightModels =
          openWeightsJson?.success && Array.isArray(openWeightsJson.data)
            ? openWeightsJson.data
            : [];
        if (openWeightModels.length >= 2) {
          dynamicPresets.push({
            id: "open-weights",
            name: `${openWeightModels[0].name} vs ${openWeightModels[1].name}`,
            description: "Open Weights",
            slugs: [openWeightModels[0].slug, openWeightModels[1].slug],
            available: true,
          });
        } else {
          dynamicPresets.push({
            id: "open-weights",
            name: "Open Weights",
            description: "Open Weights",
            slugs: [],
            available: false,
            unavailableReason: "Requires at least 2 open-weight models in the database catalog",
          });
        }

        setPresets(dynamicPresets);
      } catch {
        // Silently ignore catalog load issues
      }
    }

    loadPresets();
    return () => {
      ignore = true;
    };
  }, []);

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

  // Debounced search query against live database
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
                : "Search model by name or slug to add (e.g. gemini, astra, mistral)..."
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

      {/* Database-Backed Preset Comparisons */}
      {presets.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <span className="text-text-tertiary flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-accent" />
            <span>Presets:</span>
          </span>
          {presets.map((preset) => {
            if (!preset.available) {
              return (
                <span
                  key={preset.id}
                  title={preset.unavailableReason}
                  className="text-[11px] text-text-tertiary opacity-50 bg-surface-elevated/40 border border-border/50 px-2.5 py-1 rounded-md cursor-not-allowed flex items-center gap-1"
                >
                  <span>{preset.description}</span>
                  <span className="text-[10px] italic">(Unavailable)</span>
                </span>
              );
            }

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset.slugs)}
                className="text-[11px] text-text-secondary hover:text-accent bg-surface-elevated hover:bg-surface border border-border px-2.5 py-1 rounded-md transition-colors"
                title={`Compare ${preset.name}`}
              >
                <span className="font-semibold text-accent/80 mr-1.5">
                  {preset.description}:
                </span>
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
