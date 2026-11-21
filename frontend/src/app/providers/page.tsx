import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Server } from "lucide-react";

export default function ProvidersPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Inference Providers"
        description="Compare pricing, availability, and model offerings across AI inference providers including OpenAI, Together AI, Groq, and more."
        badge="Providers"
      />
      <EmptyState
        icon={<Server className="h-6 w-6" />}
        title="Provider directory coming soon"
        description="The provider directory will display each inference provider's available models, pricing tiers, and endpoint status. Provider data has already been synchronized from OpenRouter and Models.dev."
        actionLabel="Back to Discover"
        actionHref="/"
      />
    </div>
  );
}
