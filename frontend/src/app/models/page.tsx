import { Suspense } from "react";
import type { Metadata } from "next";
import { ModelCatalogView } from "@/components/models/model-catalog-view";
import { ModelCardSkeleton } from "@/components/models/model-card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Explore AI Models | OneAtlas.dev",
  description:
    "Unified intelligence catalog of frontier and open-weight AI models across OpenAI, Anthropic, Google DeepMind, Meta, Mistral, DeepSeek, and leading inference providers.",
};

function CatalogLoadingFallback() {
  return (
    <div className="max-w-7xl mx-auto pb-16 animate-pulse">
      <PageHeader
        title="Explore AI Models"
        description="Unified developer intelligence catalog for frontier and open-weight models across major AI research labs and inference providers."
        badge="Discovery"
      />
      <div className="mb-6 flex gap-3">
        <div className="h-10 flex-1 bg-surface-elevated rounded-lg" />
        <div className="h-10 w-44 bg-surface-elevated rounded-lg" />
      </div>
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="hidden lg:block w-64 h-96 bg-surface-elevated rounded-xl shrink-0" />
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ModelCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ModelsPage() {
  return (
    <Suspense fallback={<CatalogLoadingFallback />}>
      <ModelCatalogView />
    </Suspense>
  );
}
