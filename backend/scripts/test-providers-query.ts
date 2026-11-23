import "./env";
import { prisma } from "../src/database/index";
import { providerDirectoryQueryService } from "../src/services/provider-directory-query.service";
import {
  ProvidersQuerySchema,
  ProviderEndpointsQuerySchema,
  ProviderSlugParamSchema,
} from "../src/shared/schemas/api";
import { ZodError } from "zod";

/**
 * =========================================================================
 * AI DETAILS PHASE 4D.1 — PROVIDER DIRECTORY & ENDPOINT MATRIX TEST SUITE
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

const FIXTURE_PREFIX = `_test_4d_p_${Date.now()}`;

interface ProviderTestContext {
  providerEmptyId: string;
  providerEmptySlug: string;
  providerMultiId: string;
  providerMultiSlug: string;
  providerAggregatorId: string;
  providerAggregatorSlug: string;
  modelAId: string;
  modelBId: string;
  modelCId: string;
  createdProviderIds: string[];
  createdModelIds: string[];
}

async function setupFixtures(): Promise<ProviderTestContext> {
  const createdProviderIds: string[] = [];
  const createdModelIds: string[] = [];

  // 1. Provider with 0 endpoints
  const pEmptySlug = `${FIXTURE_PREFIX}_empty`;
  const pEmpty = await prisma.provider.create({
    data: {
      slug: pEmptySlug,
      name: "Empty Infrastructure Labs",
      description: "Provider without active endpoints",
      website: "https://empty-infra.fixture.io",
      providerType: "CLOUD",
      isActive: true,
    },
  });
  createdProviderIds.push(pEmpty.id);

  // 2. Provider with multiple endpoints and distinct models
  // Model A, Model B, and Model C
  const modelA = await prisma.model.create({
    data: {
      slug: `${FIXTURE_PREFIX}_model_a`,
      name: "Fixture Multi Model Alpha",
      family: "alpha-fam",
      status: "ACTIVE",
    },
  });
  createdModelIds.push(modelA.id);

  const modelB = await prisma.model.create({
    data: {
      slug: `${FIXTURE_PREFIX}_model_b`,
      name: "Fixture Multi Model Beta",
      family: "beta-fam",
      status: "ACTIVE",
    },
  });
  createdModelIds.push(modelB.id);

  const modelC = await prisma.model.create({
    data: {
      slug: `${FIXTURE_PREFIX}_model_c`,
      name: "Fixture Multi Model Gamma",
      family: "gamma-fam",
      status: "ACTIVE",
    },
  });
  createdModelIds.push(modelC.id);

  const pMultiSlug = `${FIXTURE_PREFIX}_multi`;
  const pMulti = await prisma.provider.create({
    data: {
      slug: pMultiSlug,
      name: "FastScale Compute Direct",
      description: "Direct enterprise model host",
      website: "https://fastscale.fixture.io",
      providerType: "DIRECT",
      isActive: true,
      endpoints: {
        create: [
          // Endpoint 1: Model A, ONLINE, text + image
          {
            modelId: modelA.id,
            endpointKey: "fastscale-alpha-online-1",
            name: "Alpha Standard Node",
            status: "ONLINE",
            contextWindow: 128000,
            maxOutputTokens: 4096,
            inputModalities: ["text", "image"],
            outputModalities: ["text"],
            capabilities: { streaming: true },
            lastSeenAt: new Date("2026-11-21T18:00:00Z"),
          },
          // Endpoint 2: Model A, ONLINE, text + audio (second endpoint for same model!)
          {
            modelId: modelA.id,
            endpointKey: "fastscale-alpha-online-2",
            name: "Alpha High-Throughput Node",
            status: "ONLINE",
            contextWindow: 128000,
            maxOutputTokens: 4096,
            inputModalities: ["text", "audio"],
            outputModalities: ["text", "audio"],
            lastSeenAt: new Date("2026-11-21T19:00:00Z"),
          },
          // Endpoint 3: Model B, OFFLINE (offline endpoint must not inflate online model count)
          {
            modelId: modelB.id,
            endpointKey: "fastscale-beta-offline",
            name: "Beta Maintenance Node",
            status: "OFFLINE",
            contextWindow: 64000,
            inputModalities: ["text"],
            outputModalities: ["text"],
            lastSeenAt: null,
          },
          // Endpoint 4: Model C, UNKNOWN status
          {
            modelId: modelC.id,
            endpointKey: "fastscale-gamma-unknown",
            name: "Gamma Experimental Node",
            status: "UNKNOWN",
            contextWindow: 32000,
            inputModalities: ["text"],
            outputModalities: ["text"],
            lastSeenAt: new Date("2026-11-21T17:00:00Z"),
          },
        ],
      },
    },
  });
  createdProviderIds.push(pMulti.id);

  // 3. Provider with AGGREGATOR type
  const pAggregatorSlug = `${FIXTURE_PREFIX}_aggregator`;
  const pAggregator = await prisma.provider.create({
    data: {
      slug: pAggregatorSlug,
      name: "Global Router Hub",
      description: "Model gateway aggregator",
      website: "https://global-router.fixture.io",
      providerType: "AGGREGATOR",
      isActive: true,
    },
  });
  createdProviderIds.push(pAggregator.id);

  return {
    providerEmptyId: pEmpty.id,
    providerEmptySlug: pEmptySlug,
    providerMultiId: pMulti.id,
    providerMultiSlug: pMultiSlug,
    providerAggregatorId: pAggregator.id,
    providerAggregatorSlug: pAggregatorSlug,
    modelAId: modelA.id,
    modelBId: modelB.id,
    modelCId: modelC.id,
    createdProviderIds,
    createdModelIds,
  };
}

async function cleanupFixtures(ctx: ProviderTestContext): Promise<void> {
  // 1. Delete models (cascades to endpoints)
  if (ctx.createdModelIds.length > 0) {
    await prisma.model.deleteMany({
      where: { id: { in: ctx.createdModelIds } },
    });
  }

  // 2. Delete providers
  if (ctx.createdProviderIds.length > 0) {
    await prisma.provider.deleteMany({
      where: { id: { in: ctx.createdProviderIds } },
    });
  }
}

async function runTests(): Promise<void> {
  console.log("🧪 =========================================================");
  console.log("   AI DETAILS PROVIDER DIRECTORY & MATRIX TEST SUITE (4D.1)");
  console.log("=========================================================\n");

  // Record baseline counts before provisioning
  const baselineModelCount = await prisma.model.count();
  const baselineProviderCount = await prisma.provider.count();
  const baselineEndpointCount = await prisma.modelProviderEndpoint.count();

  let fixtures: ProviderTestContext | null = null;

  try {
    console.log("Setting up isolated test fixtures in PostgreSQL...");
    fixtures = await setupFixtures();
    console.log("✓ Fixtures successfully provisioned.\n");

    // -------------------------------------------------------------
    // 1. Provider Resolution & Slug Lookup
    // -------------------------------------------------------------
    console.log("1. Testing Provider Resolution & Slug Lookup...");

    const pMulti = await providerDirectoryQueryService.getProviderBySlug(fixtures.providerMultiSlug);
    assert(pMulti !== null, "Existing provider resolves successfully");
    assert(pMulti?.provider.slug === fixtures.providerMultiSlug, "Provider has identical slug");

    const nonExistent = await providerDirectoryQueryService.getProviderBySlug("non-existent-provider-slug-9999");
    assert(nonExistent === null, "Unknown provider slug returns null");

    const malformed = await providerDirectoryQueryService.getProviderBySlug("Invalid Slug With Spaces!");
    assert(malformed === null, "Malformed slug returns null");

    let slugValidationError = false;
    try {
      ProviderSlugParamSchema.parse({ slug: "invalid/slug/with/slashes" });
    } catch (e) {
      slugValidationError = e instanceof ZodError;
    }
    assert(slugValidationError, "Slug with illegal slashes rejected by Zod schema");

    // -------------------------------------------------------------
    // 2. Provider with Zero Endpoints
    // -------------------------------------------------------------
    console.log("\n2. Testing Provider with Zero Endpoints...");

    const pEmpty = await providerDirectoryQueryService.getProviderBySlug(fixtures.providerEmptySlug);
    assert(pEmpty !== null, "Provider with zero endpoints resolved");
    assert(pEmpty?.provider.endpointCount === 0, "endpointCount is exactly 0");
    assert(pEmpty?.provider.onlineEndpointCount === 0, "onlineEndpointCount is exactly 0");
    assert(pEmpty?.provider.offlineEndpointCount === 0, "offlineEndpointCount is exactly 0");
    assert(pEmpty?.provider.unknownEndpointCount === 0, "unknownEndpointCount is exactly 0");
    assert(pEmpty?.provider.modelCount === 0, "modelCount is exactly 0");
    assert(pEmpty?.provider.onlineModelCount === 0, "onlineModelCount is exactly 0");
    assert(pEmpty?.provider.supportedInputModalities.length === 0, "supportedInputModalities is empty array");
    assert(pEmpty?.provider.supportedOutputModalities.length === 0, "supportedOutputModalities is empty array");
    assert(pEmpty?.provider.lastSeenAt === null, "lastSeenAt is null for empty provider");
    assert(pEmpty?.endpoints.length === 0, "Endpoints array is empty");
    assert(pEmpty?.pagination.total === 0, "Endpoints pagination total is 0");

    // Zero-endpoint provider remains visible in directory collection
    const dirWithZero = await providerDirectoryQueryService.listProviders({ q: fixtures.providerEmptySlug });
    assert(dirWithZero.providers.length === 1 && dirWithZero.providers[0].slug === fixtures.providerEmptySlug, "Zero-endpoint provider remains visible in directory");
    assert(dirWithZero.providers[0].endpointCount === 0, "Directory item endpointCount is 0");
    assert(dirWithZero.providers[0].modelCount === 0, "Directory item modelCount is 0");

    // -------------------------------------------------------------
    // 3. Endpoint Counts & Distinct Model Counting (SQL Aggregation)
    // -------------------------------------------------------------
    console.log("\n3. Testing Endpoint Counts & Distinct Model Counting...");

    // FastScale has 4 total endpoints:
    // - Endpoint 1: Model A, ONLINE
    // - Endpoint 2: Model A, ONLINE
    // - Endpoint 3: Model B, OFFLINE
    // - Endpoint 4: Model C, UNKNOWN
    assert(pMulti?.provider.endpointCount === 4, "endpointCount is 4 across all endpoints");
    assert(pMulti?.provider.onlineEndpointCount === 2, "onlineEndpointCount is 2");
    assert(pMulti?.provider.offlineEndpointCount === 1, "offlineEndpointCount is 1");
    assert(pMulti?.provider.unknownEndpointCount === 1, "unknownEndpointCount is 1 (status=UNKNOWN counted)");

    // Distinct model counting: Model A has 2 endpoints, but counts as ONE model!
    // Total models = Model A + Model B + Model C = 3
    assert(pMulti?.provider.modelCount === 3, "Multiple endpoints for same model count as 1 distinct model (Model A + Model B + Model C = 3)");
    assert(pMulti?.provider.endpointCount !== pMulti?.provider.modelCount, "Endpoint count (4) and model count (3) are strictly decoupled and not conflated");

    // Online model count: Only Model A has online endpoints! Model B is OFFLINE, Model C is UNKNOWN!
    assert(pMulti?.provider.onlineModelCount === 1, "onlineModelCount is 1 (Model A only; offline & unknown models not counted)");

    // -------------------------------------------------------------
    // 4. Modality Extraction & Timestamp Propagation
    // -------------------------------------------------------------
    console.log("\n4. Testing Modality Derivation & Liveness Timestamps...");

    const inputMods = pMulti?.provider.supportedInputModalities ?? [];
    assert(inputMods.includes("text") && inputMods.includes("image") && inputMods.includes("audio"), "Input modalities derived from endpoint configs");

    const outputMods = pMulti?.provider.supportedOutputModalities ?? [];
    assert(outputMods.includes("text") && outputMods.includes("audio") && !outputMods.includes("image"), "Output modalities derived strictly from endpoint configs");

    assert(pMulti?.provider.lastSeenAt === "2026-11-21T19:00:00.000Z", "lastSeenAt propagates latest endpoint observation timestamp");

    // -------------------------------------------------------------
    // 5. Provider Type Preservation & Aggregator Distinction
    // -------------------------------------------------------------
    console.log("\n5. Testing Provider Type Preservation...");

    assert(pMulti?.provider.providerType === "DIRECT", "DIRECT provider type preserved");
    const pAgg = await providerDirectoryQueryService.getProviderBySlug(fixtures.providerAggregatorSlug);
    assert(pAgg?.provider.providerType === "AGGREGATOR", "AGGREGATOR provider type preserved (not conflated with direct)");

    // -------------------------------------------------------------
    // 6. Directory Collection Queries, Search, Filters & Sorting
    // -------------------------------------------------------------
    console.log("\n6. Testing Directory Search, Filtering, Sorting & Pagination...");

    // Free text search by name
    const searchByName = await providerDirectoryQueryService.listProviders({ q: "FastScale" });
    assert(searchByName.providers.some((p) => p.slug === fixtures?.providerMultiSlug), "Search by provider name matches");

    // Free text search by slug
    const searchBySlug = await providerDirectoryQueryService.listProviders({ q: fixtures.providerEmptySlug });
    assert(searchBySlug.providers.length === 1 && searchBySlug.providers[0].slug === fixtures.providerEmptySlug, "Search by slug matches");

    // ProviderType filter
    const filterCloud = await providerDirectoryQueryService.listProviders({ providerType: "CLOUD", q: FIXTURE_PREFIX });
    assert(filterCloud.providers.every((p) => p.providerType === "CLOUD"), "providerType filter returns only CLOUD providers");

    // hasEndpoints filter
    const filterHasEndpoints = await providerDirectoryQueryService.listProviders({ hasEndpoints: true, q: FIXTURE_PREFIX });
    assert(filterHasEndpoints.providers.length === 1 && filterHasEndpoints.providers[0].slug === fixtures.providerMultiSlug, "hasEndpoints=true returns only providers with endpoints");

    const filterNoEndpoints = await providerDirectoryQueryService.listProviders({ hasEndpoints: false, q: FIXTURE_PREFIX });
    assert(filterNoEndpoints.providers.every((p) => p.endpointCount === 0), "hasEndpoints=false returns only providers with 0 endpoints");

    // hasOnlineEndpoints filter
    const filterHasOnline = await providerDirectoryQueryService.listProviders({ hasOnlineEndpoints: true, q: FIXTURE_PREFIX });
    assert(filterHasOnline.providers.some((p) => p.slug === fixtures?.providerMultiSlug), "hasOnlineEndpoints=true includes provider with online endpoints");

    // Sorting by endpoints_desc in PostgreSQL before pagination
    const sortEndpoints = await providerDirectoryQueryService.listProviders({ sort: "endpoints_desc", q: FIXTURE_PREFIX });
    assert(sortEndpoints.providers[0].slug === fixtures.providerMultiSlug, "endpoints_desc puts provider with most endpoints first");

    // Sorting by models_desc in PostgreSQL before pagination
    const sortModels = await providerDirectoryQueryService.listProviders({ sort: "models_desc", q: FIXTURE_PREFIX });
    assert(sortModels.providers[0].slug === fixtures.providerMultiSlug, "models_desc puts provider with most distinct models first");

    // -------------------------------------------------------------
    // 7. Nested Endpoints Pagination & Modality Filters
    // -------------------------------------------------------------
    console.log("\n7. Testing Nested Endpoints Pagination & Modality Filters...");

    // Paginated endpoints page 1 limit 2
    const epPage1 = await providerDirectoryQueryService.getProviderBySlug(fixtures.providerMultiSlug, { page: 1, limit: 2 });
    assert(epPage1?.endpoints.length === 2, "Page 1 limit 2 returns 2 endpoints");
    assert(epPage1?.pagination.total === 4, "Total endpoints is 4");
    assert(epPage1?.pagination.totalPages === 2, "Total pages is 2");
    assert(epPage1?.pagination.hasNextPage === true, "hasNextPage is true for page 1");
    assert(epPage1?.pagination.hasPreviousPage === false, "hasPreviousPage is false for page 1");

    // Page 2
    const epPage2 = await providerDirectoryQueryService.getProviderBySlug(fixtures.providerMultiSlug, { page: 2, limit: 2 });
    assert(epPage2?.endpoints.length === 2, "Page 2 limit 2 returns 2 endpoints");
    assert(epPage2?.pagination.hasNextPage === false, "hasNextPage is false for page 2");
    assert(epPage2?.pagination.hasPreviousPage === true, "hasPreviousPage is true for page 2");

    // Filter endpoints by status
    const epOnlineOnly = await providerDirectoryQueryService.getProviderBySlug(fixtures.providerMultiSlug, { status: "ONLINE" });
    assert(epOnlineOnly?.endpoints.length === 2, "status=ONLINE filter returns only the 2 online endpoints");

    const epOfflineOnly = await providerDirectoryQueryService.getProviderBySlug(fixtures.providerMultiSlug, { status: "OFFLINE" });
    assert(epOfflineOnly?.endpoints.length === 1, "status=OFFLINE filter returns only the 1 offline endpoint");

    const epUnknownOnly = await providerDirectoryQueryService.getProviderBySlug(fixtures.providerMultiSlug, { status: "UNKNOWN" });
    assert(epUnknownOnly?.endpoints.length === 1, "status=UNKNOWN filter returns only the 1 unknown endpoint");

    // Filter endpoints by modality
    const epImageOnly = await providerDirectoryQueryService.getProviderBySlug(fixtures.providerMultiSlug, { inputModality: "image" });
    assert(epImageOnly?.endpoints.length === 1 && epImageOnly?.endpoints[0].endpointKey === "fastscale-alpha-online-1", "inputModality=image matches specific endpoint");

    // -------------------------------------------------------------
    // 8. Security & Validation Bounds
    // -------------------------------------------------------------
    console.log("\n8. Testing Validation Bounds & Security...");

    // Reject limit > 100
    let limitExceeded = false;
    try {
      ProvidersQuerySchema.parse({ limit: 500 });
    } catch (e) {
      limitExceeded = e instanceof ZodError;
    }
    assert(limitExceeded, "Limit exceeding 100 rejected by ProvidersQuerySchema");

    // Reject negative page
    let negativePage = false;
    try {
      ProvidersQuerySchema.parse({ page: -1 });
    } catch (e) {
      negativePage = e instanceof ZodError;
    }
    assert(negativePage, "Negative page rejected by ProvidersQuerySchema");

    // SQL injection safety in search
    const sqlInjectionSearch = await providerDirectoryQueryService.listProviders({ q: "' OR 1=1 --" });
    assert(Array.isArray(sqlInjectionSearch.providers), "Search with SQL injection pattern handled safely");

    // Ensure sensitive fields are not exposed in DTO
    const epSample = pMulti?.endpoints[0] as unknown as Record<string, unknown>;
    assert(epSample["apiKey"] === undefined, "API keys not exposed in endpoint DTO");
    assert(epSample["payloadHash"] === undefined, "Internal hashes not exposed in endpoint DTO");
    assert(epSample["rawResponse"] === undefined, "Raw responses not exposed in endpoint DTO");

    // -------------------------------------------------------------
    // 9. API Response Envelope Contract Verification
    // -------------------------------------------------------------
    console.log("\n9. Testing API Envelope Structure...");

    // Validate that paginated directory result has correct pagination metadata shape
    assert(typeof dirWithZero.pagination.page === "number", "Envelope has page integer");
    assert(typeof dirWithZero.pagination.limit === "number", "Envelope has limit integer");
    assert(typeof dirWithZero.pagination.total === "number", "Envelope has total integer");
    assert(typeof dirWithZero.pagination.totalPages === "number", "Envelope has totalPages integer");
    assert(typeof dirWithZero.pagination.hasNextPage === "boolean", "Envelope has hasNextPage boolean");
    assert(typeof dirWithZero.pagination.hasPreviousPage === "boolean", "Envelope has hasPreviousPage boolean");

    // -------------------------------------------------------------
    // 10. PostgreSQL EXPLAIN (ANALYZE, BUFFERS) Verification
    // -------------------------------------------------------------
    console.log("\n10. Testing PostgreSQL EXPLAIN (ANALYZE, BUFFERS)...");

    const explainProviders = await prisma.$queryRawUnsafe<Array<{ "QUERY PLAN": string }>>(
      `EXPLAIN (ANALYZE, BUFFERS)
       SELECT "id", "slug", "name", "providerType", "isActive"
       FROM "providers"
       WHERE "name" ILIKE '%FastScale%' OR "slug" ILIKE '%FastScale%'
       ORDER BY "name" ASC, "id" DESC
       LIMIT 20;`
    );

    assert(
      explainProviders.length > 0 && typeof explainProviders[0]["QUERY PLAN"] === "string",
      "EXPLAIN (ANALYZE, BUFFERS) query plan retrieved for Provider search"
    );

    const planText = explainProviders.map((r) => r["QUERY PLAN"]).join("\n");
    console.log("   --- EXPLAIN Output ---");
    console.log(
      planText
        .split("\n")
        .slice(0, 5)
        .map((l) => `   ${l}`)
        .join("\n")
    );
  } finally {
    if (fixtures) {
      console.log("\nCleaning up test fixtures from PostgreSQL...");
      await cleanupFixtures(fixtures);
      console.log("✓ Fixtures successfully cleaned up.");
    }

    // Re-verify database catalog baseline counts after cleanup
    const afterModelCount = await prisma.model.count();
    const afterProviderCount = await prisma.provider.count();
    const afterEndpointCount = await prisma.modelProviderEndpoint.count();

    console.log("\nChecking database catalog counts after test fixture teardown:");
    console.log(`   Models:    ${afterModelCount} (baseline: ${baselineModelCount})`);
    console.log(`   Providers: ${afterProviderCount} (baseline: ${baselineProviderCount})`);
    console.log(`   Endpoints: ${afterEndpointCount} (baseline: ${baselineEndpointCount})`);

    assert(afterModelCount === baselineModelCount, "Catalog model count unchanged after fixture cleanup");
    assert(afterProviderCount === baselineProviderCount, "Catalog provider count unchanged after fixture cleanup");
    assert(afterEndpointCount === baselineEndpointCount, "Catalog endpoint count unchanged after fixture cleanup");
  }

  console.log("\n=========================================================");
  console.log(`📊 PROVIDER DIRECTORY TESTS: ${passedCount} Passed, ${failedCount} Failed.`);
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
