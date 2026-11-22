import { Suspense } from "react";
import type { Metadata } from "next";
import { ProviderDirectoryView } from "@/components/providers/provider-directory-view";
import { ProviderCardSkeleton } from "@/components/providers/provider-card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Inference Providers & Endpoints | OneAtlas.dev",
  description:
    "Explore inference providers including OpenAI, Anthropic, Google Cloud Vertex, Together AI, Groq, and OpenRouter — compare endpoints, availability, and hosted models.",
};

function ProvidersLoadingFallback() {
  return (
    <div className="max-w-7xl mx-auto pb-16 animate-pulse">
      <PageHeader
        title="Inference Providers"
        description="Discover and evaluate AI execution infrastructure, cloud providers, hardware-accelerated endpoints, and model routing aggregators."
        badge="Infrastructure"
      />
      <div className="mb-6 flex gap-3">
        <div className="h-10 flex-1 bg-surface-elevated rounded-lg" />
        <div className="h-10 w-36 bg-surface-elevated rounded-lg" />
        <div className="h-10 w-36 bg-surface-elevated rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProviderCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function ProvidersPage() {
  return (
    <Suspense fallback={<ProvidersLoadingFallback />}>
      <ProviderDirectoryView />
    </Suspense>
  );
}
