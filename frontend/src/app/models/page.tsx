import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Compass } from "lucide-react";

export default function ModelsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Model Catalog"
        description="Browse and search the unified catalog of AI models from every major research lab and inference provider."
        badge="Discovery"
      />
      <EmptyState
        icon={<Compass className="h-6 w-6" />}
        title="Model catalog coming soon"
        description="The full searchable model catalog will be available once the backend API layer is complete. The ingestion pipeline has already synchronized model data from OpenRouter and Models.dev."
        actionLabel="Back to Discover"
        actionHref="/"
      />
    </div>
  );
}
