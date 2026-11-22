import Link from "next/link";
import { GlobalSearch } from "@/components/search/global-search";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Compass,
  GitCompareArrows,
  Trophy,
  Server,
  FlaskConical,
} from "lucide-react";

const PLATFORM_SECTIONS = [
  {
    title: "Model Discovery",
    description:
      "Browse and search a unified catalog of frontier and open-weight AI models from every major research lab.",
    href: "/models",
    icon: <Compass className="h-5 w-5" />,
    badge: "Core",
  },
  {
    title: "Model Comparison",
    description:
      "Compare capabilities, pricing, context windows, and benchmarks across models side by side.",
    href: "/compare",
    icon: <GitCompareArrows className="h-5 w-5" />,
    badge: "Live",
  },
  {
    title: "Rankings & Benchmarks",
    description:
      "Explore model rankings based on standardized benchmarks including GPQA, MMLU-Pro, and LiveCodeBench.",
    href: "/rankings",
    icon: <Trophy className="h-5 w-5" />,
    badge: "Live",
  },
  {
    title: "Inference Providers",
    description:
      "Compare pricing, latency, and availability across inference providers like OpenAI, Together AI, and Groq.",
    href: "/providers",
    icon: <Server className="h-5 w-5" />,
    badge: "Live",
  },
  {
    title: "AI Labs & Research",
    description:
      "Track AI research organizations, their model families, and contributions to the ecosystem.",
    href: "/labs",
    icon: <FlaskConical className="h-5 w-5" />,
    badge: "Live",
  },
];

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <section className="pt-8 pb-12 md:pt-16 md:pb-16">
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="accent">AI Model Intelligence</Badge>
            <span className="homemade-apple-regular text-sm text-slate-600 select-none">
              fair warning: live intelligence &#125;
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text-primary leading-tight">
            Explore the AI model ecosystem.
          </h1>
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl">
            Discover, understand and compare AI models across leading research
            labs and inference providers.
          </p>
        </div>

        {/* Hero search */}
        <div className="mt-8 max-w-xl">
          <GlobalSearch
            placeholder="Search models, providers, or labs..."
            shortcutHint="⌘K"
            variant="hero"
            className="w-full"
          />
          <p className="mt-2 text-xs text-text-tertiary">
            Search models across OpenAI, Anthropic, Google DeepMind, Meta, Mistral, and more.
          </p>
        </div>
      </section>

      {/* Capability sections */}
      <section className="pb-16">
        <div className="flex items-baseline gap-2.5 mb-4 flex-wrap">
          <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider">
            Platform
          </h2>
          <span className="homemade-apple-regular text-xs text-slate-500 select-none">
            — the whole platform, really
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORM_SECTIONS.map((section) => (
            <Link key={section.href} href={section.href} className="group">
              <Card hover className="h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all duration-200 shadow-2xs">
                    {section.icon}
                  </div>
                  <Badge
                    variant={section.badge === "Core" ? "accent" : "outline"}
                  >
                    {section.badge}
                  </Badge>
                </div>
                <CardTitle className="group-hover:text-accent transition-colors">
                  {section.title}
                </CardTitle>
                <CardDescription className="flex-1">
                  {section.description}
                </CardDescription>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Data sources */}
      <section className="pb-16">
        <div className="flex items-baseline gap-2.5 mb-4 flex-wrap">
          <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider">
            Integrated Data Sources
          </h2>
          <span className="homemade-apple-regular text-xs text-slate-500 select-none">
            — verified feeds
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: "OpenRouter", status: "Connected" },
            { name: "Models.dev", status: "Connected" },
            { name: "Hugging Face", status: "Planned" },
            { name: "Artificial Analysis", status: "Planned" },
          ].map((source) => (
            <div
              key={source.name}
              className="rounded-lg border border-border bg-surface p-3 text-center"
            >
              <p className="text-sm font-medium text-text-primary">
                {source.name}
              </p>
              <Badge
                variant={source.status === "Connected" ? "success" : "outline"}
                className="mt-1.5"
              >
                {source.status}
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
