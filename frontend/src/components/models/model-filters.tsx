"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RotateCcw,
  SlidersHorizontal,
  Layers,
  Sparkles,
  ShieldCheck,
  Building2,
  Server,
  DollarSign,
  ChevronDown,
} from "lucide-react";

export interface ModelFiltersState {
  lab?: string;
  provider?: string;
  modality?: string;
  reasoning?: boolean;
  openWeights?: boolean;
  minimumContext?: number;
  maximumContext?: number;
  minimumInputPrice?: number;
  maximumInputPrice?: number;
  minimumOutputPrice?: number;
  maximumOutputPrice?: number;
}

export interface ModelFiltersProps {
  filters: ModelFiltersState;
  onChange: (filters: ModelFiltersState) => void;
  onReset: () => void;
  activeCount: number;
  className?: string;
}

const AI_LABS = [
  { slug: "openai", name: "OpenAI" },
  { slug: "anthropic", name: "Anthropic" },
  { slug: "google", name: "Google DeepMind" },
  { slug: "meta", name: "Meta AI" },
  { slug: "mistral", name: "Mistral AI" },
  { slug: "deepseek", name: "DeepSeek" },
];

const INFERENCE_PROVIDERS = [
  { slug: "openai-api", name: "OpenAI API" },
  { slug: "anthropic-api", name: "Anthropic API" },
  { slug: "google-vertex", name: "Google Vertex AI" },
  { slug: "together-ai", name: "Together AI" },
  { slug: "groq", name: "Groq" },
  { slug: "openrouter-provider", name: "OpenRouter" },
];

const MODALITIES = [
  { value: "text", label: "Text" },
  { value: "image", label: "Image / Vision" },
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
];

const CONTEXT_WINDOW_PRESETS = [
  { label: "Any Context", min: undefined, max: undefined },
  { label: "32K+ Tokens", min: 32768, max: undefined },
  { label: "128K+ Tokens", min: 128000, max: undefined },
  { label: "200K+ Tokens", min: 200000, max: undefined },
  { label: "1M+ Tokens", min: 1000000, max: undefined },
];

export function ModelFilters({
  filters,
  onChange,
  onReset,
  activeCount,
  className,
}: ModelFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const updateField = <K extends keyof ModelFiltersState>(
    field: K,
    value: ModelFiltersState[K]
  ) => {
    onChange({
      ...filters,
      [field]: value,
    });
  };

  const content = (
    <div className="space-y-6">
      {/* Header with active count & reset */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-text-primary">Filters</span>
          {activeCount > 0 && (
            <Badge variant="accent" className="text-[10px] px-1.5 py-0.2">
              {activeCount}
            </Badge>
          )}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset All</span>
          </button>
        )}
      </div>

      {/* 1. AI Research Lab */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          <span>AI Research Lab</span>
        </label>
        <select
          value={filters.lab || ""}
          onChange={(e) => updateField("lab", e.target.value || undefined)}
          className="w-full h-9 px-2.5 text-xs rounded-lg border border-border bg-surface text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All AI Labs</option>
          {AI_LABS.map((lab) => (
            <option key={lab.slug} value={lab.slug}>
              {lab.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Inference Provider */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5" />
          <span>Inference Provider</span>
        </label>
        <select
          value={filters.provider || ""}
          onChange={(e) => updateField("provider", e.target.value || undefined)}
          className="w-full h-9 px-2.5 text-xs rounded-lg border border-border bg-surface text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All Providers</option>
          {INFERENCE_PROVIDERS.map((prov) => (
            <option key={prov.slug} value={prov.slug}>
              {prov.name}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Modality */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Modality
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {MODALITIES.map((mod) => {
            const isSelected = filters.modality === mod.value;
            return (
              <button
                key={mod.value}
                type="button"
                onClick={() =>
                  updateField("modality", isSelected ? undefined : mod.value)
                }
                className={`h-8 px-2.5 text-xs rounded-md border text-left transition-colors font-medium flex items-center justify-between ${
                  isSelected
                    ? "border-accent bg-accent-muted text-accent"
                    : "border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                }`}
              >
                <span>{mod.label}</span>
                {isSelected && <span className="text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Capabilities (Reasoning & Open Weights) */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Capabilities & Weights
        </label>

        {/* Reasoning Filter */}
        <div className="space-y-1">
          <span className="text-[11px] text-text-secondary flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-accent" />
            <span>Reasoning Models</span>
          </span>
          <div className="flex rounded-lg border border-border p-0.5 bg-surface text-xs">
            <button
              type="button"
              onClick={() => updateField("reasoning", undefined)}
              className={`flex-1 py-1 text-center rounded-md transition-colors ${
                filters.reasoning === undefined
                  ? "bg-surface-elevated text-text-primary font-medium shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => updateField("reasoning", true)}
              className={`flex-1 py-1 text-center rounded-md transition-colors ${
                filters.reasoning === true
                  ? "bg-accent-muted text-accent font-medium shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => updateField("reasoning", false)}
              className={`flex-1 py-1 text-center rounded-md transition-colors ${
                filters.reasoning === false
                  ? "bg-surface-elevated text-text-primary font-medium shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* Open Weights Filter */}
        <div className="space-y-1">
          <span className="text-[11px] text-text-secondary flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-success" />
            <span>Weight Availability</span>
          </span>
          <div className="flex rounded-lg border border-border p-0.5 bg-surface text-xs">
            <button
              type="button"
              onClick={() => updateField("openWeights", undefined)}
              className={`flex-1 py-1 text-center rounded-md transition-colors ${
                filters.openWeights === undefined
                  ? "bg-surface-elevated text-text-primary font-medium shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => updateField("openWeights", true)}
              className={`flex-1 py-1 text-center rounded-md transition-colors ${
                filters.openWeights === true
                  ? "bg-success-muted text-success font-medium shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => updateField("openWeights", false)}
              className={`flex-1 py-1 text-center rounded-md transition-colors ${
                filters.openWeights === false
                  ? "bg-surface-elevated text-text-primary font-medium shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              Closed
            </button>
          </div>
        </div>
      </div>

      {/* 5. Context Window */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          <span>Context Window</span>
        </label>
        <div className="space-y-1.5">
          {CONTEXT_WINDOW_PRESETS.map((preset) => {
            const isSelected =
              filters.minimumContext === preset.min &&
              filters.maximumContext === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    minimumContext: isSelected ? undefined : preset.min,
                    maximumContext: isSelected ? undefined : preset.max,
                  })
                }
                className={`w-full h-8 px-2.5 text-xs rounded-md border text-left transition-colors font-medium flex items-center justify-between ${
                  isSelected
                    ? "border-accent bg-accent-muted text-accent"
                    : "border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                }`}
              >
                <span>{preset.label}</span>
                {isSelected && <span className="text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Pricing Bounds ($ / 1M tokens) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5" />
          <span>Max Pricing ($/1M tokens)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-text-tertiary block mb-1">Max Input</span>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g. 5.0"
              value={filters.maximumInputPrice ?? ""}
              onChange={(e) => {
                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                updateField("maximumInputPrice", val);
              }}
              className="w-full h-8 px-2 text-xs rounded-md border border-border bg-surface text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
          <div>
            <span className="text-[10px] text-text-tertiary block mb-1">Max Output</span>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g. 15.0"
              value={filters.maximumOutputPrice ?? ""}
              onChange={(e) => {
                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                updateField("maximumOutputPrice", val);
              }}
              className="w-full h-8 px-2 text-xs rounded-md border border-border bg-surface text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden mb-4">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-accent" />
            <span>Filters</span>
            {activeCount > 0 && (
              <Badge variant="accent" className="text-[10px] px-1.5">
                {activeCount}
              </Badge>
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${mobileOpen ? "rotate-180" : ""}`}
          />
        </Button>

        {/* Mobile Collapsible Panel */}
        {mobileOpen && (
          <div className="mt-3 p-4 rounded-xl border border-border bg-surface/95 backdrop-blur-md shadow-xl">
            {content}
            <div className="mt-4 pt-3 border-t border-border flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setMobileOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:block w-64 shrink-0 rounded-xl border border-border bg-surface p-4 h-fit sticky top-20 ${className || ""}`}
      >
        {content}
      </aside>
    </>
  );
}
