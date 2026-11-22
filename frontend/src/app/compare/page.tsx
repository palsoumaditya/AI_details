import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ComparisonView } from "@/components/compare";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Model Comparison — Technical Specs, Pricing & Benchmarks | AI Details",
  description:
    "Compare AI models side-by-side: context windows, max output limits, input and output pricing per 1M tokens, benchmark evaluations, and multi-provider availability.",
};

function ComparisonLoadingFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export default function ComparePage() {
  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      <PageHeader
        title="Model Comparison Engine"
        description="Compare technical specifications, token context limits, inference pricing, and standardized benchmark evaluations across frontier and open-weight AI models side by side."
        badge="Side-by-Side"
        annotation="side-by-side spec matrix"
      />

      <Suspense fallback={<ComparisonLoadingFallback />}>
        <ComparisonView />
      </Suspense>
    </div>
  );
}
