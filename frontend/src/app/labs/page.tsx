import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { FlaskConical } from "lucide-react";

export default function LabsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="AI Labs & Research"
        description="Track AI research organizations, their model families, open-weight contributions, and published research."
        badge="Research"
      />
      <EmptyState
        icon={<FlaskConical className="h-6 w-6" />}
        title="AI Labs directory coming soon"
        description="The labs directory will showcase organizations like OpenAI, Anthropic, Google DeepMind, Meta AI, Mistral AI, and DeepSeek — with their model portfolios, research contributions, and ecosystem impact."
        actionLabel="Back to Discover"
        actionHref="/"
      />
    </div>
  );
}
