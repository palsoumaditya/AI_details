import { Suspense } from "react";
import type { Metadata } from "next";
import { RankingsOverview } from "@/components/rankings/rankings-overview";
import { BenchmarkCardSkeleton } from "@/components/rankings/benchmark-card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "AI Model Rankings & Benchmark Leaderboards | AI Details",
  description:
    "Explore standardized AI model evaluations across reasoning, coding, knowledge, and throughput benchmarks including MMLU-Pro, LiveCodeBench, GPQA, and speed leaderboards.",
};

function RankingsLoadingFallback() {
  return (
    <div className="max-w-7xl mx-auto pb-16 animate-pulse space-y-6">
      <PageHeader
        title="Rankings & Benchmarks"
        description="Explore standardized AI model evaluations across reasoning, coding, knowledge, and throughput leaderboards."
        badge="Leaderboards"
      />
      <div className="flex gap-2">
        <div className="h-8 w-24 rounded-lg bg-surface-elevated" />
        <div className="h-8 w-24 rounded-lg bg-surface-elevated" />
        <div className="h-8 w-24 rounded-lg bg-surface-elevated" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <BenchmarkCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function RankingsPage() {
  return (
    <Suspense fallback={<RankingsLoadingFallback />}>
      <RankingsOverview />
    </Suspense>
  );
}
