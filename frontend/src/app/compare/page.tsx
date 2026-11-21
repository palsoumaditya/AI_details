import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { GitCompareArrows } from "lucide-react";

export default function ComparePage() {
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Model Comparison"
        description="Compare capabilities, pricing, context windows, and benchmark scores across AI models side by side."
        badge="Compare"
      />
      <EmptyState
        icon={<GitCompareArrows className="h-6 w-6" />}
        title="Comparison tool coming soon"
        description="Select two or more models to compare their specifications, pricing across providers, benchmark results, and capabilities in a detailed side-by-side view."
        actionLabel="Back to Discover"
        actionHref="/"
      />
    </div>
  );
}
