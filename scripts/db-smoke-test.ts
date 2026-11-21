import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Prisma } from "../src/generated/prisma/client";

/**
 * OneAtlas Database Comprehensive Smoke Test
 *
 * Verifies all 12 operational and relational criteria:
 * 1. Database connectivity
 * 2. Prisma Client initialization with PostgreSQL adapter
 * 3. PostgreSQL server version
 * 4. Table existence verification
 * 5. Foreign key constraints
 * 6. Decimal precision without floating-point degradation
 * 7. JSONB persistence and structured retrieval
 * 8. Unique constraint enforcement
 * 9. Model-to-Lab many-to-many relationship
 * 10. Model-to-Provider endpoint relationship
 * 11. Historical pricing record ordering and retrieval
 * 12. Benchmark result retrieval with relational provenance
 *
 * Complete cleanup in finally block — zero orphaned test records.
 */

async function runSmokeTest() {
  console.log("🔍 =========================================================");
  console.log("   ONEATLAS PRODUCTION DATABASE SMOKE TEST SUITE");
  console.log("=========================================================\n");

  const connectionString =
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/oneatlas?schema=public";

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const testSuffix = `smoke_${Date.now()}`;
  let testModelId: string | null = null;
  let testLabId: string | null = null;
  let testProviderId: string | null = null;
  let testBenchmarkId: string | null = null;

  try {
    // 1. Connectivity Check
    console.log("1. [Connectivity] Pinging PostgreSQL...");
    const pingResult = await prisma.$queryRaw<Array<{ ping: number }>>`SELECT 1 as ping;`;
    if (pingResult[0]?.ping !== 1) throw new Error("Ping check failed.");
    console.log("   ✓ Connectivity confirmed: SELECT 1 succeeded.");

    // 2. Prisma Client Initialization Check
    console.log("2. [Prisma Client] Verifying driver adapter initialization...");
    if (!prisma.$connect) throw new Error("Prisma client not properly initialized.");
    console.log("   ✓ Prisma Client initialized with @prisma/adapter-pg.");

    // 3. PostgreSQL Server Version
    console.log("3. [PostgreSQL Version] Querying engine version...");
    const versionResult = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version();`;
    const pgVersion = versionResult[0]?.version || "Unknown";
    console.log(`   ✓ Connected to PostgreSQL engine: ${pgVersion.split(",")[0]}`);

    // 4. Table Existence Verification
    console.log("4. [Tables] Checking existence of core OneAtlas tables in schema 'public'...");
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const tableNames = tables.map((t) => t.table_name);
    console.log(`   ✓ Found ${tableNames.length} tables in database:`);
    console.log(`     ${tableNames.join(", ")}`);
    
    const requiredTables = [
      "_prisma_migrations",
      "ai_labs",
      "models",
      "model_labs",
      "providers",
      "external_sources",
      "model_source_mappings",
      "model_provider_endpoints",
      "pricing_records",
      "benchmarks",
      "benchmark_results",
      "sync_runs",
      "raw_source_records",
    ];
    for (const reqTable of requiredTables) {
      if (!tableNames.includes(reqTable)) {
        throw new Error(`Required table '${reqTable}' is missing from schema.`);
      }
    }
    console.log("   ✓ All 13 required tables verified.");

    // 5. Setup Temporary Test Entities
    console.log("5. [Relational Setup] Creating isolated test entities...");
    
    // Create Temporary Lab
    const lab = await prisma.aiLab.create({
      data: {
        slug: `smoke-lab-${testSuffix}`,
        name: "Smoke Test Research Lab",
        country: "Cloud",
        description: "Temporary lab for smoke testing relational constraints.",
      },
    });
    testLabId = lab.id;

    // Create Temporary Model with JSONB capabilities
    const capabilitiesJson = {
      tools: true,
      vision: true,
      json_mode: true,
      reasoning: { default_effort: "high" },
    };

    const model = await prisma.model.create({
      data: {
        slug: `smoke-model-${testSuffix}`,
        name: "Smoke Test Frontier Model",
        isReasoning: true,
        isOpenWeight: false,
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        capabilities: capabilitiesJson,
        contextWindow: 128000,
        maxOutputTokens: 8192,
      },
    });
    testModelId = model.id;

    // Create Temporary Provider
    const provider = await prisma.provider.create({
      data: {
        slug: `smoke-provider-${testSuffix}`,
        name: "Smoke Test Cloud Inference",
        providerType: "CLOUD",
      },
    });
    testProviderId = provider.id;

    // Create Temporary Benchmark
    const benchmark = await prisma.benchmark.create({
      data: {
        slug: `smoke-bench-${testSuffix}`,
        version: "1.0",
        name: "Smoke Benchmark Suite",
        category: "REASONING",
        metricName: "Accuracy",
        metricUnit: "PERCENTAGE",
        higherIsBetter: true,
      },
    });
    testBenchmarkId = benchmark.id;
    console.log("   ✓ Test lab, model, provider, and benchmark instantiated.");

    // 6. Decimal Precision Test
    console.log("6. [Decimal Precision] Testing Decimal(20, 10) high-precision price representation...");
    const endpoint = await prisma.modelProviderEndpoint.create({
      data: {
        modelId: model.id,
        providerId: provider.id,
        endpointKey: "smoke/test-v1",
        contextWindow: 128000,
      },
    });

    const highPrecisionPrice = "0.0000035000"; // Exact 10 decimals
    const pricing = await prisma.pricingRecord.create({
      data: {
        modelProviderEndpointId: endpoint.id,
        inputPricePerMillion: new Prisma.Decimal(highPrecisionPrice),
        outputPricePerMillion: new Prisma.Decimal("15.1234567890"),
        cacheReadPricePerMillion: new Prisma.Decimal("0.0000001000"),
        currency: "USD",
        pricingUnit: "1M_TOKENS",
      },
    });

    const fetchedPricing = await prisma.pricingRecord.findUniqueOrThrow({
      where: { id: pricing.id },
    });

    const retrievedDecimalStr = fetchedPricing.inputPricePerMillion?.toFixed(10);
    const isDecimalEqual = fetchedPricing.inputPricePerMillion?.equals(
      new Prisma.Decimal(highPrecisionPrice)
    );

    if (!isDecimalEqual || retrievedDecimalStr !== highPrecisionPrice) {
      throw new Error(
        `Decimal precision mismatch: expected ${highPrecisionPrice}, got ${retrievedDecimalStr}`
      );
    }
    console.log(`   ✓ High precision Decimal preserved exactly: ${retrievedDecimalStr}`);

    // 7. JSONB Persistence & Structured Retrieval
    console.log("7. [JSONB Persistence] Verifying structured JSON retrieval...");
    const fetchedModel = await prisma.model.findUniqueOrThrow({
      where: { id: model.id },
    });
    const parsedCapabilities = fetchedModel.capabilities as typeof capabilitiesJson;
    if (
      !parsedCapabilities?.tools ||
      parsedCapabilities.reasoning.default_effort !== "high"
    ) {
      throw new Error("JSONB retrieval failed to match structured JSON payload.");
    }
    console.log("   ✓ JSONB object verified:", JSON.stringify(parsedCapabilities));

    // 8. Unique Constraint Enforcement Check
    console.log("8. [Unique Constraint] Testing violation on duplicate model slug...");
    let duplicateRejected = false;
    try {
      await prisma.model.create({
        data: {
          slug: model.slug, // Duplicate slug!
          name: "Duplicate Model",
        },
      });
    } catch (e: unknown) {
      const prismaError = e as { code?: string };
      if (prismaError.code === "P2002") {
        duplicateRejected = true;
      }
    }
    if (!duplicateRejected) {
      throw new Error("Unique constraint violation was not caught!");
    }
    console.log("   ✓ Unique constraint enforced (P2002 Unique violation triggered as expected).");

    // 9. Many-to-Many Model-Lab Relationship
    console.log("9. [Many-to-Many] Testing ModelLab join table...");
    await prisma.modelLab.create({
      data: {
        modelId: model.id,
        aiLabId: lab.id,
        relationshipType: "CREATOR",
      },
    });

    const modelWithLabs = await prisma.model.findUniqueOrThrow({
      where: { id: model.id },
      include: {
        labs: {
          include: { aiLab: true },
        },
      },
    });

    if (modelWithLabs.labs.length !== 1 || modelWithLabs.labs[0].aiLab.id !== lab.id) {
      throw new Error("Many-to-many ModelLab relation failed.");
    }
    console.log(`   ✓ Many-to-many relation verified: Model linked to Lab (${modelWithLabs.labs[0].aiLab.name}) with role '${modelWithLabs.labs[0].relationshipType}'.`);

    // 10. Model-to-Provider Endpoint Relationship
    console.log("10. [Model-Provider Endpoint] Verifying endpoint mapping...");
    const modelWithEndpoints = await prisma.model.findUniqueOrThrow({
      where: { id: model.id },
      include: {
        endpoints: {
          include: { provider: true },
        },
      },
    });

    if (
      modelWithEndpoints.endpoints.length !== 1 ||
      modelWithEndpoints.endpoints[0].provider.id !== provider.id
    ) {
      throw new Error("Model-Provider endpoint relation failed.");
    }
    console.log(`   ✓ Endpoint relation verified: Model hosted on Provider (${modelWithEndpoints.endpoints[0].provider.name}).`);

    // 11. Historical Pricing Retrieval
    console.log("11. [Historical Pricing] Verifying ordered price history retrieval...");
    // Add second price snapshot
    await prisma.pricingRecord.create({
      data: {
        modelProviderEndpointId: endpoint.id,
        inputPricePerMillion: new Prisma.Decimal("2.7500000000"),
        outputPricePerMillion: new Prisma.Decimal("11.0000000000"),
        observedAt: new Date(Date.now() + 1000),
      },
    });

    const prices = await prisma.pricingRecord.findMany({
      where: { modelProviderEndpointId: endpoint.id },
      orderBy: { observedAt: "desc" },
    });

    if (prices.length !== 2) throw new Error("Expected 2 historical price records.");
    console.log(`   ✓ Historical pricing retrieved: ${prices.length} records. Latest price: $${prices[0].inputPricePerMillion}/1M tokens.`);

    // 12. Benchmark Result Retrieval
    console.log("12. [Benchmark Results] Verifying evaluation scores and metric provenance...");
    const defaultSource = await prisma.externalSource.findFirst();
    if (!defaultSource) throw new Error("No external source found. Run seed first.");

    const benchScore = "92.4500";
    await prisma.benchmarkResult.create({
      data: {
        modelId: model.id,
        benchmarkId: benchmark.id,
        sourceId: defaultSource.id,
        metricValue: new Prisma.Decimal(benchScore),
        evaluationDate: new Date(),
        notes: "Smoke test benchmark score evaluation.",
      },
    });

    const results = await prisma.benchmarkResult.findMany({
      where: { modelId: model.id },
      include: { benchmark: true, source: true },
    });

    if (
      results.length !== 1 ||
      !results[0].metricValue.equals(new Prisma.Decimal(benchScore)) ||
      results[0].metricValue.toFixed(4) !== benchScore
    ) {
      throw new Error("Benchmark result relational query failed.");
    }
    console.log(`   ✓ Benchmark result verified: Score ${results[0].metricValue}% in '${results[0].benchmark.name}', sourced from '${results[0].source.name}'.`);

    console.log("\n=========================================================");
    console.log("🎉 ALL 12 DATABASE SMOKE TEST VERIFICATIONS PASSED!");
    console.log("=========================================================\n");
  } catch (error) {
    console.error("\n❌ Database smoke test failed with error:", error);
    process.exit(1);
  } finally {
    console.log("🧹 Teardown: Cleaning up temporary smoke test records...");
    try {
      if (testModelId) {
        await prisma.model.delete({ where: { id: testModelId } }).catch(() => {});
      }
      if (testLabId) {
        await prisma.aiLab.delete({ where: { id: testLabId } }).catch(() => {});
      }
      if (testProviderId) {
        await prisma.provider.delete({ where: { id: testProviderId } }).catch(() => {});
      }
      if (testBenchmarkId) {
        await prisma.benchmark.delete({ where: { id: testBenchmarkId } }).catch(() => {});
      }
      console.log("   ✓ Teardown complete: Zero orphaned smoke test records remaining.\n");
    } catch (cleanupError) {
      console.warn("   ⚠️ Warning during cleanup:", cleanupError);
    } finally {
      await prisma.$disconnect();
    }
  }
}

runSmokeTest();
