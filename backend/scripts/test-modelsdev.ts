import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@oneatlas/database";
import {
  modelsDevCanonicalModelSchema,
  modelsDevProviderSchema,
  modelsDevPricingSchema,
} from "../src/integrations/modelsdev/schemas";
import {
  normalizePricing,
  normalizeCanonicalModel,
  normalizeProvider,
  normalizeEndpoint,
  computePayloadHash,
  deriveCanonicalSlug,
} from "../src/integrations/modelsdev/mapper";
import { PricingService } from "../src/integrations/modelsdev/pricing.service";
import { ModelService } from "../src/integrations/modelsdev/model.service";
import { ProviderService } from "../src/integrations/modelsdev/provider.service";
import { EndpointService } from "../src/integrations/modelsdev/endpoint.service";

/**
 * OneAtlas Models.dev Integration Test Suite
 * Covers Zod validation, pricing normalization (no multiplication by 1M),
 * canonical reconciliation, deterministic hashing, true idempotency, and live DB persistence.
 */

async function runTests() {
  console.log(`
🧪 =========================================================
   ONEATLAS MODELs.DEV INTEGRATION UNIT & PERSISTENCE TESTS
=========================================================
`);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`   ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`   ✗ [FAIL] ${message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------
  // 1. Zod Schema Validation
  // -------------------------------------------------------------------
  console.log("1. Testing Zod Schemas against Models.dev response shapes...");

  const validModelPayload = {
    id: "sao10k/l3.3-euryale-70b",
    name: "Llama 3.3 Euryale 70B",
    description: "Open Llama instruction model",
    family: "euryale",
    attachment: false,
    reasoning: false,
    tool_call: true,
    temperature: true,
    knowledge: "2023-12-31",
    release_date: "2024-12-18",
    modalities: { input: ["text"], output: ["text"] },
    open_weights: true,
    limit: { context: 131072, output: 16384 },
    license: "apache-2.0",
    weights: [{ label: "Hugging Face", url: "https://huggingface.co/sample" }],
    benchmarks: [{ name: "MMLU", score: 88.5, metric: "score" }],
  };

  const parsedModel = modelsDevCanonicalModelSchema.safeParse(validModelPayload);
  assert(parsedModel.success, "Valid model payload passes modelsDevCanonicalModelSchema");

  const invalidModel = { name: "Missing ID" };
  const parsedInvalid = modelsDevCanonicalModelSchema.safeParse(invalidModel);
  assert(!parsedInvalid.success, "Model missing required 'id' is rejected by schema");

  const validProviderPayload = {
    id: "openrouter",
    name: "OpenRouter",
    npm: "@openrouter/ai-sdk-provider",
    api: "https://openrouter.ai/api/v1",
    doc: "https://openrouter.ai/models",
    env: ["OPENROUTER_API_KEY"],
    models: {},
  };
  const parsedProvider = modelsDevProviderSchema.safeParse(validProviderPayload);
  assert(parsedProvider.success, "Valid provider payload passes modelsDevProviderSchema");

  const validPricingPayload = {
    input: 0.15,
    output: 1.875,
    cache_read: 0.0375,
    reasoning: 0.5,
  };
  const parsedPricing = modelsDevPricingSchema.safeParse(validPricingPayload);
  assert(parsedPricing.success, "Valid pricing payload passes modelsDevPricingSchema");

  // -------------------------------------------------------------------
  // 2. Exact Decimal Pricing Normalization (CRITICAL RULE VERIFICATION)
  // -------------------------------------------------------------------
  console.log("\n2. Testing Exact Decimal Pricing (NO multiplication by 1,000,000)...");

  // Models.dev input cost = 1.25 -> must be USD 1.25 per 1M tokens, NOT 1,250,000
  const normalizedP1 = normalizePricing({ input: 1.25, output: 5.0 });
  assert(
    normalizedP1 !== null &&
      normalizedP1.inputPricePerMillion?.equals(new Prisma.Decimal(1.25)) === true,
    "Models.dev cost 1.25 is stored directly as Decimal(1.25) per 1M tokens (NOT 1,250,000)"
  );
  assert(
    normalizedP1 !== null &&
      normalizedP1.outputPricePerMillion?.equals(new Prisma.Decimal(5.0)) === true,
    "Models.dev cost 5.0 is stored directly as Decimal(5.0) per 1M tokens"
  );

  // Micro-tier cost: 0.04 -> 0.04
  const normalizedP2 = normalizePricing({ input: 0.04, output: 0.05, cache_read: 0.01 });
  assert(
    normalizedP2 !== null &&
      normalizedP2.inputPricePerMillion?.equals(new Prisma.Decimal(0.04)) === true,
    "Micro-cost 0.04 is stored accurately as Decimal(0.04)"
  );
  assert(
    normalizedP2 !== null &&
      normalizedP2.cacheReadPricePerMillion?.equals(new Prisma.Decimal(0.01)) === true,
    "Cache read cost 0.01 is stored accurately as Decimal(0.01)"
  );

  // Explicit zero pricing
  const normalizedZero = normalizePricing({ input: 0, output: 0 });
  assert(
    normalizedZero !== null &&
      normalizedZero.inputPricePerMillion?.equals(new Prisma.Decimal(0)) === true,
    "Explicit zero cost (0) is preserved as Decimal(0)"
  );

  // Null pricing returns null
  const normalizedNull = normalizePricing(null);
  assert(normalizedNull === null, "Null cost object returns null without fabricating zeros");

  // -------------------------------------------------------------------
  // 3. Model Normalizer & Lab Attribution
  // -------------------------------------------------------------------
  console.log("\n3. Testing Model Normalizer, Lab Attribution & Slug Derivation...");

  assert(deriveCanonicalSlug("openai/gpt-4o") === "gpt-4o", "Canonical slug derived: 'openai/gpt-4o' -> 'gpt-4o'");
  assert(deriveCanonicalSlug("sao10k/l3.3-euryale-70b") === "l3.3-euryale-70b", "Canonical slug derived for nested name");

  const normalizedM1 = normalizeCanonicalModel({
    id: "openai/o1-mini",
    name: "OpenAI o1 Mini",
    family: "o1",
    release_date: "2024-09-12",
    knowledge: "2023-10-01",
    reasoning: true,
    limit: { context: 128000, output: 65536 },
  });

  assert(normalizedM1.slug === "o1-mini", "Model slug normalized to 'o1-mini'");
  assert(normalizedM1.inferredLabSlug === "openai", "Verified lab 'openai' correctly inferred from namespace");
  assert(normalizedM1.family === "o1", "Model family 'o1' preserved");
  assert(normalizedM1.isReasoning === true, "Reasoning capability detected for o1 model");
  assert(normalizedM1.knowledgeCutoff === "2023-10-01", "Knowledge cutoff preserved");
  assert(normalizedM1.releaseDate !== null && normalizedM1.releaseDate.toISOString().startsWith("2024-09-12"), "Release date correctly parsed into Date object");

  const unverifiedLabModel = normalizeCanonicalModel({
    id: "unknownlab/random-model-7b",
    name: "Random Model 7B",
  });
  assert(
    unverifiedLabModel.inferredLabSlug === null,
    "Unverified lab namespace remains unresolved (null) rather than fabricated"
  );

  // -------------------------------------------------------------------
  // 4. Deterministic SHA-256 Payload Hashing
  // -------------------------------------------------------------------
  console.log("\n4. Testing Deterministic SHA-256 Hashing...");
  const objA = { name: "Llama", b: 2, a: 1, z: [3, 2, 1] };
  const objB = { z: [3, 2, 1], a: 1, name: "Llama", b: 2 };
  const hashA = computePayloadHash(objA);
  const hashB = computePayloadHash(objB);
  assert(hashA === hashB, "Different key order produces identical deterministic SHA-256 hash");

  // -------------------------------------------------------------------
  // 5. Live Database Persistence, True Idempotency & Provenance
  // -------------------------------------------------------------------
  console.log("\n5. Testing Live Database Persistence, Change Detection & Idempotency...");

  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    // Ensure ExternalSource for modelsdev
    const source = await prisma.externalSource.upsert({
      where: { slug: "modelsdev" },
      update: {},
      create: {
        slug: "modelsdev",
        name: "Models.dev API Test",
        baseUrl: "https://models.dev",
        website: "https://models.dev",
      },
    });

    const modelService = new ModelService(prisma);
    const providerService = new ProviderService(prisma);
    const endpointService = new EndpointService(prisma);
    const pricingService = new PricingService(prisma);

    const testProviderId = `test-provider-${Date.now()}`;
    const testModelId = `test-org/test-model-${Date.now()}`;

    // Test 1: Provider Creation & Idempotency
    const normProvider = normalizeProvider({
      id: testProviderId,
      name: "Test ModelsDev Provider",
      npm: "@test/sdk",
      api: "https://api.testprovider.com/v1",
      doc: "https://testprovider.com/docs",
      env: ["TEST_API_KEY"],
    });

    const pRes1 = await providerService.resolveOrCreateProvider(source.id, normProvider);
    assert(pRes1.status === "inserted", "New provider created with status 'inserted'");

    // Second run with identical data -> must report "unchanged" (0 updates)
    const pRes2 = await providerService.resolveOrCreateProvider(source.id, normProvider);
    assert(pRes2.status === "unchanged", "Identical provider reports status 'unchanged' (true idempotency)");

    // Test 2: Canonical Model Creation & Idempotency
    const normModel = normalizeCanonicalModel({
      id: testModelId,
      name: "Test ModelsDev Canonical Model",
      family: "test-family",
      release_date: "2025-01-15",
      knowledge: "2024-12-01",
      license: "mit",
      limit: { context: 65536, output: 8192 },
      open_weights: true,
    });

    const mRes1 = await modelService.resolveOrCreateCanonicalModel(source.id, normModel);
    assert(mRes1.status === "inserted", "New canonical model created with status 'inserted'");
    assert(mRes1.model.family === "test-family", "Family column persisted in models table");

    // Second run with identical model -> must report "unchanged" (0 updates)
    const mRes2 = await modelService.resolveOrCreateCanonicalModel(source.id, normModel);
    assert(mRes2.status === "unchanged", "Identical model reports status 'unchanged' (true idempotency)");

    // Test 3: Endpoint Creation, Source Mapping & Idempotency
    const normEndpoint = normalizeEndpoint(testProviderId, {
      id: "test-model-endpoint-1",
      name: "Test Provider Model Endpoint",
      canonical_model_id: testModelId,
      limit: { context: 65536, output: 8192 },
      cost: { input: 0.75, output: 3.0 },
    });

    const epRes1 = await endpointService.resolveOrCreateEndpoint(source.id, normEndpoint);
    assert(epRes1.status === "inserted" && epRes1.endpoint !== undefined, "New endpoint created with status 'inserted'");

    // Verify EndpointSourceMapping was created
    const epMapping = await prisma.endpointSourceMapping.findUnique({
      where: {
        sourceId_externalEndpointId: {
          sourceId: source.id,
          externalEndpointId: normEndpoint.externalEndpointId,
        },
      },
    });
    assert(epMapping !== null, "EndpointSourceMapping record successfully created and linked");

    // Second run with identical endpoint -> must report "unchanged"
    const epRes2 = await endpointService.resolveOrCreateEndpoint(source.id, normEndpoint);
    assert(epRes2.status === "unchanged", "Identical endpoint reports status 'unchanged'");

    // Test 4: Pricing Provenance & Isolation
    // 4.1 First price observation for modelsdev
    const priceInserted1 = await pricingService.recordPriceIfChanged(
      epRes1.endpoint!.id,
      source.id,
      normEndpoint.pricing
    );
    assert(priceInserted1 === true, "First pricing record successfully created for modelsdev source");

    // 4.2 Identical price from modelsdev -> should NOT create duplicate record
    const priceInserted2 = await pricingService.recordPriceIfChanged(
      epRes1.endpoint!.id,
      source.id,
      normEndpoint.pricing
    );
    assert(priceInserted2 === false, "Identical price from same source produces 0 duplicate records");

    // 4.3 Price observation from a DIFFERENT source on the SAME endpoint
    const otherSource = await prisma.externalSource.upsert({
      where: { slug: "openrouter" },
      update: {},
      create: { slug: "openrouter", name: "OpenRouter API" },
    });

    // Record different price for openrouter on the same endpoint
    const otherPrice = normalizePricing({ input: 0.80, output: 3.20 });
    const otherPriceInserted = await pricingService.recordPriceIfChanged(
      epRes1.endpoint!.id,
      otherSource.id,
      otherPrice
    );
    assert(otherPriceInserted === true, "Different source records independent pricing on same endpoint");

    // Query prices scoped to modelsdev source only
    const modelsDevPrices = await prisma.pricingRecord.findMany({
      where: {
        modelProviderEndpointId: epRes1.endpoint!.id,
        sourceId: source.id,
      },
    });
    assert(modelsDevPrices.length === 1, "Models.dev pricing query correctly scoped by sourceId (1 record)");
    assert(
      modelsDevPrices[0].inputPricePerMillion?.equals(new Prisma.Decimal(0.75)) === true,
      "Models.dev pricing value preserved exactly as Decimal(0.75)"
    );

    // Teardown test entities
    await prisma.pricingRecord.deleteMany({
      where: { modelProviderEndpointId: epRes1.endpoint!.id },
    });
    await prisma.endpointSourceMapping.deleteMany({
      where: { endpointId: epRes1.endpoint!.id },
    });
    await prisma.modelProviderEndpoint.deleteMany({
      where: { id: epRes1.endpoint!.id },
    });
    await prisma.modelSourceMapping.deleteMany({
      where: { modelId: mRes1.model.id },
    });
    await prisma.model.delete({
      where: { id: mRes1.model.id },
    });
    await prisma.providerSourceMapping.deleteMany({
      where: { providerId: pRes1.provider.id },
    });
    await prisma.provider.delete({
      where: { id: pRes1.provider.id },
    });

    console.log("   ✓ Teardown complete: Isolated test entities cleaned up.");
  } finally {
    await prisma.$disconnect();
  }

  // -------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------
  console.log(`
=========================================================
📊 TESTS COMPLETED: ${passed} Passed, ${failed} Failed.
=========================================================
`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
