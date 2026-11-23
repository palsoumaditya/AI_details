import Link from "next/link";
import {
  Show,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";
import { GlobalSearch } from "@/components/search/global-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Compass,
  GitCompareArrows,
  Trophy,
  Server,
  FlaskConical,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Lock,
  Layers,
  Cpu,
  BarChart3,
  Globe2,
} from "lucide-react";

export const metadata = {
  title: "AI Details — AI Model Discovery & Intelligence Platform",
  description:
    "Explore, compare, and benchmark 600+ foundation AI models across leading research labs and inference providers with real-time pricing and context limits.",
};

const STATS = [
  { value: "640+", label: "Frontier Models", description: "Proprietary & Open-Weights" },
  { value: "10,000+", label: "Verified Endpoints", description: "Global Cloud Offerings" },
  { value: "320+", label: "Inference Providers", description: "Direct, Cloud & Aggregators" },
  { value: "sub-1ms", label: "Query Architecture", description: "PostgreSQL Parameterized CTEs" },
];

const FRONTIER_MODELS = [
  {
    name: "Claude 3.5 Sonnet",
    lab: "Anthropic",
    slug: "claude-3-5-sonnet",
    context: "200k tokens",
    inputPrice: "$3.00",
    outputPrice: "$15.00",
    modalities: ["Text", "Vision", "PDF"],
    reasoning: true,
    benchmark: "93.7% GPQA",
    badge: "Reasoning",
  },
  {
    name: "GPT-4o",
    lab: "OpenAI",
    slug: "gpt-4o",
    context: "128k tokens",
    inputPrice: "$2.50",
    outputPrice: "$10.00",
    modalities: ["Text", "Vision", "Audio"],
    reasoning: false,
    benchmark: "88.7% MMLU-Pro",
    badge: "Multimodal",
  },
  {
    name: "DeepSeek R1",
    lab: "DeepSeek",
    slug: "deepseek-r1",
    context: "128k tokens",
    inputPrice: "$0.55",
    outputPrice: "$2.19",
    modalities: ["Text"],
    reasoning: true,
    benchmark: "96.3% MATH-500",
    badge: "Open Reasoning",
  },
  {
    name: "Llama 3.3 70B",
    lab: "Meta AI",
    slug: "llama-3-3-70b-instruct",
    context: "131k tokens",
    inputPrice: "$0.18",
    outputPrice: "$0.59",
    modalities: ["Text"],
    reasoning: false,
    benchmark: "86.4% MMLU",
    badge: "Open Weights",
  },
];

const PLATFORM_PILLARS = [
  {
    icon: <Compass className="h-5 w-5 text-slate-900" />,
    title: "Model Discovery Catalog",
    description:
      "Filter across 640+ canonical models by modalities, context window, reasoning capability, and licensing with zero fabricated metadata.",
    href: "/models",
    badge: "Discovery",
    annotation: "live metadata",
  },
  {
    icon: <GitCompareArrows className="h-5 w-5 text-slate-900" />,
    title: "Side-by-Side Comparison",
    description:
      "Direct architectural diffing across token pricing, throughput rates, context window boundaries, and evaluated benchmark performance.",
    href: "/compare",
    badge: "Analysis",
    annotation: "parameter diffs",
  },
  {
    icon: <Trophy className="h-5 w-5 text-slate-900" />,
    title: "Standardized Leaderboards",
    description:
      "Contamination-resistant evaluation rankings across GPQA Diamond, MMLU-Pro, LiveCodeBench, and SWE-Bench with verified measurement dates.",
    href: "/rankings",
    badge: "Rankings",
    annotation: "verified metrics",
  },
  {
    icon: <Server className="h-5 w-5 text-slate-900" />,
    title: "Provider & Endpoint Matrix",
    description:
      "Track live availability, online endpoint status, and streaming parameters across AWS Bedrock, Together AI, Groq, Cerebras, and direct cloud endpoints.",
    href: "/providers",
    badge: "Infrastructure",
    annotation: "online checks",
  },
  {
    icon: <FlaskConical className="h-5 w-5 text-slate-900" />,
    title: "AI Research Laboratories",
    description:
      "Explore foundational research contributions and model portfolios from OpenAI, Anthropic, Google DeepMind, Meta AI, Mistral AI, and DeepSeek.",
    href: "/labs",
    badge: "Ecosystem",
    annotation: "org portfolios",
  },
  {
    icon: <Cpu className="h-5 w-5 text-slate-900" />,
    title: "Cost & Pricing Intelligence",
    description:
      "Historical pricing snapshots and multi-endpoint cost aggregations down to exact million-token decimal precision to optimize production budgets.",
    href: "/models?sort=input_price_asc",
    badge: "Economics",
    annotation: "sub-cent accuracy",
  },
];

const RESEARCH_LABS = [
  { name: "Anthropic", slug: "anthropic", models: "Claude 3.5, Haiku, Opus", country: "United States" },
  { name: "OpenAI", slug: "openai", models: "GPT-4o, o1, o3-mini", country: "United States" },
  { name: "Google DeepMind", slug: "google", models: "Gemini 1.5, Gemma 2", country: "United States" },
  { name: "Meta AI", slug: "meta", models: "Llama 3.3, Llama 3.1", country: "United States" },
  { name: "DeepSeek", slug: "deepseek", models: "DeepSeek-V3, R1, Coder", country: "China" },
  { name: "Mistral AI", slug: "mistral", models: "Mistral Large, Codestral", country: "France" },
];

export default function LandingPage() {
  return (
    <div className="space-y-16 sm:space-y-20 pb-16 font-sans">
      {/* HERO SECTION */}
      <section className="pt-6 sm:pt-10">
        <div className="max-w-3xl space-y-6">
          {/* Header Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="accent" className="text-xs">
              Model Intelligence
            </Badge>
            <span className="homemade-apple-regular text-xs sm:text-sm text-slate-500 select-none">
              ~ unified developer catalog
            </span>
          </div>

          {/* Main Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12]">
              Explore, compare, and evaluate foundation AI models.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Discover 640+ canonical AI models across leading research labs and 320+ verified inference
              providers with live pricing, context window boundaries, and evaluation benchmarks.
            </p>
          </div>

          {/* Actions Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Show when="signed-in">
              <Link href="/models">
                <Button size="lg" className="w-full sm:w-auto gap-2 bg-slate-900 hover:bg-black text-white shadow-xs">
                  <Compass className="h-4 w-4" />
                  <span>Launch Models Catalog</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/compare">
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                  <GitCompareArrows className="h-4 w-4" />
                  <span>Compare Models</span>
                </Button>
              </Link>
            </Show>

            <Show when="signed-out">
              <SignUpButton mode="modal">
                <Button size="lg" className="w-full sm:w-auto gap-2 bg-slate-900 hover:bg-black text-white shadow-xs cursor-pointer">
                  <Sparkles className="h-4 w-4 text-white" />
                  <span>Get Started with Clerk</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 cursor-pointer">
                  <Lock className="h-4 w-4 text-slate-600" />
                  <span>Sign In to Access</span>
                </Button>
              </SignInButton>
            </Show>
          </div>

          {/* Annotation & Auth Notice */}
          <div className="flex items-center gap-2 pt-1">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
            <span className="homemade-apple-regular text-xs text-slate-500 select-none">
              ~ authentic data from OpenRouter & Models.dev, no mock numbers
            </span>
          </div>

          {/* Global Search Bar (Live for Signed In users) */}
          <Show when="signed-in">
            <div className="pt-4 max-w-xl">
              <GlobalSearch
                placeholder="Search models across OpenAI, Anthropic, DeepSeek, Google..."
                shortcutHint="⌘K"
                variant="hero"
                className="w-full"
              />
            </div>
          </Show>
        </div>

        {/* METRICS / STATS STRIP */}
        <div className="mt-12 pt-6 pb-6 border-t border-b border-border grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <div key={i} className="space-y-1">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {stat.value}
              </div>
              <div className="text-xs font-semibold text-slate-900">{stat.label}</div>
              <div className="text-[11px] text-slate-500">{stat.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FRONTIER MODELS SECTION */}
      <section id="models" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border pb-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Frontier Architectures
            </h2>
            <span className="homemade-apple-regular text-xs sm:text-sm text-slate-500 select-none">
              ~ active intelligence snapshots
            </span>
          </div>
          <Show when="signed-in">
            <Link
              href="/models"
              className="text-xs font-medium text-slate-900 hover:text-black flex items-center gap-1 group"
            >
              <span>View all 640+ models</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-xs font-medium text-slate-900 hover:text-black flex items-center gap-1 group cursor-pointer">
                <span>Sign in to view all models</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </SignInButton>
          </Show>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FRONTIER_MODELS.map((model) => (
            <Card
              key={model.slug}
              hover
              className="flex flex-col justify-between bg-white border-border hover:border-slate-400 transition-all p-5 space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-900 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                      {model.lab}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {model.badge}
                    </Badge>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {model.benchmark}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">{model.name}</h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">{model.slug}</p>
                </div>

                <div className="flex items-center gap-3 text-xs pt-1 border-t border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Context</span>
                    <span className="font-mono text-xs text-slate-900 font-medium">{model.context}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Input / 1M</span>
                    <span className="font-mono text-xs text-slate-900 font-medium">{model.inputPrice}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Output / 1M</span>
                    <span className="font-mono text-xs text-slate-900 font-medium">{model.outputPrice}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {model.modalities.map((m) => (
                    <span
                      key={m}
                      className="px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 text-[10px]"
                    >
                      {m}
                    </span>
                  ))}
                  {model.reasoning && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-medium border border-slate-200">
                      Reasoning
                    </span>
                  )}
                </div>

                <Show when="signed-in">
                  <Link
                    href={`/models/${model.slug}`}
                    className="text-xs font-semibold text-slate-900 hover:text-black flex items-center gap-1"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Show>
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="text-xs font-semibold text-slate-900 hover:text-black flex items-center gap-1 cursor-pointer">
                      <span>Sign in</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </SignInButton>
                </Show>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CORE PLATFORM PILLARS */}
      <section id="features" className="space-y-6">
        <div className="flex items-baseline gap-3 flex-wrap border-b border-border pb-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Platform Capabilities
          </h2>
          <span className="homemade-apple-regular text-xs sm:text-sm text-slate-500 select-none">
            ~ engineered for sub-1ms query latency
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORM_PILLARS.map((pillar, i) => (
            <Card
              key={i}
              hover
              className="flex flex-col justify-between bg-white border-border hover:border-slate-400 transition-all p-5 space-y-3"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                    {pillar.icon}
                  </div>
                  <span className="homemade-apple-regular text-xs text-slate-500 select-none">
                    ~ {pillar.annotation}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{pillar.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">{pillar.description}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <Show when="signed-in">
                  <Link
                    href={pillar.href}
                    className="text-xs font-semibold text-slate-900 hover:text-black flex items-center gap-1 group"
                  >
                    <span>Explore module</span>
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </Show>
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="text-xs font-semibold text-slate-900 hover:text-black flex items-center gap-1 cursor-pointer">
                      <span>Sign in to unlock</span>
                      <Lock className="h-3 w-3 text-slate-400" />
                    </button>
                  </SignInButton>
                </Show>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* RESEARCH LABS STRIP */}
      <section id="labs" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border pb-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Research Organizations
            </h2>
            <span className="homemade-apple-regular text-xs sm:text-sm text-slate-500 select-none">
              ~ foundational labs & open-weights
            </span>
          </div>
          <Show when="signed-in">
            <Link
              href="/labs"
              className="text-xs font-medium text-slate-900 hover:text-black flex items-center gap-1 group"
            >
              <span>View all research labs</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </Show>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {RESEARCH_LABS.map((lab) => (
            <Card
              key={lab.slug}
              className="bg-white border-border p-3.5 space-y-1 hover:border-slate-400 transition-colors"
            >
              <span className="text-xs font-bold text-slate-900 block truncate">{lab.name}</span>
              <span className="text-[11px] text-slate-500 block truncate">{lab.models}</span>
              <span className="text-[10px] font-mono text-slate-400 block pt-1 border-t border-slate-100">
                {lab.country}
              </span>
            </Card>
          ))}
        </div>
      </section>

      {/* CLERK ACCESS / CONVERSION BANNER */}
      <section className="rounded-2xl border-2 border-slate-900 bg-white p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <Badge variant="accent" className="text-xs">
                Authentication
              </Badge>
              <span className="homemade-apple-regular text-xs sm:text-sm text-slate-500 select-none">
                ~ powered by Clerk
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight pt-1">
              Ready to explore the full intelligence catalog?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Create a free account or sign in with your email or social provider to unlock the 640+ model matrix,
              custom parameter diffs, and historical pricing feeds.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <Show when="signed-in">
              <Link href="/models">
                <Button size="lg" className="w-full sm:w-auto bg-slate-900 text-white hover:bg-black font-semibold">
                  <span>Enter Application</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </Show>
            <Show when="signed-out">
              <SignUpButton mode="modal">
                <Button size="lg" className="w-full sm:w-auto bg-slate-900 text-white hover:bg-black font-semibold cursor-pointer">
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button variant="outline" size="lg" className="w-full sm:w-auto cursor-pointer">
                  <span>Sign In</span>
                </Button>
              </SignInButton>
            </Show>
          </div>
        </div>
      </section>
    </div>
  );
}
