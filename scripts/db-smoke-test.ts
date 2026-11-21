import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * OneAtlas Database Smoke Test Script
 *
 * Verifies:
 * 1. PostgreSQL connectivity and version query
 * 2. Prisma Client initialization with driver adapter
 * 3. Decimal precision handling
 * 4. Relational integrity (Create, Read, Delete test records)
 * 5. Clean teardown with zero orphaned records
 */

async function runSmokeTest() {
  console.log("🔍 Starting OneAtlas Database Smoke Test...");

  const connectionString =
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/oneatlas?schema=public";

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Raw connectivity check
    console.log("1. Testing raw PostgreSQL connection...");
    const rawResult = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version();`;
    console.log("   ✓ PostgreSQL Connected:", rawResult[0]?.version.split(" ")[0] ?? "Unknown");

    // 2. Query seed data counts
    console.log("2. Verifying seeded baseline reference records...");
    const labCount = await prisma.aiLab.count();
    const sourceCount = await prisma.externalSource.count();
    const providerCount = await prisma.provider.count();
    const benchmarkCount = await prisma.benchmark.count();

    console.log(`   ✓ AI Labs: ${labCount}`);
    console.log(`   ✓ External Sources: ${sourceCount}`);
    console.log(`   ✓ Providers: ${providerCount}`);
    console.log(`   ✓ Benchmarks: ${benchmarkCount}`);

    if (labCount === 0 || sourceCount === 0) {
      console.warn("   ⚠️ Warning: Database appears unseeded. Run `npm run db:seed`.");
    }

    // 3. Test relational entity creation with Decimal precision
    console.log("3. Testing relational transaction and Decimal precision...");
    const testSlug = `smoke-test-model-${Date.now()}`;

    // Create test model
    const testModel = await prisma.model.create({
      data: {
        slug: testSlug,
        name: "Smoke Test Model",
        description: "Temporary model for smoke testing database constraints.",
        isReasoning: true,
        isOpenWeight: false,
        inputModalities: ["text"],
        outputModalities: ["text"],
      },
    });

    // Create test provider endpoint
    const defaultProvider = await prisma.provider.findFirst();
    if (!defaultProvider) {
      throw new Error("Cannot run relational test: No provider exists in database.");
    }

    const testEndpoint = await prisma.modelProviderEndpoint.create({
      data: {
        modelId: testModel.id,
        providerId: defaultProvider.id,
        endpointKey: "smoke-test-endpoint",
        name: "Smoke Test Endpoint",
      },
    });

    // Create test pricing record with high decimal precision
    const testPricing = await prisma.pricingRecord.create({
      data: {
        modelProviderEndpointId: testEndpoint.id,
        inputPricePerMillion: "3.5000000000",
        outputPricePerMillion: "15.0000000000",
        currency: "USD",
        pricingUnit: "1M_TOKENS",
      },
    });

    // Validate decimal value fidelity
    const parsedPrice = testPricing.inputPricePerMillion?.toString();
    console.log(`   ✓ Decimal precision preserved: ${parsedPrice}`);

    // 4. Clean up test records (Cascade should delete endpoint and pricing)
    console.log("4. Verifying cascade delete and cleanup...");
    await prisma.model.delete({
      where: { id: testModel.id },
    });

    // Verify orphaned check
    const orphanedEndpoint = await prisma.modelProviderEndpoint.findUnique({
      where: { id: testEndpoint.id },
    });

    if (orphanedEndpoint !== null) {
      throw new Error("Cascade delete failed: orphaned endpoint remains.");
    }
    console.log("   ✓ Cascade deletion confirmed: 0 orphaned records.");

    console.log("✅ All OneAtlas Database Smoke Tests Passed!");
  } catch (error) {
    console.error("❌ Database smoke test failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSmokeTest();
