import { Suspense } from "react";
import type { Metadata } from "next";
import { LabDirectoryView } from "@/components/labs/lab-directory-view";
import { LabCardSkeleton } from "@/components/labs/lab-card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "AI Research Labs & Organizations | OneAtlas.dev",
  description:
    "Explore AI research organizations including OpenAI, Anthropic, Google DeepMind, Meta AI, Mistral AI, DeepSeek, and their foundation model portfolios.",
};

function LabsLoadingFallback() {
  return (
    <div className="max-w-7xl mx-auto pb-16 animate-pulse">
      <PageHeader
        title="AI Research Labs"
        description="Explore pioneering AI research laboratories, frontier foundation model creators, open-weight publishers, and academic research institutions."
        badge="Organizations"
      />
      <div className="mb-6 flex gap-3">
        <div className="h-10 flex-1 bg-surface-elevated rounded-lg" />
        <div className="h-10 w-36 bg-surface-elevated rounded-lg" />
        <div className="h-10 w-36 bg-surface-elevated rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <LabCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function LabsPage() {
  return (
    <Suspense fallback={<LabsLoadingFallback />}>
      <LabDirectoryView />
    </Suspense>
  );
}
