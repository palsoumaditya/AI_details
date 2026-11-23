import { Suspense } from "react";
import type { Metadata } from "next";
import { LeaderboardView } from "@/components/rankings/leaderboard-view";
import { LeaderboardTableSkeleton } from "@/components/rankings/leaderboard-table";

interface BenchmarkPageProps {
  params: Promise<{ benchmarkSlug: string }>;
}

export async function generateMetadata({
  params,
}: BenchmarkPageProps): Promise<Metadata> {
  const { benchmarkSlug } = await params;
  const formattedTitle = benchmarkSlug
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    title: `${formattedTitle} Leaderboard | AI Details`,
    description: `Comprehensive AI model rankings and benchmark evaluations for ${formattedTitle} on AI Details.`,
  };
}

function LeaderboardLoadingFallback() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-pulse">
      <div className="h-5 w-32 rounded bg-surface-elevated" />
      <div className="h-28 rounded-2xl bg-surface border border-border" />
      <LeaderboardTableSkeleton />
    </div>
  );
}

export default async function BenchmarkLeaderboardPage({
  params,
}: BenchmarkPageProps) {
  const { benchmarkSlug } = await params;

  return (
    <Suspense fallback={<LeaderboardLoadingFallback />}>
      <LeaderboardView benchmarkSlug={benchmarkSlug} />
    </Suspense>
  );
}
