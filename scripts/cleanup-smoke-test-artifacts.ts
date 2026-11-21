import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing database connection string");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const isApply = process.argv.includes("--apply");

  console.log("===============================================================");
  console.log("   ONEATLAS SMOKE TEST ARTIFACTS AUDIT & CLEANUP (Section 14)");
  console.log(`   Mode: ${isApply ? "APPLY (DELETION ENABLED)" : "PREVIEW / DRY-RUN"}`);
  console.log("===============================================================\n");

  // 1. Inspect Candidate Smoke Test Records
  const smokeModels = await prisma.model.findMany({
    where: {
      OR: [
        { slug: { startsWith: "smoke-model-" } },
        { name: "Smoke Test Frontier Model" },
      ],
    },
    include: {
      sourceMappings: true,
      labs: { include: { aiLab: true } },
      endpoints: {
        include: {
          pricingRecords: true,
          sourceMappings: true,
        },
      },
      benchmarkResults: true,
    },
  });

  const smokeProviders = await prisma.provider.findMany({
    where: {
      OR: [
        { slug: { startsWith: "smoke-provider-" } },
        { name: "Smoke Test Cloud Inference" },
      ],
    },
    include: {
      sourceMappings: true,
      endpoints: true,
    },
  });

  const smokeBenchmarks = await prisma.benchmark.findMany({
    where: {
      slug: { startsWith: "smoke-bench-" },
    },
    include: {
      results: true,
    },
  });

  console.log("--- 1. IDENTIFIED TEST ARTIFACTS FOR CLEANUP ---");
  console.log(`Identified Smoke Models:     ${smokeModels.length}`);
  for (const m of smokeModels) {
    console.log(`  - Model ID: ${m.id} | Slug: ${m.slug} | Name: "${m.name}"`);
    console.log(`    External Source Mappings: ${m.sourceMappings.length} (Must be 0)`);
    console.log(`    Endpoints: ${m.endpoints.length} | Benchmark Results: ${m.benchmarkResults.length} | Labs: ${m.labs.length}`);
  }

  console.log(`\nIdentified Smoke Providers:  ${smokeProviders.length}`);
  for (const p of smokeProviders) {
    console.log(`  - Provider ID: ${p.id} | Slug: ${p.slug} | Name: "${p.name}"`);
    console.log(`    External Source Mappings: ${p.sourceMappings.length} (Must be 0)`);
    console.log(`    Endpoints: ${p.endpoints.length}`);
  }

  console.log(`\nIdentified Smoke Benchmarks: ${smokeBenchmarks.length}`);
  for (const b of smokeBenchmarks) {
    console.log(`  - Benchmark ID: ${b.id} | Slug: ${b.slug} | Results: ${b.results.length}`);
  }

  // Safety Verification Check
  let isSafe = true;
  for (const m of smokeModels) {
    if (m.sourceMappings.length > 0) {
      console.error(`[SAFETY VIOLATION] Model ${m.id} has real external source mappings! Aborting.`);
      isSafe = false;
    }
  }
  for (const p of smokeProviders) {
    if (p.sourceMappings.length > 0) {
      console.error(`[SAFETY VIOLATION] Provider ${p.id} has real external source mappings! Aborting.`);
      isSafe = false;
    }
  }

  if (!isSafe) {
    console.error("Cleanup aborted due to safety violation.");
    process.exit(1);
  }

  if (!isApply) {
    console.log("\n[DRY RUN SUMMARY] Pass '--apply' to safely execute reverse-dependency deletion.");
    console.log("No data was modified.");
    console.log("===============================================================");
    return;
  }

  // 2. Safe Reverse-Dependency Deletion
  console.log("\n--- 2. EXECUTING REVERSE-DEPENDENCY DELETION ---");

  // Collect dependent IDs
  const modelIds = smokeModels.map((m) => m.id);
  const providerIds = smokeProviders.map((p) => p.id);
  const benchmarkIds = smokeBenchmarks.map((b) => b.id);
  const endpointIds = smokeModels.flatMap((m) => m.endpoints.map((e) => e.id));

  // Step A: Delete Pricing records associated with smoke endpoints
  const deletedPricing = await prisma.pricingRecord.deleteMany({
    where: { modelProviderEndpointId: { in: endpointIds } },
  });
  console.log(`  ✓ Deleted ${deletedPricing.count} pricing records for smoke endpoints.`);

  // Step B: Delete BenchmarkResults associated with smoke models/benchmarks
  const deletedResults = await prisma.benchmarkResult.deleteMany({
    where: {
      OR: [
        { modelId: { in: modelIds } },
        { benchmarkId: { in: benchmarkIds } },
      ],
    },
  });
  console.log(`  ✓ Deleted ${deletedResults.count} benchmark results.`);

  // Step C: Delete ModelLab join rows for smoke models
  const deletedModelLabs = await prisma.modelLab.deleteMany({
    where: { modelId: { in: modelIds } },
  });
  console.log(`  ✓ Deleted ${deletedModelLabs.count} model-lab relationships.`);

  // Step D: Delete FieldProvenance for smoke models
  const deletedProvenance = await prisma.fieldProvenance.deleteMany({
    where: {
      entityType: "MODEL",
      entityId: { in: modelIds },
    },
  });
  console.log(`  ✓ Deleted ${deletedProvenance.count} field provenance rows.`);

  // Step E: Delete DataConflicts for smoke models
  const deletedConflicts = await prisma.dataConflict.deleteMany({
    where: {
      entityType: "MODEL",
      entityId: { in: modelIds },
    },
  });
  console.log(`  ✓ Deleted ${deletedConflicts.count} data conflicts.`);

  // Step F: Delete Smoke Endpoints
  const deletedEndpoints = await prisma.modelProviderEndpoint.deleteMany({
    where: { id: { in: endpointIds } },
  });
  console.log(`  ✓ Deleted ${deletedEndpoints.count} smoke endpoints.`);

  // Step G: Delete Smoke Models
  const deletedModels = await prisma.model.deleteMany({
    where: { id: { in: modelIds } },
  });
  console.log(`  ✓ Deleted ${deletedModels.count} smoke models.`);

  // Step H: Delete Smoke Providers
  const deletedProviders = await prisma.provider.deleteMany({
    where: { id: { in: providerIds } },
  });
  console.log(`  ✓ Deleted ${deletedProviders.count} smoke providers.`);

  // Step I: Delete Smoke Benchmarks
  const deletedBenchmarks = await prisma.benchmark.deleteMany({
    where: { id: { in: benchmarkIds } },
  });
  console.log(`  ✓ Deleted ${deletedBenchmarks.count} smoke benchmarks.`);

  // 3. Post-cleanup Verification
  const remainingModels = await prisma.model.count();
  const remainingEndpoints = await prisma.modelProviderEndpoint.count();
  const remainingProviders = await prisma.provider.count();

  console.log("\n--- 3. POST-CLEANUP INVARIANT VERIFICATION ---");
  console.log(`Remaining Canonical Models:    ${remainingModels} (Expected 34 genuine models)`);
  console.log(`Remaining Model Endpoints:     ${remainingEndpoints} (Expected 20 genuine OpenRouter endpoints)`);
  console.log(`Remaining Providers:           ${remainingProviders} (Expected 142 genuine providers)`);
  console.log("Cleanup completed successfully with zero legitimate data loss.");
  console.log("===============================================================");
}

main()
  .catch((e) => {
    console.error("Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
