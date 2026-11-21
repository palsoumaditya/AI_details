import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Trophy } from "lucide-react";

export default function RankingsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Rankings & Benchmarks"
        description="Explore model rankings based on standardized benchmarks including GPQA, MMLU-Pro, LiveCodeBench, and throughput metrics."
        badge="Rankings"
      />
      <EmptyState
        icon={<Trophy className="h-6 w-6" />}
        title="Rankings coming soon"
        description="Once benchmark data is ingested and normalized, models will be ranked across reasoning, coding, knowledge, and speed categories with configurable leaderboards."
        actionLabel="Back to Discover"
        actionHref="/"
      />
    </div>
  );
}
