import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * AI Details Baseline Database Seeder
 *
 * Idempotent seed script populating:
 * 1. AI Labs (OpenAI, Anthropic, Google, Meta, Mistral AI, DeepSeek)
 * 2. External Data Sources (OpenRouter, Models.dev, Hugging Face, Artificial Analysis)
 * 3. Baseline Inference Providers (Independent from external sources)
 * 4. Standard Benchmark Definitions
 *
 * All operations use Prisma upsert to guarantee idempotency.
 */

const connectionString =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/aidetails?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting AI Details database seeding...");

  // 1. AI Research Organizations & Labs
  const labs = [
    {
      slug: "openai",
      name: "OpenAI",
      website: "https://openai.com",
      description: "AI research and deployment company behind GPT-4 and o-series reasoning models.",
      country: "United States",
    },
    {
      slug: "anthropic",
      name: "Anthropic",
      website: "https://anthropic.com",
      description: "AI safety and research company, creators of the Claude model family.",
      country: "United States",
    },
    {
      slug: "google",
      name: "Google DeepMind",
      website: "https://deepmind.google",
      description: "Google's premier AI research laboratory, creators of Gemini and Gemma.",
      country: "United States",
    },
    {
      slug: "meta",
      name: "Meta AI",
      website: "https://ai.meta.com",
      description: "Open AI research division at Meta, developers of the open-weight Llama model family.",
      country: "United States",
    },
    {
      slug: "mistral",
      name: "Mistral AI",
      website: "https://mistral.ai",
      description: "European frontier AI lab producing high-efficiency open and commercial models.",
      country: "France",
    },
    {
      slug: "deepseek",
      name: "DeepSeek",
      website: "https://deepseek.com",
      description: "Pioneering AI research company specializing in open reasoning and MoE architectures.",
      country: "China",
    },
    {
      slug: "xai",
      name: "xAI",
      website: "https://x.ai",
      description: "AI research and deployment company developing Groq and frontier reasoning systems.",
      country: "United States",
    },
    {
      slug: "qwen",
      name: "Qwen / Alibaba",
      website: "https://qwenlm.github.io",
      description: "Alibaba Cloud's foundational AI research initiative creating multilingual and vision-language open weights.",
      country: "China",
    },
    {
      slug: "cohere",
      name: "Cohere",
      website: "https://cohere.com",
      description: "Enterprise foundation AI lab specializing in Command models and advanced multilingual embeddings.",
      country: "Canada",
    },
  ];

  console.log(`Seeding ${labs.length} AI research organizations...`);
  for (const lab of labs) {
    await prisma.aiLab.upsert({
      where: { slug: lab.slug },
      update: {
        name: lab.name,
        website: lab.website,
        description: lab.description,
        country: lab.country,
      },
      create: lab,
    });
  }

  // 2. External Data Sources (Where AI Details retrieves data)
  const sources = [
    {
      slug: "openrouter",
      name: "OpenRouter API",
      baseUrl: "https://openrouter.ai/api/v1",
      website: "https://openrouter.ai",
      isActive: true,
    },
    {
      slug: "modelsdev",
      name: "Models.dev Catalog",
      baseUrl: "https://models.dev",
      website: "https://models.dev",
      isActive: true,
    },
    {
      slug: "models_dev",
      name: "Models.dev Catalog",
      baseUrl: "https://models.dev",
      website: "https://models.dev",
      isActive: true,
    },
    {
      slug: "huggingface",
      name: "Hugging Face Hub API",
      baseUrl: "https://huggingface.co/api",
      website: "https://huggingface.co",
      isActive: true,
    },
    {
      slug: "artificial_analysis",
      name: "Artificial Analysis API",
      baseUrl: "https://artificialanalysis.ai/api/v2",
      website: "https://artificialanalysis.ai",
      isActive: true,
    },
  ];

  console.log(`Seeding ${sources.length} external data sources...`);
  for (const source of sources) {
    await prisma.externalSource.upsert({
      where: { slug: source.slug },
      update: {
        name: source.name,
        baseUrl: source.baseUrl,
        website: source.website,
        isActive: source.isActive,
      },
      create: source,
    });
  }

  // 3. Baseline Inference Providers (Where developers access and execute models)
  const providers = [
    {
      slug: "openai-api",
      name: "OpenAI API",
      website: "https://platform.openai.com",
      providerType: "DIRECT" as const,
      apiDocUrl: "https://platform.openai.com/docs",
      isActive: true,
    },
    {
      slug: "anthropic-api",
      name: "Anthropic API",
      website: "https://docs.anthropic.com",
      providerType: "DIRECT" as const,
      apiDocUrl: "https://docs.anthropic.com/en/api",
      isActive: true,
    },
    {
      slug: "anthropic",
      name: "Anthropic",
      website: "https://docs.anthropic.com",
      providerType: "DIRECT" as const,
      apiDocUrl: "https://docs.anthropic.com/en/docs/about-claude/models",
      isActive: true,
    },
    {
      slug: "openai",
      name: "OpenAI",
      website: "https://platform.openai.com",
      providerType: "DIRECT" as const,
      apiDocUrl: "https://platform.openai.com/docs/models",
      isActive: true,
    },
    {
      slug: "deepseek",
      name: "DeepSeek",
      website: "https://deepseek.com",
      providerType: "DIRECT" as const,
      apiDocUrl: "https://api-docs.deepseek.com",
      isActive: true,
    },
    {
      slug: "togetherai",
      name: "Together AI",
      website: "https://together.ai",
      providerType: "AGGREGATOR" as const,
      apiDocUrl: "https://docs.together.ai",
      isActive: true,
    },
    {
      slug: "google-vertex",
      name: "Google Cloud Vertex AI",
      website: "https://cloud.google.com/vertex-ai",
      providerType: "CLOUD" as const,
      apiDocUrl: "https://cloud.google.com/vertex-ai/docs",
      isActive: true,
    },
    {
      slug: "together-ai",
      name: "Together AI",
      website: "https://together.ai",
      providerType: "AGGREGATOR" as const,
      apiDocUrl: "https://docs.together.ai",
      isActive: true,
    },
    {
      slug: "groq",
      name: "Groq",
      website: "https://groq.com",
      providerType: "HOSTING" as const,
      apiDocUrl: "https://console.groq.com/docs",
      isActive: true,
    },
    {
      slug: "openrouter-provider",
      name: "OpenRouter",
      website: "https://openrouter.ai",
      providerType: "AGGREGATOR" as const,
      apiDocUrl: "https://openrouter.ai/docs",
      isActive: true,
    },
  ];

  console.log(`Seeding ${providers.length} inference providers...`);
  for (const provider of providers) {
    await prisma.provider.upsert({
      where: { slug: provider.slug },
      update: {
        name: provider.name,
        website: provider.website,
        providerType: provider.providerType,
        apiDocUrl: provider.apiDocUrl,
        isActive: provider.isActive,
      },
      create: provider,
    });
  }

  // 4. Standard Benchmark Definitions
  const benchmarks = [
    {
      slug: "gpqa",
      version: "1.0",
      name: "GPQA (Graduate-Level Google-Proof Q&A)",
      category: "REASONING" as const,
      metricName: "Accuracy",
      metricUnit: "PERCENTAGE" as const,
      higherIsBetter: true,
      description: "Challenging graduate-level scientific and mathematical reasoning benchmark.",
    },
    {
      slug: "mmlu_pro",
      version: "1.0",
      name: "MMLU-Pro",
      category: "KNOWLEDGE" as const,
      metricName: "Accuracy",
      metricUnit: "PERCENTAGE" as const,
      higherIsBetter: true,
      description: "More robust, reasoning-intensive extension of the classic Massive Multitask Language Understanding benchmark.",
    },
    {
      slug: "livecodebench",
      version: "1.0",
      name: "LiveCodeBench",
      category: "CODING" as const,
      metricName: "Pass@1",
      metricUnit: "PERCENTAGE" as const,
      higherIsBetter: true,
      description: "Contamination-resistant competitive coding benchmark based on recent problem sets.",
    },
    {
      slug: "throughput",
      version: "1.0",
      name: "Output Token Speed",
      category: "SPEED" as const,
      metricName: "Throughput",
      metricUnit: "TOKENS_PER_SEC" as const,
      higherIsBetter: true,
      description: "Average output token generation speed across standardized prompt lengths.",
    },
  ];

  console.log(`Seeding ${benchmarks.length} benchmark definitions...`);
  for (const benchmark of benchmarks) {
    await prisma.benchmark.upsert({
      where: {
        slug_version: {
          slug: benchmark.slug,
          version: benchmark.version,
        },
      },
      update: {
        name: benchmark.name,
        category: benchmark.category,
        metricName: benchmark.metricName,
        metricUnit: benchmark.metricUnit,
        higherIsBetter: benchmark.higherIsBetter,
        description: benchmark.description,
      },
      create: benchmark,
    });
  }

  console.log("✅ AI Details database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
