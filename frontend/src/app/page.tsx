import Link from "next/link";
import {
  Show,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";
import { GlobalSearch } from "@/components/search/global-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Compass,
  GitCompareArrows,
  Trophy,
  Server,
  FlaskConical,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Sparkles,
  CheckCircle2,
  Lock,
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
  { value: "sub-1ms", label: "Query Architecture", description: "Parameterized PostgreSQL CTEs" },
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
    badge: "Reasoning Leader",
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
    badge: "Multimodal Standard",
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
    icon: <Compass className="h-6 w-6 text-blue-600" />,
    title: "Comprehensive Model Discovery",
    description:
      "Filter across 640+ canonical models by modalities (vision, audio), context window size, reasoning capability, and open-weight status with zero fabricated metadata.",
    href: "/models",
    badge: "Core Catalog",
  },
  {
    icon: <GitCompareArrows className="h-6 w-6 text-emerald-600" />,
    title: "Side-by-Side Model Comparison",
    description:
      "Multi-model architectural diffing across token pricing, throughput rates, context window boundaries, and evaluated benchmark performance in real-time.",
    href: "/compare",
    badge: "Analytics Engine",
  },
  {
    icon: <Trophy className="h-6 w-6 text-amber-600" />,
    title: "Standardized Benchmark Leaderboards",
    description:
      "Contamination-resistant evaluation rankings across GPQA Diamond, MMLU-Pro, LiveCodeBench, and SWE-Bench with verified measurement dates.",
    href: "/rankings",
    badge: "Evaluations",
  },
  {
    icon: <Server className="h-6 w-6 text-purple-600" />,
    title: "Hardware Endpoint & Provider Matrix",
    description:
      "Track live availability, online endpoint status, and streaming parameters across AWS Bedrock, Together AI, Groq, Cerebras, and direct cloud endpoints.",
    href: "/providers",
    badge: "Infrastructure",
  },
  {
    icon: <FlaskConical className="h-6 w-6 text-rose-600" />,
    title: "Verified AI Research Labs",
    description:
      "Explore foundational research contributions and model portfolios from OpenAI, Anthropic, Google DeepMind, Meta AI, Mistral AI, and DeepSeek.",
    href: "/labs",
    badge: "Organizations",
  },
  {
    icon: <Cpu className="h-6 w-6 text-indigo-600" />,
    title: "Real-Time Pricing Intelligence",
    description:
      "Historical pricing snapshots and multi-endpoint cost aggregations down to exact million-token decimal precision to optimize production inference budgets.",
    href: "/models?sort=input_price_asc",
    badge: "Cost Analytics",
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
    <div className="space-y-20 pb-20">
      {/* HERO SECTION */}
      <section className="pt-8 sm:pt-14 pb-6 max-w-5xl mx-auto text-center sm:text-left">
        <div className="space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-50/80 text-slate-800 text-xs font-medium shadow-2xs">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI Model Intelligence Platform</span>
            <span className="text-slate-300">|</span>
            <span className="homemade-apple-regular text-[11px] text-slate-500">
              the whole ecosystem
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.12]">
            Every AI Model. <br className="hidden sm:inline" />
            Every Provider. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900">
              One Unified Intelligence Engine.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
            Discover, compare, and benchmark 640+ foundation AI models across leading research
            labs and 320+ inference providers with live pricing, context windows, and verified hardware endpoints.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 justify-start">
            <Show when="signed-in">
              <Link href="/models">
                <Button size="lg" className="w-full sm:w-auto gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-xs">
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
                <Button size="lg" className="w-full sm:w-auto gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>Get Started with Clerk</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 cursor-pointer">
                  <Lock className="h-4 w-4 text-slate-500" />
                  <span>Sign In to Access</span>
                </Button>
              </SignInButton>
            </Show>
          </div>

          {/* Auth Notice Badge */}
          <Show when="signed-out">
            <div className="pt-1 flex items-center gap-2 text-xs text-slate-500 justify-center sm:justify-start">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Authentication required for full catalog & analytics access</span>
            </div>
          </Show>
        </div>

        {/* Global Search Bar (Live for Signed In users) */}
        <Show when="signed-in">
          <div className="mt-10 max-w-xl">
            <GlobalSearch
              placeholder="Search models across OpenAI, Anthropic, DeepSeek, Google..."
              shortcutHint="⌘K"
              variant="hero"
              className="w-full"
            />
          </div>
        </Show>

        {/* STATS STRIP */}
        <div className="mt-14 pt-8 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <div key={i} className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {stat.value}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                {stat.label}
              </div>
              <div className="text-xs text-slate-500">{stat.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FRONTIER MODEL SHOWCASE */}
      <section id="models" className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              <span>Live Intelligence</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Featured Frontier Architectures
            </h2>
          </div>
          <Show when="signed-in">
            <Link
              href="/models"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View all 640+ models</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                <span>Sign in to view all models</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </SignInButton>
          </Show>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FRONTIER_MODELS.map((model) => (
            <div
              key={model.slug}
              className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{model.name}</h3>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {model.lab}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">/{model.slug}</span>
                </div>
                <Badge variant="accent" className="text-[11px] shrink-0">
                  {model.badge}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Context</span>
                  <span className="font-semibold text-slate-800">{model.context}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Pricing (1M)</span>
                  <span className="font-semibold text-slate-800">
                    {model.inputPrice} / {model.outputPrice}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Top Benchmark</span>
                  <span className="font-semibold text-emerald-600">{model.benchmark}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex gap-1.5 flex-wrap">
                  {model.modalities.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                    >
                      {m}
                    </span>
                  ))}
                  {model.reasoning && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-medium">
                      Reasoning
                    </span>
                  )}
                </div>

                <Show when="signed-in">
                  <Link
                    href={`/models/${model.slug}`}
                    className="text-xs font-medium text-slate-900 hover:text-blue-600 flex items-center gap-1"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Show>
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="text-xs font-medium text-slate-900 hover:text-blue-600 flex items-center gap-1 cursor-pointer">
                      <span>Sign in to view</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </SignInButton>
                </Show>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CORE PLATFORM PILLARS */}
      <section id="features" className="max-w-5xl mx-auto space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="outline" className="text-xs font-medium">
            System Architecture
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Engineered for Precision & Speed
          </h2>
          <p className="text-sm text-slate-600">
            Everything engineers and AI teams need to discover models, track benchmark drift, and optimize provider execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORM_PILLARS.map((pillar, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                    {pillar.icon}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {pillar.badge}
                  </Badge>
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">{pillar.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{pillar.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <Show when="signed-in">
                  <Link
                    href={pillar.href}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>Explore module</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Show>
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="text-xs font-medium text-slate-700 hover:text-blue-600 flex items-center gap-1 cursor-pointer">
                      <span>Sign in to unlock</span>
                      <Lock className="h-3 w-3 text-slate-400" />
                    </button>
                  </SignInButton>
                </Show>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* RESEARCH LABS STRIP */}
      <section id="labs" className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1 flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5" />
              <span>Ecosystem Coverage</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Verified AI Research Organizations
            </h2>
          </div>
          <Show when="signed-in">
            <Link
              href="/labs"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View all research labs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Show>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {RESEARCH_LABS.map((lab) => (
            <div
              key={lab.slug}
              className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5 text-center sm:text-left hover:border-slate-300 transition-colors"
            >
              <span className="text-xs font-bold text-slate-900 block truncate">{lab.name}</span>
              <span className="text-[10px] text-slate-500 block truncate">{lab.models}</span>
              <span className="text-[9px] uppercase font-mono text-slate-400 block">{lab.country}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CLERK AUTHENTICATION BANNER */}
      <section className="max-w-5xl mx-auto">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 sm:p-12 space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold">Secure Access Managed by Clerk</h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Enterprise-grade authentication with passkeys, social SSO, and multi-factor session security.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs text-slate-300 border-t border-white/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Single Sign-On (Google & GitHub)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Biometric Passkeys & WebAuthn</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Protected APIs & Rate Defenses</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Show when="signed-in">
              <Link href="/models">
                <Button size="lg" className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 font-semibold">
                  <span>Enter Application</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </Show>
            <Show when="signed-out">
              <SignUpButton mode="modal">
                <Button size="lg" className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 font-semibold cursor-pointer">
                  <span>Create Free Account</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-white border-white/20 hover:bg-white/10 cursor-pointer">
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
