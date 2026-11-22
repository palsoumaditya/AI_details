import "./env";
import { ZodError } from "zod";
import { CompareRequestSchema } from "../src/shared/schemas/api";
import { CompareQueryService, compareQueryService } from "../src/services/compare-query.service";
import type { IModelDetailQueryService } from "../src/services/contracts/index";
import type { ModelDetailDto, PricingHistoryResult } from "../src/shared/types/api";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`   ✓ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`   ✗ [FAIL] ${message}`);
    failedCount++;
  }
}

// Mock Model Detail Query Service for deterministic offline testing
class MockModelDetailQueryService implements IModelDetailQueryService {
  private models: Record<string, ModelDetailDto> = {
    "gpt-4o": {
      id: "m-1",
      slug: "gpt-4o",
      name: "GPT-4o",
      description: "Flagship omni model",
      family: "GPT-4",
      architectureType: "DENSE",
      releaseDate: "2024-05-13T00:00:00.000Z",
      knowledgeCutoff: "2023-10",
      lastUpdated: "2024-05-13T00:00:00.000Z",
      license: "Proprietary",
      isReasoning: false,
      isOpenWeight: false,
      contextWindow: 128000,
      maxOutputTokens: 4096,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      capabilities: null,
      status: "ACTIVE",
      labs: [
        {
          id: "lab-1",
          slug: "openai",
          name: "OpenAI",
          website: "https://openai.com",
          logoUrl: null,
          country: "US",
          relationshipType: "CREATOR",
        },
      ],
      endpoints: [
        {
          id: "ep-1",
          endpointKey: "openai/gpt-4o",
          name: "OpenAI Direct",
          status: "ONLINE",
          contextWindow: 128000,
          maxOutputTokens: 4096,
          inputModalities: ["text", "image"],
          outputModalities: ["text"],
          capabilities: null,
          isModerated: true,
          lastSeenAt: "2024-05-13T00:00:00.000Z",
          provider: {
            id: "p-1",
            slug: "openai",
            name: "OpenAI",
            website: "https://openai.com",
            logoUrl: null,
            providerType: "DIRECT",
          },
          sourceMappings: [],
          pricing: [
            {
              source: { slug: "openrouter", name: "OpenRouter" },
              inputPricePerMillion: "2.5000",
              outputPricePerMillion: "10.0000",
              cacheReadPricePerMillion: null,
              cacheWritePricePerMillion: null,
              currency: "USD",
              pricingUnit: "1M_TOKENS",
              observedAt: "2024-05-13T00:00:00.000Z",
            },
          ],
        },
      ],
      pricingSummary: {
        lowestInput: {
          amount: "2.5000",
          currency: "USD",
          unit: "1M_TOKENS",
          provider: { name: "OpenAI", slug: "openai" },
          source: "openrouter",
          observedAt: "2024-05-13T00:00:00.000Z",
        },
        lowestOutput: {
          amount: "10.0000",
          currency: "USD",
          unit: "1M_TOKENS",
          provider: { name: "OpenAI", slug: "openai" },
          source: "openrouter",
          observedAt: "2024-05-13T00:00:00.000Z",
        },
        availableProviderCount: 1,
      },
      benchmarks: [
        {
          id: "b-1",
          benchmark: {
            slug: "mmlu",
            name: "MMLU",
            version: "v1",
            category: "General Knowledge",
            metricName: "Accuracy",
            metricUnit: "%",
            higherIsBetter: true,
          },
          result: {
            value: "88.7",
            evaluationDate: "2024-05-13T00:00:00.000Z",
            modelVersion: "2024-05-13",
            sampleSize: null,
            sourceUrl: null,
            notes: null,
          },
          source: { slug: "openrouter", name: "OpenRouter" },
        },
      ],
      provenance: {},
      dataQuality: {
        status: "VERIFIED",
        warnings: [],
        conflictCount: 0,
        hasConflicts: false,
        lastMetadataUpdate: "2024-05-13T00:00:00.000Z",
      },
    },
    "claude-3-5-sonnet": {
      id: "m-2",
      slug: "claude-3-5-sonnet",
      name: "Claude 3.5 Sonnet",
      description: "Frontier intelligent model",
      family: "Claude 3.5",
      architectureType: "DENSE",
      releaseDate: "2024-06-20T00:00:00.000Z",
      knowledgeCutoff: "2024-04",
      lastUpdated: "2024-06-20T00:00:00.000Z",
      license: "Proprietary",
      isReasoning: false,
      isOpenWeight: false,
      contextWindow: 200000,
      maxOutputTokens: 8192,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      capabilities: null,
      status: "ACTIVE",
      labs: [
        {
          id: "lab-2",
          slug: "anthropic",
          name: "Anthropic",
          website: "https://anthropic.com",
          logoUrl: null,
          country: "US",
          relationshipType: "CREATOR",
        },
      ],
      endpoints: [],
      pricingSummary: {
        lowestInput: {
          amount: "3.0000",
          currency: "USD",
          unit: "1M_TOKENS",
          provider: { name: "Anthropic", slug: "anthropic" },
          source: "openrouter",
          observedAt: "2024-06-20T00:00:00.000Z",
        },
        lowestOutput: {
          amount: "15.0000",
          currency: "USD",
          unit: "1M_TOKENS",
          provider: { name: "Anthropic", slug: "anthropic" },
          source: "openrouter",
          observedAt: "2024-06-20T00:00:00.000Z",
        },
        availableProviderCount: 2,
      },
      benchmarks: [
        {
          id: "b-2",
          benchmark: {
            slug: "mmlu",
            name: "MMLU",
            version: "v1",
            category: "General Knowledge",
            metricName: "Accuracy",
            metricUnit: "%",
            higherIsBetter: true,
          },
          result: {
            value: "88.3",
            evaluationDate: "2024-06-20T00:00:00.000Z",
            modelVersion: "2024-06-20",
            sampleSize: null,
            sourceUrl: null,
            notes: null,
          },
          source: { slug: "openrouter", name: "OpenRouter" },
        },
      ],
      provenance: {},
      dataQuality: {
        status: "VERIFIED",
        warnings: [],
        conflictCount: 0,
        hasConflicts: false,
        lastMetadataUpdate: "2024-05-13T00:00:00.000Z",
      },
    },
  };

  async getModelDetails(slug: string): Promise<ModelDetailDto | null> {
    return this.models[slug] ?? null;
  }

  async getModelPricingHistory(_slug: string, _query: unknown): Promise<PricingHistoryResult | null> {
    return null;
  }
}

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log(" ONEATLAS TASK 5 — MODEL COMPARISON ENGINE TEST SUITE");
  console.log("=======================================================\n");

  // SECTION 1: Schema Validation
  console.log("1. CompareRequestSchema Validation Tests:");

  const valid2 = CompareRequestSchema.safeParse({ modelSlugs: ["gpt-4o", "claude-3-5-sonnet"] });
  assert(valid2.success, "2 unique model slugs accepted");

  const valid4 = CompareRequestSchema.safeParse({
    modelSlugs: ["gpt-4o", "claude-3-5-sonnet", "deepseek-r1", "gemini-1-5-pro"],
  });
  assert(valid4.success, "4 unique model slugs accepted");

  const invalid1 = CompareRequestSchema.safeParse({ modelSlugs: ["gpt-4o"] });
  assert(!invalid1.success, "Fewer than 2 models rejected (< 2)");

  const invalid5 = CompareRequestSchema.safeParse({
    modelSlugs: ["m1", "m2", "m3", "m4", "m5"],
  });
  assert(!invalid5.success, "More than 4 models rejected (> 4)");

  const invalidDuplicates = CompareRequestSchema.safeParse({
    modelSlugs: ["gpt-4o", "gpt-4o"],
  });
  assert(!invalidDuplicates.success, "Duplicate model slugs rejected");

  // SECTION 2: CompareQueryService Logic & Alignment Tests
  console.log("\n2. CompareQueryService Mock Execution & Matrix Alignment:");

  const mockService = new CompareQueryService(new MockModelDetailQueryService());

  const result = await mockService.compareModels({
    modelSlugs: ["gpt-4o", "claude-3-5-sonnet"],
  });

  assert(result.models.length === 2, "Returned exactly 2 model details");
  assert(result.models[0].slug === "gpt-4o", "Input order preserved: gpt-4o first");
  assert(result.models[1].slug === "claude-3-5-sonnet", "Input order preserved: claude-3-5-sonnet second");

  // Benchmark Alignment & Leader
  const mmluBenchmark = result.comparisonMatrix.benchmarks.find((b) => b.benchmark.slug === "mmlu");
  assert(!!mmluBenchmark, "MMLU benchmark row created and aligned");
  assert(mmluBenchmark?.scores["gpt-4o"]?.value === "88.7", "GPT-4o MMLU score aligned (88.7)");
  assert(mmluBenchmark?.scores["claude-3-5-sonnet"]?.value === "88.3", "Claude 3.5 Sonnet MMLU score aligned (88.3)");
  assert(mmluBenchmark?.bestModelSlug === "gpt-4o", "GPT-4o correctly identified as MMLU leader (higherIsBetter)");
  assert(mmluBenchmark?.scores["gpt-4o"]?.isLeader === true, "GPT-4o score marked with isLeader: true");
  assert(!mmluBenchmark?.scores["claude-3-5-sonnet"]?.isLeader, "Claude score is not leader");

  // Specs Summary Highlights
  const summary = result.comparisonMatrix.specsSummary;
  assert(summary?.cheapestInputSlug === "gpt-4o", "Cheapest input model identified ($2.50 vs $3.00)");
  assert(summary?.cheapestOutputSlug === "gpt-4o", "Cheapest output model identified ($10.00 vs $15.00)");
  assert(summary?.largestContextSlug === "claude-3-5-sonnet", "Largest context window identified (200k vs 128k)");
  assert(summary?.maxOutputTokensLeaderSlug === "claude-3-5-sonnet", "Max output tokens leader identified (8192 vs 4096)");

  // SECTION 3: Missing Model Error Handling
  console.log("\n3. Missing Model Handling:");
  let caughtMissing = false;
  try {
    await mockService.compareModels({
      modelSlugs: ["gpt-4o", "non-existent-model"],
    });
  } catch (err: unknown) {
    caughtMissing = err instanceof Error && err.message.includes("non-existent-model");
  }
  assert(caughtMissing, "Proper error thrown when requested model slug does not exist");

  // SECTION 4: Live DB Compare Smoke Test (if available)
  console.log("\n4. Live DB Compare Smoke Test:");
  try {
    const liveResult = await compareQueryService.compareModels({
      modelSlugs: ["gpt-4o", "claude-3-5-sonnet"],
    });
    assert(liveResult.models.length === 2, "Live DB comparison returned models successfully");
  } catch (err: unknown) {
    console.log(`   ℹ [SKIP] Live DB comparison skipped (DB connection offline in sandbox: ${err instanceof Error ? err.message : String(err)})`);
  }

  // Summary
  console.log("\n-------------------------------------------------------");
  console.log(` RESULTS: ${passedCount} passed, ${failedCount} failed`);
  console.log("-------------------------------------------------------\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test runner failed unexpectedly:", err);
  process.exit(1);
});
