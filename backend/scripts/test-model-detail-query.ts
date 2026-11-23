import "./env";
import { prisma, Prisma } from "../src/database/index";
import { modelDetailQueryService } from "../src/services/model-detail-query.service";
import {
  ModelSlugParamSchema,
  PricingHistoryQuerySchema,
} from "../src/shared/schemas/api";
import { ZodError } from "zod";

/**
 * =========================================================================
 * AI DETAILS PHASE 4C — MODEL DETAIL, PROVIDER MATRIX & PRICING HISTORY TEST SUITE
 * =========================================================================
 */

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean | undefined | null, message: string): void {
  if (condition) {
    console.log(`   ✓ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`   ✗ [FAIL] ${message}`);
    failedCount++;
  }
}

const FIXTURE_PREFIX = `_test_4c_${Date.now()}`;

interface TestFixtureContext {
  labCreatorId: string;
  labPublisherId: string;
  providerAId: string;
  providerBId: string;
  sourceOpenRouterId: string;
  sourceModelsDevId: string;
  benchmarkId: string;
  modelFullId: string;
  modelFullSlug: string;
  modelMinimalId: string;
  modelMinimalSlug: string;
  modelConflictedId: string;
  modelConflictedSlug: string;
  createdModelIds: string[];
}

async function setupFixtures(): Promise<TestFixtureContext> {
  const createdModelIds: string[] = [];

  // 1. Create AI Labs
  const labCreator = await prisma.aiLab.create({
    data: {
      slug: `${FIXTURE_PREFIX}_creator_lab`,
      name: "Fixture Frontier Research",
      website: "https://frontier-research.ai",
      logoUrl: "https://frontier-research.ai/logo.png",
      country: "US",
    },
  });

  const labPublisher = await prisma.aiLab.create({
    data: {
      slug: `${FIXTURE_PREFIX}_publisher_lab`,
      name: "Fixture Publishing Group",
      website: "https://publishing-group.org",
      country: "FR",
    },
  });

  // 2. Create Providers
  const providerA = await prisma.provider.create({
    data: {
      slug: `${FIXTURE_PREFIX}_provider_a`,
      name: "Fixture FastCloud",
      providerType: "CLOUD",
      website: "https://fastcloud.fixture.io",
      isActive: true,
    },
  });

  const providerB = await prisma.provider.create({
    data: {
      slug: `${FIXTURE_PREFIX}_provider_b`,
      name: "Fixture DirectEngine",
      providerType: "DIRECT",
      isActive: true,
    },
  });

  // 3. Create External Sources
  const sourceOpenRouter = await prisma.externalSource.upsert({
    where: { slug: `${FIXTURE_PREFIX}_openrouter` },
    update: {},
    create: {
      slug: `${FIXTURE_PREFIX}_openrouter`,
      name: "OpenRouter Mock",
      isActive: true,
    },
  });

  const sourceModelsDev = await prisma.externalSource.upsert({
    where: { slug: `${FIXTURE_PREFIX}_modelsdev` },
    update: {},
    create: {
      slug: `${FIXTURE_PREFIX}_modelsdev`,
      name: "Models.dev Mock",
      isActive: true,
    },
  });

  // 4. Create Benchmark Definition
  const benchmark = await prisma.benchmark.create({
    data: {
      slug: `${FIXTURE_PREFIX}_eval_reasoning`,
      name: "Frontier Reasoning Metric",
      version: "1.0",
      category: "REASONING",
      metricName: "accuracy",
      metricUnit: "PERCENTAGE",
      higherIsBetter: true,
      description: "Standard benchmark for complex multi-step reasoning",
    },
  });

  // 5. Model A: Full Model with all relations, multiple labs, multiple endpoints, pricing history, benchmark, provenance
  const modelFullSlug = `${FIXTURE_PREFIX}_full_model`;
  const modelFull = await prisma.model.create({
    data: {
      slug: modelFullSlug,
      name: "Frontier Vision Omni",
      description: "High-parameter multi-modal reasoning foundation model",
      family: "frontier-omni",
      architectureType: "mixture-of-experts",
      releaseDate: new Date("2026-05-15T00:00:00Z"),
      knowledgeCutoff: "2025-12",
      license: "apache-2.0",
      isReasoning: true,
      isOpenWeight: true,
      inputModalities: ["text", "image", "audio"],
      outputModalities: ["text", "audio"],
      capabilities: { codeInterpreter: true, webSearch: true, jsonMode: true },
      contextWindow: 1048576,
      maxOutputTokens: 16384,
      status: "ACTIVE",
      labs: {
        create: [
          { aiLabId: labCreator.id, relationshipType: "CREATOR" },
          { aiLabId: labPublisher.id, relationshipType: "PUBLISHER" },
        ],
      },
      endpoints: {
        create: [
          {
            providerId: providerA.id,
            endpointKey: "fastcloud-omni-live",
            name: "FastCloud High-Throughput",
            status: "ONLINE",
            contextWindow: 1048576,
            maxOutputTokens: 16384,
            inputModalities: ["text", "image"],
            outputModalities: ["text"],
            capabilities: { streaming: true },
            isModerated: false,
            lastSeenAt: new Date("2026-11-21T18:00:00Z"),
            sourceMappings: {
              create: {
                sourceId: sourceOpenRouter.id,
                externalEndpointId: "ext-endpoint-a1",
                lastFetchedAt: new Date("2026-11-21T18:00:00Z"),
              },
            },
            pricingRecords: {
              create: [
                // Old observation
                {
                  sourceId: sourceOpenRouter.id,
                  inputPricePerMillion: new Prisma.Decimal("3.00000000"),
                  outputPricePerMillion: new Prisma.Decimal("12.00000000"),
                  currency: "USD",
                  pricingUnit: "1M_TOKENS",
                  observedAt: new Date("2026-11-01T10:00:00Z"),
                },
                // Recent observation
                {
                  sourceId: sourceOpenRouter.id,
                  inputPricePerMillion: new Prisma.Decimal("2.50000000"),
                  outputPricePerMillion: new Prisma.Decimal("10.00000000"),
                  cacheReadPricePerMillion: new Prisma.Decimal("0.50000000"),
                  cacheWritePricePerMillion: new Prisma.Decimal("1.25000000"),
                  currency: "USD",
                  pricingUnit: "1M_TOKENS",
                  observedAt: new Date("2026-11-20T12:00:00Z"),
                },
              ],
            },
          },
          {
            providerId: providerB.id,
            endpointKey: "direct-omni-offline",
            name: "Direct Engine Standby",
            status: "OFFLINE",
            contextWindow: 524288,
            maxOutputTokens: 8192,
            inputModalities: ["text"],
            outputModalities: ["text"],
            isModerated: true,
            lastSeenAt: null, // Test null lastSeenAt
            pricingRecords: {
              create: {
                sourceId: sourceModelsDev.id,
                inputPricePerMillion: new Prisma.Decimal("1.00000000"),
                outputPricePerMillion: new Prisma.Decimal("4.00000000"),
                currency: "USD",
                pricingUnit: "1M_TOKENS",
                observedAt: new Date("2026-11-15T00:00:00Z"),
              },
            },
          },
        ],
      },
      benchmarkResults: {
        create: {
          benchmarkId: benchmark.id,
          sourceId: sourceModelsDev.id,
          metricValue: new Prisma.Decimal("88.7500"),
          evaluationDate: new Date("2026-06-01T00:00:00Z"),
          modelVersion: "1.0-final",
          sampleSize: 1000,
          sourceUrl: "https://evals.fixture.org/results/88",
          notes: "Evaluated under standard zero-shot prompt template",
        },
      },
    },
  });
  createdModelIds.push(modelFull.id);

  // Provenance for Model Full
  await prisma.fieldProvenance.create({
    data: {
      entityType: "MODEL",
      entityId: modelFull.id,
      fieldKey: "contextWindow",
      sourceId: sourceModelsDev.id,
      sourceExternalId: "ext-md-omni",
      selectedValue: 1048576,
      confidence: 1.0,
      selectedAt: new Date("2026-11-20T12:00:00Z"),
    },
  });

  // 6. Model B: Minimal Model with null specifications, no labs, no endpoints, no benchmarks
  const modelMinimalSlug = `${FIXTURE_PREFIX}_minimal_model`;
  const modelMinimal = await prisma.model.create({
    data: {
      slug: modelMinimalSlug,
      name: "Minimal Sparse Model",
      description: null,
      family: null,
      architectureType: null,
      releaseDate: null,
      knowledgeCutoff: null,
      license: null,
      isReasoning: null,
      isOpenWeight: null,
      contextWindow: null,
      maxOutputTokens: null,
      inputModalities: ["text"],
      outputModalities: ["text"],
      capabilities: Prisma.JsonNull,
      status: "ACTIVE",
    },
  });
  createdModelIds.push(modelMinimal.id);

  // 7. Model C: Conflicted Model with active DataConflict
  const modelConflictedSlug = `${FIXTURE_PREFIX}_conflicted_model`;
  const modelConflicted = await prisma.model.create({
    data: {
      slug: modelConflictedSlug,
      name: "Conflicted Disputed Model",
      status: "ACTIVE",
    },
  });
  createdModelIds.push(modelConflicted.id);

  await prisma.dataConflict.create({
    data: {
      entityType: "MODEL",
      entityId: modelConflicted.id,
      fieldKey: "isOpenWeight",
      severity: "CRITICAL",
      status: "OPEN",
      sourceAId: sourceOpenRouter.id,
      sourceBId: sourceModelsDev.id,
      observedValueA: false,
      observedValueB: true,
      detectedAt: new Date("2026-11-21T10:00:00Z"),
    },
  });

  return {
    labCreatorId: labCreator.id,
    labPublisherId: labPublisher.id,
    providerAId: providerA.id,
    providerBId: providerB.id,
    sourceOpenRouterId: sourceOpenRouter.id,
    sourceModelsDevId: sourceModelsDev.id,
    benchmarkId: benchmark.id,
    modelFullId: modelFull.id,
    modelFullSlug,
    modelMinimalId: modelMinimal.id,
    modelMinimalSlug,
    modelConflictedId: modelConflicted.id,
    modelConflictedSlug,
    createdModelIds,
  };
}

async function cleanupFixtures(ctx: TestFixtureContext): Promise<void> {
  // 1. Delete created models (cascades to model_labs, endpoints, pricing, benchmarks)
  if (ctx.createdModelIds.length > 0) {
    await prisma.fieldProvenance.deleteMany({
      where: { entityType: "MODEL", entityId: { in: ctx.createdModelIds } },
    });
    await prisma.dataConflict.deleteMany({
      where: { entityType: "MODEL", entityId: { in: ctx.createdModelIds } },
    });
    await prisma.model.deleteMany({
      where: { id: { in: ctx.createdModelIds } },
    });
  }

  // 2. Delete benchmarks
  await prisma.benchmark.deleteMany({
    where: { id: ctx.benchmarkId },
  });

  // 3. Delete providers
  await prisma.provider.deleteMany({
    where: { id: { in: [ctx.providerAId, ctx.providerBId] } },
  });

  // 4. Delete labs
  await prisma.aiLab.deleteMany({
    where: { id: { in: [ctx.labCreatorId, ctx.labPublisherId] } },
  });

  // 5. Delete sources
  await prisma.externalSource.deleteMany({
    where: { id: { in: [ctx.sourceOpenRouterId, ctx.sourceModelsDevId] } },
  });
}

async function runTests(): Promise<void> {
  console.log("🧪 =========================================================");
  console.log("   AI DETAILS MODEL DETAIL & PRICING HISTORY TEST SUITE (4C)");
  console.log("=========================================================\n");

  let fixtures: TestFixtureContext | null = null;

  try {
    console.log("Setting up isolated test fixtures in PostgreSQL...");
    fixtures = await setupFixtures();
    console.log("✓ Fixtures successfully provisioned.\n");

    // -------------------------------------------------------------
    // 1. Model Lookup
    // -------------------------------------------------------------
    console.log("1. Testing Model Lookup...");

    // Existing model lookup
    const fullModel = await modelDetailQueryService.getModelDetails(fixtures.modelFullSlug);
    assert(fullModel !== null, "Existing model slug resolves successfully");
    assert(fullModel?.slug === fixtures.modelFullSlug, "Returned model has identical slug");

    // Non-existent slug returns null (triggers 404 in route)
    const nonExistent = await modelDetailQueryService.getModelDetails("non-existent-random-slug-9999");
    assert(nonExistent === null, "Non-existent slug returns null (triggers 404)");

    // Malformed slug rejected by validator
    const malformed = await modelDetailQueryService.getModelDetails("Invalid Slug With Spaces!");
    assert(malformed === null, "Malformed slug with spaces returns null");

    // Slug schema validation check
    let slugParamError = false;
    try {
      ModelSlugParamSchema.parse({ slug: "invalid/slug/with/slashes" });
    } catch (e) {
      slugParamError = e instanceof ZodError;
    }
    assert(slugParamError, "Slug with illegal slashes rejected by ModelSlugParamSchema");

    // -------------------------------------------------------------
    // 2. Canonical Specifications
    // -------------------------------------------------------------
    console.log("\n2. Testing Canonical Specifications & Null Preservation...");

    assert(fullModel?.name === "Frontier Vision Omni", "Model name returned correctly");
    assert(fullModel?.family === "frontier-omni", "Model family returned correctly");
    assert(fullModel?.architectureType === "mixture-of-experts", "Architecture type returned");
    assert(fullModel?.license === "apache-2.0", "License returned");
    assert(fullModel?.isReasoning === true, "isReasoning=true preserved");
    assert(fullModel?.isOpenWeight === true, "isOpenWeight=true preserved");
    assert(fullModel?.contextWindow === 1048576, "Context window returned");
    assert(fullModel?.maxOutputTokens === 16384, "Max output tokens returned");
    assert(
      fullModel?.inputModalities.includes("text") &&
        fullModel?.inputModalities.includes("image") &&
        fullModel?.inputModalities.includes("audio"),
      "Input modalities array preserved"
    );
    assert(fullModel?.knowledgeCutoff === "2025-12", "Knowledge cutoff semantic representation preserved");
    assert(typeof fullModel?.lastUpdated === "string", "lastUpdated is valid ISO string");

    // Test minimal model with null specifications
    const minimalModel = await modelDetailQueryService.getModelDetails(fixtures.modelMinimalSlug);
    assert(minimalModel !== null, "Minimal model resolved successfully");
    assert(minimalModel?.description === null, "Missing description is preserved as null");
    assert(minimalModel?.family === null, "Missing family is preserved as null");
    assert(minimalModel?.architectureType === null, "Missing architectureType is preserved as null");
    assert(minimalModel?.releaseDate === null, "Missing releaseDate is preserved as null");
    assert(minimalModel?.knowledgeCutoff === null, "Missing knowledgeCutoff is preserved as null");
    assert(minimalModel?.license === null, "Missing license is preserved as null");
    assert(minimalModel?.isReasoning === null, "Missing isReasoning is null (not coerced to false)");
    assert(minimalModel?.isOpenWeight === null, "Missing isOpenWeight is null (not coerced to false)");
    assert(minimalModel?.contextWindow === null, "Missing contextWindow is null");
    assert(minimalModel?.capabilities === null, "Null capabilities preserved as null");

    // -------------------------------------------------------------
    // 3. AI Labs Relationships
    // -------------------------------------------------------------
    console.log("\n3. Testing AI Lab Associations & Roles...");

    assert(Array.isArray(fullModel?.labs), "labs is an array");
    assert(fullModel?.labs.length === 2, "Model has 2 verified AI lab associations");

    const creatorLab = fullModel?.labs.find((l) => l.relationshipType === "CREATOR");
    assert(creatorLab !== undefined, "CREATOR relationship type exists");
    assert(creatorLab?.name === "Fixture Frontier Research", "Creator lab name correct");
    assert(creatorLab?.logoUrl === "https://frontier-research.ai/logo.png", "Creator logoUrl returned");

    const publisherLab = fullModel?.labs.find((l) => l.relationshipType === "PUBLISHER");
    assert(publisherLab !== undefined, "PUBLISHER relationship type exists");
    assert(publisherLab?.relationshipType === "PUBLISHER", "Distinguishes publisher from creator");

    // Model without labs returns empty array
    assert(Array.isArray(minimalModel?.labs), "Minimal model labs is an array");
    assert(minimalModel?.labs.length === 0, "Model without labs returns empty array (not null)");

    // -------------------------------------------------------------
    // 4. Provider Endpoint Matrix
    // -------------------------------------------------------------
    console.log("\n4. Testing Provider Endpoint Matrix...");

    assert(Array.isArray(fullModel?.endpoints), "endpoints is an array");
    assert(fullModel?.endpoints.length === 2, "All 2 endpoints returned in endpoint matrix");

    const onlineEp = fullModel?.endpoints.find((e) => e.status === "ONLINE");
    assert(onlineEp !== undefined, "ONLINE endpoint exists");
    assert(onlineEp?.endpointKey === "fastcloud-omni-live", "endpointKey returned");
    assert(onlineEp?.provider.providerType === "CLOUD", "Provider type returned");
    assert(onlineEp?.lastSeenAt !== null, "lastSeenAt returned for active endpoint");
    assert(onlineEp?.sourceMappings.length === 1, "Source mapping safely exposed");
    assert(
      onlineEp?.sourceMappings[0].source === `${FIXTURE_PREFIX}_openrouter`,
      "Source mapping contains source slug"
    );

    const offlineEp = fullModel?.endpoints.find((e) => e.status === "OFFLINE");
    assert(offlineEp !== undefined, "OFFLINE endpoint exists");
    assert(offlineEp?.lastSeenAt === null, "Unknown lastSeenAt preserved as null");
    assert(offlineEp?.isModerated === true, "Endpoint moderation flag preserved");

    // -------------------------------------------------------------
    // 5. Provider-Specific Pricing Offers
    // -------------------------------------------------------------
    console.log("\n5. Testing Provider-Specific Pricing Offers & Decimals...");

    assert(onlineEp?.pricing.length === 1, "Latest pricing offer returned for endpoint");
    const latestPrice = onlineEp?.pricing[0];
    assert(latestPrice?.inputPricePerMillion === "2.5", "Input price formatted as precise string");
    assert(latestPrice?.outputPricePerMillion === "10", "Output price formatted as precise string");
    assert(latestPrice?.cacheReadPricePerMillion === "0.5", "Cache read price formatted as string");
    assert(latestPrice?.cacheWritePricePerMillion === "1.25", "Cache write price formatted as string");
    assert(latestPrice?.currency === "USD", "Currency returned");
    assert(latestPrice?.pricingUnit === "1M_TOKENS", "Pricing unit returned");

    // Pricing summary on model
    assert(fullModel?.pricingSummary.availableProviderCount === 1, "Only ONLINE providers counted in summary");
    assert(
      fullModel?.pricingSummary.lowestInput?.amount === "2.5",
      "Summary lowest input identified from ONLINE endpoint"
    );
    assert(
      fullModel?.pricingSummary.lowestOutput?.amount === "10",
      "Summary lowest output identified from ONLINE endpoint"
    );

    // Model without pricing
    assert(minimalModel?.pricingSummary.availableProviderCount === 0, "No providers for minimal model");
    assert(minimalModel?.pricingSummary.lowestInput === null, "lowestInput is null when no pricing");
    assert(minimalModel?.pricingSummary.lowestOutput === null, "lowestOutput is null when no pricing");

    // -------------------------------------------------------------
    // 6. Pricing History Stream Endpoint
    // -------------------------------------------------------------
    console.log("\n6. Testing Pricing History Stream Endpoint...");

    // Fetch all pricing history for model
    const historyAll = await modelDetailQueryService.getModelPricingHistory(
      fixtures.modelFullSlug,
      { page: 1, limit: 10 }
    );
    assert(historyAll !== null, "Pricing history returned for model");
    assert(historyAll?.records.length === 3, "All 3 historical records returned across endpoints");
    assert(historyAll?.pagination.total === 3, "total is 3");

    // Provider filter
    const historyProviderA = await modelDetailQueryService.getModelPricingHistory(
      fixtures.modelFullSlug,
      { provider: `${FIXTURE_PREFIX}_provider_a` }
    );
    assert(historyProviderA?.records.length === 2, "Provider filter returns only Provider A records");
    assert(
      historyProviderA?.records.every((r) => r.provider.slug === `${FIXTURE_PREFIX}_provider_a`),
      "All returned records belong to Provider A"
    );

    // Source filter
    const historySourceModelsDev = await modelDetailQueryService.getModelPricingHistory(
      fixtures.modelFullSlug,
      { source: `${FIXTURE_PREFIX}_modelsdev` }
    );
    assert(historySourceModelsDev?.records.length === 1, "Source filter returns only Models.dev records");

    // Date range filter
    const historyDateRange = await modelDetailQueryService.getModelPricingHistory(
      fixtures.modelFullSlug,
      {
        from: "2026-11-01T00:00:00Z",
        to: "2026-11-10T00:00:00Z",
      }
    );
    assert(historyDateRange?.records.length === 1, "Date range filter matches record within interval");
    assert(
      historyDateRange?.records[0].observedAt.startsWith("2026-11-01"),
      "Matched record has expected observation date"
    );

    // Invalid date range (from > to) rejected by Zod
    let dateRangeError = false;
    try {
      PricingHistoryQuerySchema.parse({
        from: "2026-12-01T00:00:00Z",
        to: "2026-11-01T00:00:00Z",
      });
    } catch (e) {
      dateRangeError = e instanceof ZodError;
    }
    assert(dateRangeError, "Invalid date range (from > to) rejected by Zod refinement");

    // Pagination bounds
    const historyPage2 = await modelDetailQueryService.getModelPricingHistory(
      fixtures.modelFullSlug,
      { page: 2, limit: 2 }
    );
    assert(historyPage2?.records.length === 1, "Page 2 with limit 2 returns 1 record");
    assert(historyPage2?.pagination.page === 2, "Pagination page is 2");
    assert(historyPage2?.pagination.totalPages === 2, "Pagination totalPages is 2");

    // Non-existent model pricing history returns null
    const historyNonExistent = await modelDetailQueryService.getModelPricingHistory(
      "non-existent-slug",
      {}
    );
    assert(historyNonExistent === null, "Pricing history for non-existent model returns null");

    // -------------------------------------------------------------
    // 7. Benchmark Results
    // -------------------------------------------------------------
    console.log("\n7. Testing Benchmark Scorecards...");

    assert(Array.isArray(fullModel?.benchmarks), "benchmarks is an array");
    assert(fullModel?.benchmarks.length === 1, "Model has 1 verified benchmark result");

    const benchmarkResult = fullModel?.benchmarks[0];
    assert(benchmarkResult?.benchmark.slug === `${FIXTURE_PREFIX}_eval_reasoning`, "Benchmark slug matches");
    assert(benchmarkResult?.benchmark.category === "REASONING", "Benchmark category correct");
    assert(benchmarkResult?.benchmark.metricName === "accuracy", "Metric name is accuracy");
    assert(benchmarkResult?.benchmark.metricUnit === "PERCENTAGE", "Metric unit is PERCENTAGE");
    assert(benchmarkResult?.result.value === "88.75", "Metric value formatted as exact string");
    assert(benchmarkResult?.result.modelVersion === "1.0-final", "Model version recorded");
    assert(benchmarkResult?.source.slug === `${FIXTURE_PREFIX}_modelsdev`, "Attributed source returned");

    // Model without benchmarks returns empty array
    assert(Array.isArray(minimalModel?.benchmarks), "Minimal model benchmarks is array");
    assert(minimalModel?.benchmarks.length === 0, "Model without benchmarks returns empty array (never fake scores)");

    // -------------------------------------------------------------
    // 8. Field-Level Provenance & Data Quality
    // -------------------------------------------------------------
    console.log("\n8. Testing Field Provenance & Data Quality Assessment...");

    assert(typeof fullModel?.provenance === "object", "provenance is an object");
    assert(fullModel?.provenance.contextWindow !== undefined, "contextWindow has recorded provenance");
    assert(
      fullModel?.provenance.contextWindow.sourceSlug === `${FIXTURE_PREFIX}_modelsdev`,
      "Provenance source slug correct"
    );
    assert(fullModel?.provenance.contextWindow.confidence === 1.0, "Confidence score preserved");

    // Data quality on model with provenance and no conflicts
    assert(fullModel?.dataQuality.status === "VERIFIED", "Status is VERIFIED when provenance exists & 0 conflicts");
    assert(fullModel?.dataQuality.hasConflicts === false, "hasConflicts is false");
    assert(fullModel?.dataQuality.warnings.length === 0, "0 warnings when no conflicts");

    // Data quality on model with CRITICAL conflict
    const conflictedModel = await modelDetailQueryService.getModelDetails(fixtures.modelConflictedSlug);
    assert(conflictedModel?.dataQuality.status === "CONFLICTED", "Status is CONFLICTED when CRITICAL conflict exists");
    assert(conflictedModel?.dataQuality.hasConflicts === true, "hasConflicts is true");
    assert(conflictedModel?.dataQuality.conflictCount === 1, "conflictCount is 1");
    assert(
      conflictedModel?.dataQuality.warnings.some((w) => w.includes("isOpenWeight")),
      "Safe warning includes conflicted field name without leaking raw records"
    );

    // Data quality on model without provenance or conflicts
    assert(minimalModel?.dataQuality.status === "UNKNOWN", "Status is UNKNOWN when no provenance exists");

    // -------------------------------------------------------------
    // 9. PostgreSQL EXPLAIN ANALYZE Performance Check
    // -------------------------------------------------------------
    console.log("\n9. Testing PostgreSQL EXPLAIN (ANALYZE, BUFFERS)...");

    const explainModelDetail = await prisma.$queryRawUnsafe<Array<{ "QUERY PLAN": string }>>(
      `EXPLAIN (ANALYZE, BUFFERS)
       SELECT "id", "slug", "name", "family", "status"
       FROM "models"
       WHERE "slug" = '${fixtures.modelFullSlug}'
       LIMIT 1;`
    );

    assert(
      explainModelDetail.length > 0 && typeof explainModelDetail[0]["QUERY PLAN"] === "string",
      "EXPLAIN (ANALYZE, BUFFERS) successfully retrieved query plan for Model lookup"
    );

    const planText = explainModelDetail.map((r) => r["QUERY PLAN"]).join("\n");
    console.log("   --- EXPLAIN Output ---");
    console.log(
      planText
        .split("\n")
        .slice(0, 5)
        .map((l) => `   ${l}`)
        .join("\n")
    );

    const explainPricingHistory = await prisma.$queryRawUnsafe<Array<{ "QUERY PLAN": string }>>(
      `EXPLAIN (ANALYZE, BUFFERS)
       SELECT pr."id", pr."inputPricePerMillion", pr."observedAt"
       FROM "pricing_records" pr
       JOIN "model_provider_endpoints" mpe ON pr."modelProviderEndpointId" = mpe."id"
       WHERE mpe."modelId" = '${fixtures.modelFullId}'
       ORDER BY pr."observedAt" DESC
       LIMIT 20;`
    );

    assert(
      explainPricingHistory.length > 0,
      "EXPLAIN (ANALYZE, BUFFERS) successfully retrieved query plan for Pricing History"
    );
  } finally {
    if (fixtures) {
      console.log("\nCleaning up test fixtures from PostgreSQL...");
      await cleanupFixtures(fixtures);
      console.log("✓ Fixtures successfully cleaned up.");
    }
  }

  console.log("\n=========================================================");
  console.log(`📊 PHASE 4C TESTS: ${passedCount} Passed, ${failedCount} Failed.`);
  console.log("=========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
