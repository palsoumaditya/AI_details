import "./env";
import { ZodError } from "zod";
import {
  RankingsDirectoryQuerySchema,
  RankingsLeaderboardQuerySchema,
} from "../src/shared/schemas/api";
import { RankingsQueryService } from "../src/services/rankings-query.service";

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

// Mock Prisma Client for deterministic offline query testing
function createMockPrisma() {
  const benchmarks = [
    {
      id: "b-1",
      slug: "mmlu_pro",
      name: "MMLU-Pro",
      version: "1.0",
      category: "KNOWLEDGE",
      metricName: "Accuracy",
      metricUnit: "PERCENTAGE",
      higherIsBetter: true,
      description: "Massive Multitask Language Understanding Pro",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      results: [
        {
          modelId: "m-1",
          evaluationDate: new Date("2024-06-01T00:00:00Z"),
          observedAt: new Date("2024-06-01T00:00:00Z"),
        },
        {
          modelId: "m-2",
          evaluationDate: new Date("2024-06-02T00:00:00Z"),
          observedAt: new Date("2024-06-02T00:00:00Z"),
        },
      ],
    },
    {
      id: "b-2",
      slug: "latency",
      name: "Time to First Token",
      version: "1.0",
      category: "SPEED",
      metricName: "TTFT",
      metricUnit: "MILLISECONDS",
      higherIsBetter: false,
      description: "Latency benchmark where lower is better",
      createdAt: new Date("2024-01-02T00:00:00Z"),
      results: [],
    },
    {
      id: "b-3",
      slug: "livecodebench",
      name: "LiveCodeBench",
      version: "1.0",
      category: "CODING",
      metricName: "Pass@1",
      metricUnit: "PERCENTAGE",
      higherIsBetter: true,
      description: "Contamination-free code generation benchmark",
      createdAt: new Date("2024-01-03T00:00:00Z"),
      results: [],
    },
  ];

  const benchmarkResultsMMLU = [
    // Model 1: Initial older evaluation (score 70.5)
    {
      id: "br-1",
      modelId: "m-1",
      benchmarkId: "b-1",
      sourceId: "s-1",
      providerEndpointId: null,
      metricValue: { toString: () => "70.5000" },
      evaluationDate: new Date("2024-01-15T00:00:00Z"),
      observedAt: new Date("2024-01-15T00:00:00Z"),
      modelVersion: "1.0",
      sampleSize: 1000,
      evaluationConfig: null,
      sourceUrl: "https://example.com/eval1",
      notes: "Older eval",
      model: {
        id: "m-1",
        slug: "claude-3-5-sonnet",
        name: "Claude 3.5 Sonnet",
        family: "Claude 3.5",
        isReasoning: false,
        isOpenWeight: false,
        status: "ACTIVE",
        labs: [
          {
            id: "ml-1",
            relationshipType: "CREATOR",
            aiLab: { id: "lab-1", slug: "anthropic", name: "Anthropic" },
          },
        ],
      },
      source: { id: "s-1", slug: "official", name: "Official Lab Report" },
    },
    // Model 1: Newer evaluation (score 88.0) -> Should supersede br-1
    {
      id: "br-2",
      modelId: "m-1",
      benchmarkId: "b-1",
      sourceId: "s-1",
      providerEndpointId: null,
      metricValue: { toString: () => "88.0000" },
      evaluationDate: new Date("2024-06-01T00:00:00Z"),
      observedAt: new Date("2024-06-01T00:00:00Z"),
      modelVersion: "1.1",
      sampleSize: 1200,
      evaluationConfig: null,
      sourceUrl: "https://example.com/eval2",
      notes: "Updated eval",
      model: {
        id: "m-1",
        slug: "claude-3-5-sonnet",
        name: "Claude 3.5 Sonnet",
        family: "Claude 3.5",
        isReasoning: false,
        isOpenWeight: false,
        status: "ACTIVE",
        labs: [
          {
            id: "ml-1",
            relationshipType: "CREATOR",
            aiLab: { id: "lab-1", slug: "anthropic", name: "Anthropic" },
          },
        ],
      },
      source: { id: "s-1", slug: "official", name: "Official Lab Report" },
    },
    // Model 2: Score 92.5 (Clear #1)
    {
      id: "br-3",
      modelId: "m-2",
      benchmarkId: "b-1",
      sourceId: "s-1",
      providerEndpointId: null,
      metricValue: { toString: () => "92.5000" },
      evaluationDate: new Date("2024-06-02T00:00:00Z"),
      observedAt: new Date("2024-06-02T00:00:00Z"),
      modelVersion: null,
      sampleSize: null,
      evaluationConfig: null,
      sourceUrl: null,
      notes: null,
      model: {
        id: "m-2",
        slug: "o1",
        name: "o1",
        family: "o1",
        isReasoning: true,
        isOpenWeight: false,
        status: "ACTIVE",
        labs: [
          {
            id: "ml-2",
            relationshipType: "CREATOR",
            aiLab: { id: "lab-2", slug: "openai", name: "OpenAI" },
          },
        ],
      },
      source: { id: "s-1", slug: "official", name: "Official Lab Report" },
    },
    // Model 3: Score 88.0 (Ties with Model 1 for rank 2!)
    {
      id: "br-4",
      modelId: "m-3",
      benchmarkId: "b-1",
      sourceId: "s-1",
      providerEndpointId: null,
      metricValue: { toString: () => "88.0000" },
      evaluationDate: new Date("2024-05-20T00:00:00Z"),
      observedAt: new Date("2024-05-20T00:00:00Z"),
      modelVersion: null,
      sampleSize: null,
      evaluationConfig: null,
      sourceUrl: null,
      notes: null,
      model: {
        id: "m-3",
        slug: "gpt-4o",
        name: "GPT-4o",
        family: "GPT-4",
        isReasoning: false,
        isOpenWeight: false,
        status: "ACTIVE",
        labs: [
          {
            id: "ml-3",
            relationshipType: "CREATOR",
            aiLab: { id: "lab-2", slug: "openai", name: "OpenAI" },
          },
        ],
      },
      source: { id: "s-1", slug: "official", name: "Official Lab Report" },
    },
    // Model 4: Score 82.0 (Should be Rank 4 due to 1224 tie above)
    {
      id: "br-5",
      modelId: "m-4",
      benchmarkId: "b-1",
      sourceId: "s-1",
      providerEndpointId: null,
      metricValue: { toString: () => "82.0000" },
      evaluationDate: new Date("2024-04-10T00:00:00Z"),
      observedAt: new Date("2024-04-10T00:00:00Z"),
      modelVersion: null,
      sampleSize: null,
      evaluationConfig: null,
      sourceUrl: null,
      notes: null,
      model: {
        id: "m-4",
        slug: "llama-3-3-70b",
        name: "Llama 3.3 70B",
        family: "Llama 3",
        isReasoning: false,
        isOpenWeight: true,
        status: "ACTIVE",
        labs: [
          {
            id: "ml-4",
            relationshipType: "CREATOR",
            aiLab: { id: "lab-3", slug: "meta", name: "Meta" },
          },
        ],
      },
      source: { id: "s-1", slug: "official", name: "Official Lab Report" },
    },
  ];

  const benchmarkResultsLatency = [
    {
      id: "br-lat-1",
      modelId: "m-1",
      benchmarkId: "b-2",
      sourceId: "s-1",
      providerEndpointId: null,
      metricValue: { toString: () => "450.0000" }, // 450 ms (slower)
      evaluationDate: new Date("2024-05-01T00:00:00Z"),
      observedAt: new Date("2024-05-01T00:00:00Z"),
      modelVersion: null,
      sampleSize: null,
      evaluationConfig: null,
      sourceUrl: null,
      notes: null,
      model: {
        id: "m-1",
        slug: "claude-3-5-sonnet",
        name: "Claude 3.5 Sonnet",
        family: "Claude 3.5",
        isReasoning: false,
        isOpenWeight: false,
        status: "ACTIVE",
        labs: [],
      },
      source: null,
    },
    {
      id: "br-lat-2",
      modelId: "m-4",
      benchmarkId: "b-2",
      sourceId: "s-1",
      providerEndpointId: null,
      metricValue: { toString: () => "120.0000" }, // 120 ms (faster! should be rank 1)
      evaluationDate: new Date("2024-05-02T00:00:00Z"),
      observedAt: new Date("2024-05-02T00:00:00Z"),
      modelVersion: null,
      sampleSize: null,
      evaluationConfig: null,
      sourceUrl: null,
      notes: null,
      model: {
        id: "m-4",
        slug: "llama-3-3-70b",
        name: "Llama 3.3 70B",
        family: "Llama 3",
        isReasoning: false,
        isOpenWeight: true,
        status: "ACTIVE",
        labs: [],
      },
      source: null,
    },
  ];

  return {
    benchmark: {
      findMany: async (args: any) => {
        let res = [...benchmarks];
        if (args?.where?.category) {
          res = res.filter((b) => b.category === args.where.category);
        }
        if (args?.where?.OR) {
          const query = args.where.OR[0].name.contains.toLowerCase();
          res = res.filter(
            (b) =>
              b.name.toLowerCase().includes(query) ||
              b.slug.toLowerCase().includes(query) ||
              (b.description && b.description.toLowerCase().includes(query))
          );
        }
        if (args?.select?.category) {
          return res.map((b) => ({ category: b.category }));
        }
        return res;
      },
      findFirst: async (args: any) => {
        return benchmarks.find((b) => b.slug === args.where.slug) || null;
      },
    },
    benchmarkResult: {
      findMany: async (args: any) => {
        if (args?.distinct) {
          return [{ modelId: "m-1" }, { modelId: "m-2" }, { modelId: "m-3" }, { modelId: "m-4" }];
        }
        if (args?.where?.benchmarkId === "b-1") {
          return benchmarkResultsMMLU;
        }
        if (args?.where?.benchmarkId === "b-2") {
          return benchmarkResultsLatency;
        }
        return [];
      },
    },
  } as any;
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("ONEATLAS TASK 6: RANKINGS & BENCHMARK LEADERBOARD COMPREHENSIVE TEST SUITE");
  console.log("================================================================================\n");

  // --------------------------------------------------------------------------
  // SECTION 1: SCHEMA VALIDATION TESTS
  // --------------------------------------------------------------------------
  console.log("1. Testing Validation Schemas (Zod)");

  // 1.1 Default directory query
  const defaultDir = RankingsDirectoryQuerySchema.parse({});
  assert(defaultDir.category === undefined, "Default directory category is undefined");
  assert(defaultDir.q === undefined, "Default directory query is undefined");

  // 1.2 Valid category
  const validCat = RankingsDirectoryQuerySchema.parse({ category: "REASONING" });
  assert(validCat.category === "REASONING", "Valid category REASONING parsed");

  // 1.3 Invalid category rejects
  let threwInvalidCat = false;
  try {
    RankingsDirectoryQuerySchema.parse({ category: "INVALID_CAT" });
  } catch (err) {
    threwInvalidCat = err instanceof ZodError;
  }
  assert(threwInvalidCat, "Invalid category enum throws ZodError");

  // 1.4 Leaderboard default pagination
  const defaultLeaderboard = RankingsLeaderboardQuerySchema.parse({});
  assert(defaultLeaderboard.page === 1, "Default leaderboard page is 1");
  assert(defaultLeaderboard.limit === 20, "Default leaderboard limit is 20");
  assert(defaultLeaderboard.sort === "rank_asc", "Default sort is rank_asc");

  // 1.5 Custom sort and pagination
  const customLeaderboard = RankingsLeaderboardQuerySchema.parse({
    page: "3",
    limit: "50",
    sort: "score_desc",
    lab: "openai",
  });
  assert(customLeaderboard.page === 3, "Coerced string page '3' to number 3");
  assert(customLeaderboard.limit === 50, "Coerced string limit '50' to number 50");
  assert(customLeaderboard.sort === "score_desc", "Accepted sort score_desc");
  assert(customLeaderboard.lab === "openai", "Accepted lab filter 'openai'");

  console.log("\n2. Testing Rankings Query Service Logic (Mock Database)");
  const mockPrisma = createMockPrisma();
  const service = new RankingsQueryService(mockPrisma);

  // --------------------------------------------------------------------------
  // SECTION 2: BENCHMARK DIRECTORY CATALOG
  // --------------------------------------------------------------------------
  const dirAll = await service.getBenchmarkDirectory();
  assert(dirAll.totalBenchmarks === 3, "Directory lists all 3 seeded benchmarks");
  assert(dirAll.totalEvaluatedModels === 4, "Global distinct evaluated models is 4");
  assert(dirAll.categories.length === 3, "Aggregated 3 distinct benchmark categories");

  const mmluBench = dirAll.benchmarks.find((b) => b.slug === "mmlu_pro");
  assert(mmluBench !== undefined, "Found MMLU-Pro in directory");
  assert(mmluBench?.evaluatedModelCount === 2, "MMLU-Pro evaluated distinct model count is 2");

  // Directory category filtering
  const dirCoding = await service.getBenchmarkDirectory({ category: "CODING" });
  assert(dirCoding.benchmarks.length === 1, "Category filter 'CODING' returns 1 benchmark");
  assert(dirCoding.benchmarks[0].slug === "livecodebench", "Category filter returns LiveCodeBench");

  // Directory search query
  const dirSearch = await service.getBenchmarkDirectory({ q: "multitask" });
  assert(dirSearch.benchmarks.length === 1, "Search 'multitask' returns MMLU-Pro");

  // --------------------------------------------------------------------------
  // SECTION 3: LEADERBOARD RANKING METHODOLOGY (higherIsBetter = true)
  // --------------------------------------------------------------------------
  console.log("\n3. Testing Leaderboard Rankings & Ties (Standard Competition Ranking '1224')");

  const mmluLeaderboard = await service.getLeaderboard("mmlu_pro");
  assert(mmluLeaderboard !== null, "Leaderboard for mmlu_pro exists");
  assert(mmluLeaderboard?.rankings.length === 4, "Leaderboard contains 4 deduplicated models");

  // Check Rank 1: o1 with 92.5
  const rank1 = mmluLeaderboard!.rankings[0];
  assert(rank1.rank === 1, "Rank 1 is correctly assigned");
  assert(rank1.model.slug === "o1", "Rank 1 model is o1");
  assert(rank1.score === "92.5000", "Exact decimal string '92.5000' preserved");
  assert(rank1.numScore === 92.5, "Numeric score is 92.5");
  assert(rank1.lab?.slug === "openai", "Rank 1 lab is openai");

  // Check Ties: Claude 3.5 Sonnet and GPT-4o both have 88.0
  const rank2A = mmluLeaderboard!.rankings[1];
  const rank2B = mmluLeaderboard!.rankings[2];
  assert(rank2A.rank === 2, "First tied model is Rank 2");
  assert(rank2B.rank === 2, "Second tied model is also Rank 2 (Tie Handling)");
  assert(rank2A.numScore === 88.0 && rank2B.numScore === 88.0, "Both Rank 2 models have identical 88.0 score");

  // Check Duplicate Evaluation Resolution for Claude 3.5 Sonnet
  // Earlier score was 70.5 on Jan 15, Newer score was 88.0 on June 1
  const claudeEntry = mmluLeaderboard!.rankings.find((r) => r.model.slug === "claude-3-5-sonnet");
  assert(claudeEntry !== undefined, "Claude 3.5 Sonnet is present in rankings");
  assert(claudeEntry?.score === "88.0000", "Claude 3.5 Sonnet selected newer score 88.0000 over older 70.5000");
  assert(claudeEntry?.modelVersion === "1.1", "Claude 3.5 Sonnet carries newer evaluation version 1.1");

  // Check 1224 Skipping: Fourth model must be Rank 4, NOT Rank 3!
  const rank4 = mmluLeaderboard!.rankings[3];
  assert(rank4.rank === 4, "Post-tie model receives Rank 4 (Standard Competition Ranking 1224)");
  assert(rank4.model.slug === "llama-3-3-70b", "Rank 4 model is Llama 3.3 70B");
  assert(rank4.score === "82.0000", "Rank 4 score is 82.0000");

  // --------------------------------------------------------------------------
  // SECTION 4: INVERTED DIRECTION RANKING (higherIsBetter = false)
  // --------------------------------------------------------------------------
  console.log("\n4. Testing Inverted Metric Rankings (higherIsBetter = false: Speed / Latency)");

  const latencyLeaderboard = await service.getLeaderboard("latency");
  assert(latencyLeaderboard !== null, "Latency leaderboard retrieved");
  assert(latencyLeaderboard!.rankings.length === 2, "Latency leaderboard has 2 entries");

  // In latency: 120 ms is BETTER than 450 ms, so 120 ms must be Rank 1!
  const latencyRank1 = latencyLeaderboard!.rankings[0];
  const latencyRank2 = latencyLeaderboard!.rankings[1];
  assert(latencyRank1.rank === 1, "Faster model is Rank 1");
  assert(latencyRank1.model.slug === "llama-3-3-70b", "Llama 3.3 (120ms) is Rank 1");
  assert(latencyRank1.score === "120.0000", "Rank 1 score is 120.0000");
  assert(latencyRank2.rank === 2, "Slower model is Rank 2");
  assert(latencyRank2.model.slug === "claude-3-5-sonnet", "Claude 3.5 (450ms) is Rank 2");

  // --------------------------------------------------------------------------
  // SECTION 5: FILTERING AND PAGINATION
  // --------------------------------------------------------------------------
  console.log("\n5. Testing Leaderboard Filtering & Pagination");

  // Lab filter
  const anthropicOnly = await service.getLeaderboard("mmlu_pro", { lab: "anthropic" });
  assert(anthropicOnly?.rankings.length === 1, "Lab filter 'anthropic' returns exactly 1 model");
  assert(anthropicOnly?.rankings[0].model.slug === "claude-3-5-sonnet", "Model is Claude 3.5 Sonnet");

  // Search filter
  const reasoningSearch = await service.getLeaderboard("mmlu_pro", { q: "o1" });
  assert(reasoningSearch?.rankings.length === 1, "Search 'o1' returns exactly 1 model");
  assert(reasoningSearch?.rankings[0].model.slug === "o1", "Found o1 model");

  // Pagination boundaries
  const page1 = await service.getLeaderboard("mmlu_pro", { page: 1, limit: 2 });
  assert(page1?.rankings.length === 2, "Page 1 limit 2 returns 2 items");
  assert(page1?.pagination.total === 4, "Total items is 4");
  assert(page1?.pagination.totalPages === 2, "Total pages is 2");
  assert(page1?.pagination.hasNextPage === true, "Page 1 has next page");
  assert(page1?.pagination.hasPreviousPage === false, "Page 1 has no previous page");

  const page2 = await service.getLeaderboard("mmlu_pro", { page: 2, limit: 2 });
  assert(page2?.rankings.length === 2, "Page 2 limit 2 returns 2 items");
  assert(page2?.pagination.hasNextPage === false, "Page 2 has no next page");
  assert(page2?.pagination.hasPreviousPage === true, "Page 2 has previous page");

  // Nonexistent benchmark slug returns null
  const notFound = await service.getLeaderboard("nonexistent_benchmark");
  assert(notFound === null, "Nonexistent benchmark slug returns null");

  // Empty benchmark results handling
  const livecodeEmpty = await service.getLeaderboard("livecodebench");
  assert(livecodeEmpty !== null, "LiveCodeBench leaderboard exists");
  assert(livecodeEmpty?.rankings.length === 0, "Zero benchmark results returns empty rankings array");
  assert(livecodeEmpty?.pagination.total === 0, "Total is 0");
  assert(livecodeEmpty?.pagination.totalPages === 1, "Total pages is 1 for empty results");

  console.log("\n================================================================================");
  console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("================================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Unhandled error in test suite:", err);
  process.exit(1);
});
