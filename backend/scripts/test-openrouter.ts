import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@oneatlas/database";
import {
  openRouterModelItemSchema,
  openRouterPricingSchema,
  openRouterProviderItemSchema,
} from "../src/integrations/openrouter/schemas";
import {
  normalizePricing,
  normalizeModel,
  normalizeProvider,
  computePayloadHash,
} from "../src/integrations/openrouter/mapper";
import { PricingService } from "../src/integrations/openrouter/pricing.service";
import { ModelService } from "../src/integrations/openrouter/model.service";
import { ProviderService } from "../src/integrations/openrouter/provider.service";

/**
 * OpenRouter Integration Test Suite
 * Validates Zod schemas, decimal pricing normalization, canonical mapping, and persistence.
 */

async function runTests() {
  console.log("🧪 =========================================================");
  console.log("   AI DETAILS OPENROUTER INTEGRATION UNIT & PERSISTENCE TESTS");
  console.log("=========================================================\n");

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`   ✓ [PASS] ${testName}`);
      testsPassed++;
    } else {
      console.error(`   ❌ [FAIL] ${testName}`);
      testsFailed++;
    }
  }

  // 1. Zod Schema Validation Tests
  console.log("1. Testing Zod Schemas against official OpenRouter response structures...");
  
  // Valid Model
  const validModelPayload = {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    context_length: 200000,
    architecture: {
      modality: "text+image->text",
      input_modalities: ["text", "image"],
      output_modalities: ["text"],
    },
    pricing: {
      prompt: "0.000003",
      completion: "0.000015",
      input_cache_read: "0.0000003",
    },
  };
  const parsedModel = openRouterModelItemSchema.safeParse(validModelPayload);
  assert(parsedModel.success, "Valid model payload passes openRouterModelItemSchema");

  // Missing required ID
  const invalidModelPayload = { name: "Model Without ID" };
  const parsedInvalid = openRouterModelItemSchema.safeParse(invalidModelPayload);
  assert(!parsedInvalid.success, "Model without required 'id' is rejected by schema");

  // Valid Provider
  const validProviderPayload = {
    name: "Together AI",
    slug: "together",
    privacy_policy_url: "https://together.ai/privacy",
    datacenters: ["US"],
  };
  const parsedProvider = openRouterProviderItemSchema.safeParse(validProviderPayload);
  assert(parsedProvider.success, "Valid provider payload passes openRouterProviderItemSchema");

  // Pricing schema with null/undefined values
  const partialPricingPayload = {
    prompt: "0.000001",
    completion: null,
  };
  const parsedPricing = openRouterPricingSchema.safeParse(partialPricingPayload);
  assert(parsedPricing.success, "Partial pricing with null values passes openRouterPricingSchema");

  // 2. Pricing Normalizer & Decimal Math Tests
  console.log("\n2. Testing Exact Decimal Pricing Normalization (USD/1M tokens)...");
  
  // Per-token conversion: $0.000003 -> $3.0000000000 per 1M
  const norm1 = normalizePricing({
    prompt: "0.000003",
    completion: "0.000015",
  });
  assert(
    norm1 !== null &&
      norm1.inputPricePerMillion?.equals(new Prisma.Decimal("3.0")) === true &&
      norm1.outputPricePerMillion?.equals(new Prisma.Decimal("15.0")) === true,
    "Standard pricing: $0.000003/token correctly converts to $3.00/1M tokens"
  );

  // Small fractions: $0.00000005 -> $0.05 per 1M
  const normSmall = normalizePricing({
    prompt: "0.00000005",
    completion: "0.0000002",
  });
  assert(
    normSmall !== null &&
      normSmall.inputPricePerMillion?.equals(new Prisma.Decimal("0.05")) === true &&
      normSmall.outputPricePerMillion?.equals(new Prisma.Decimal("0.2")) === true,
    "Micro-fraction pricing: $0.00000005 converts to $0.05/1M tokens without float error"
  );

  // Explicit zero vs missing
  const normZero = normalizePricing({ prompt: "0", completion: "0" });
  assert(
    normZero !== null &&
      normZero.inputPricePerMillion?.equals(new Prisma.Decimal(0)) === true,
    "Explicit zero pricing '0' is preserved as Decimal(0)"
  );

  const normNull = normalizePricing(null);
  assert(normNull === null, "Null pricing returns null without fabricating values");

  // 3. Model Normalizer Tests
  console.log("\n3. Testing Model Normalizer & Lab Inference...");
  const normModel = normalizeModel({
    id: "openai/o1-mini",
    name: "OpenAI: o1-mini",
    context_length: 128000,
    architecture: {
      modality: "text->text",
      input_modalities: ["text"],
      output_modalities: ["text"],
    },
    reasoning: { default_enabled: true },
  });
  assert(normModel.slug === "o1-mini", "Canonical slug derived correctly ('o1-mini')");
  assert(normModel.inferredLabSlug === "openai", "AI Lab correctly inferred as 'openai'");
  assert(normModel.isReasoning === true, "isReasoning correctly identified for o1 model");
  assert(normModel.contextWindow === 128000, "Context window preserved as 128,000");

  // 4. Deterministic Payload Hashing Tests
  console.log("\n4. Testing Deterministic SHA-256 Payload Hashing...");
  const payloadA = { b: 2, a: 1, nested: { y: 2, x: 1 } };
  const payloadB = { a: 1, b: 2, nested: { x: 1, y: 2 } };
  const hashA = computePayloadHash(payloadA);
  const hashB = computePayloadHash(payloadB);
  assert(hashA === hashB, "Different key order produces identical deterministic hash");

  // 5. Database Persistence & Idempotency Integration Tests
  console.log("\n5. Testing Live Database Persistence, Deduplication & Pricing Append-Only...");
  const connectionString =
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/AI DETAILS?schema=public";

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const testSuffix = `test_${Date.now()}`;
  let cleanupModelId: string | null = null;
  let cleanupProviderId: string | null = null;

  try {
    const defaultSource = await prisma.externalSource.findFirst();
    if (!defaultSource) throw new Error("External source not seeded. Run seed first.");

    const providerService = new ProviderService(prisma);
    const modelService = new ModelService(prisma);
    const pricingService = new PricingService(prisma);

    // Test Provider Resolution
    const dummyProvider = normalizeProvider({
      slug: `test-prov-${testSuffix}`,
      name: "Test Dynamic Provider",
      privacy_policy_url: "https://testprov.ai/privacy",
    });

    const { provider: p1, isNew: p1New } = await providerService.resolveOrCreateProvider(
      defaultSource.id,
      dummyProvider
    );
    cleanupProviderId = p1.id;
    assert(p1New, "New provider successfully created on first import");

    // Second resolution must be idempotent
    const { provider: p2, isNew: p2New } = await providerService.resolveOrCreateProvider(
      defaultSource.id,
      dummyProvider
    );
    assert(!p2New && p1.id === p2.id, "Second provider import reuses existing provider and mapping");

    // Test Model Resolution
    const dummyModel = normalizeModel({
      id: `testauthor/model-${testSuffix}`,
      name: "Test Dynamic Model",
      context_length: 64000,
      architecture: { input_modalities: ["text"], output_modalities: ["text"] },
    });

    const { model: m1, isNew: m1New } = await modelService.resolveOrCreateModel(
      defaultSource.id,
      dummyModel
    );
    cleanupModelId = m1.id;
    assert(m1New, "New canonical model and source mapping created on first import");

    // Second resolution must be idempotent
    const { model: m2, isNew: m2New } = await modelService.resolveOrCreateModel(
      defaultSource.id,
      dummyModel
    );
    assert(!m2New && m1.id === m2.id, "Second model import resolves existing model without duplicating");

    // Test Pricing Append-Only behavior
    const testEndpoint = await prisma.modelProviderEndpoint.create({
      data: {
        modelId: m1.id,
        providerId: p1.id,
        endpointKey: `test-ep-${testSuffix}`,
        status: "ONLINE",
      },
    });

    const price1 = normalizePricing({ prompt: "0.000002", completion: "0.000008" });
    const priceRecorded1 = await pricingService.recordPriceIfChanged(
      testEndpoint.id,
      defaultSource.id,
      price1
    );
    assert(priceRecorded1, "First pricing record successfully appended");

    // Identical price should NOT create duplicate record
    const priceRecordedDuplicate = await pricingService.recordPriceIfChanged(
      testEndpoint.id,
      defaultSource.id,
      price1
    );
    assert(!priceRecordedDuplicate, "Identical price observation rejected (zero duplicate price rows)");

    // Changed price SHOULD create second record
    const price2 = normalizePricing({ prompt: "0.0000015", completion: "0.000006" });
    const priceRecorded2 = await pricingService.recordPriceIfChanged(
      testEndpoint.id,
      defaultSource.id,
      price2
    );
    assert(priceRecorded2, "Price modification detected and new historical snapshot appended");

    const totalPrices = await prisma.pricingRecord.count({
      where: { modelProviderEndpointId: testEndpoint.id },
    });
    assert(totalPrices === 2, `Exact price history count verified: 2 records (got ${totalPrices})`);
  } finally {
    // Clean up temporary test entities
    if (cleanupModelId) {
      await prisma.model.delete({ where: { id: cleanupModelId } }).catch(() => {});
    }
    if (cleanupProviderId) {
      await prisma.provider.delete({ where: { id: cleanupProviderId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log("\n=========================================================");
  console.log(`📊 TESTS COMPLETED: ${testsPassed} Passed, ${testsFailed} Failed.`);
  console.log("=========================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
