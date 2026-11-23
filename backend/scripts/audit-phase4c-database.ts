import "./env";
import { prisma } from "../src/database/index";

async function main() {
  console.log("=================================================");
  console.log("🔍 AI DETAILS LIVE DATABASE AUDIT FOR PHASE 4C");
  console.log("=================================================\n");

  // 1. Canonical model count
  const totalModels = await prisma.model.count();
  const activeModels = await prisma.model.count({ where: { status: "ACTIVE" } });

  // 2 & 3. Models with / without AI lab associations
  const modelsWithLabs = await prisma.model.count({
    where: { labs: { some: {} } },
  });
  const modelsWithoutLabs = totalModels - modelsWithLabs;

  // 4. Models with verified provider endpoints (ONLINE status)
  const modelsWithEndpoints = await prisma.model.count({
    where: { endpoints: { some: {} } },
  });
  const modelsWithOnlineEndpoints = await prisma.model.count({
    where: { endpoints: { some: { status: "ONLINE" } } },
  });

  // 5. Models with unresolved provider offerings (candidates or unmapped)
  const unresolvedCandidates = await prisma.modelResolutionCandidate.count({
    where: { status: "PENDING" },
  });

  // 6. Models with active pricing (endpoint has pricingRecords)
  const modelsWithActivePricing = await prisma.model.count({
    where: {
      endpoints: {
        some: {
          status: "ONLINE",
          pricingRecords: {
            some: {
              OR: [
                { inputPricePerMillion: { not: null } },
                { outputPricePerMillion: { not: null } },
              ],
            },
          },
        },
      },
    },
  });

  // 7. Models with pricing history (more than 1 pricing record on any endpoint)
  const endpointsWithMultiplePrices = await prisma.modelProviderEndpoint.findMany({
    select: {
      modelId: true,
      _count: { select: { pricingRecords: true } },
    },
    where: {
      pricingRecords: { some: {} },
    },
  });
  const modelsWithHistorySet = new Set(
    endpointsWithMultiplePrices
      .filter((e) => e._count.pricingRecords > 1)
      .map((e) => e.modelId)
  );
  const modelsWithPricingHistory = modelsWithHistorySet.size;

  // 8. Models with multiple pricing sources
  const endpointsWithSources = await prisma.modelProviderEndpoint.findMany({
    select: {
      modelId: true,
      pricingRecords: {
        select: { sourceId: true },
        distinct: ["sourceId"],
      },
    },
  });
  const modelsWithMultiSourceSet = new Set<string>();
  for (const ep of endpointsWithSources) {
    if (ep.pricingRecords.length > 1) {
      modelsWithMultiSourceSet.add(ep.modelId);
    }
  }
  const modelsWithMultiplePricingSources = modelsWithMultiSourceSet.size;

  // 9. Models with field provenance
  const modelsWithProvenance = await prisma.fieldProvenance.findMany({
    where: { entityType: "MODEL" },
    select: { entityId: true },
    distinct: ["entityId"],
  });

  // 10. Models with active metadata conflicts
  const modelsWithOpenConflicts = await prisma.dataConflict.findMany({
    where: { entityType: "MODEL", status: "OPEN" },
    select: { entityId: true },
    distinct: ["entityId"],
  });

  // 11. Models with benchmark results
  const totalBenchmarks = await prisma.benchmark.count();
  const totalBenchmarkResults = await prisma.benchmarkResult.count();
  const modelsWithBenchmarks = await prisma.model.count({
    where: { benchmarkResults: { some: {} } },
  });

  // Total pricing records count
  const totalPricingRecords = await prisma.pricingRecord.count();
  const totalEndpoints = await prisma.modelProviderEndpoint.count();

  console.log(`1.  Canonical Models:               ${totalModels} (Active: ${activeModels})`);
  console.log(`2.  Models with AI Lab Associations: ${modelsWithLabs}`);
  console.log(`3.  Models without AI Lab:          ${modelsWithoutLabs}`);
  console.log(`4.  Models with Provider Endpoints:  ${modelsWithEndpoints} (Online: ${modelsWithOnlineEndpoints})`);
  console.log(`5.  Pending Unresolved Candidates:  ${unresolvedCandidates}`);
  console.log(`6.  Models with Active Pricing:      ${modelsWithActivePricing}`);
  console.log(`7.  Models with Pricing History:    ${modelsWithPricingHistory}`);
  console.log(`8.  Models with Multi-Source Prices: ${modelsWithMultiplePricingSources}`);
  console.log(`9.  Models with Field Provenance:   ${modelsWithProvenance.length}`);
  console.log(`10. Models with Open Conflicts:     ${modelsWithOpenConflicts.length}`);
  console.log(`11. Total Benchmark Records:        ${totalBenchmarks}`);
  console.log(`    Total Benchmark Results:        ${totalBenchmarkResults}`);
  console.log(`    Models with Benchmark Results:  ${modelsWithBenchmarks}`);
  console.log(`---`);
  console.log(`Total Endpoints:                    ${totalEndpoints}`);
  console.log(`Total Pricing Records:              ${totalPricingRecords}`);
  console.log("=================================================\n");

  // Sample a model with endpoints to inspect actual fields
  const sampleModel = await prisma.model.findFirst({
    where: { endpoints: { some: { pricingRecords: { some: {} } } } },
    include: {
      labs: { include: { aiLab: true } },
      endpoints: {
        include: {
          provider: true,
          sourceMappings: { include: { source: true } },
          pricingRecords: { include: { source: true } },
        },
      },
    },
  });

  if (sampleModel) {
    console.log(`Sample Model: ${sampleModel.name} (${sampleModel.slug})`);
    console.log(`- Labs: ${sampleModel.labs.map((l) => `${l.aiLab.name} (${l.relationshipType})`).join(", ")}`);
    console.log(`- Endpoints count: ${sampleModel.endpoints.length}`);
    for (const ep of sampleModel.endpoints) {
      console.log(`  * Provider: ${ep.provider.name} | Status: ${ep.status} | Key: ${ep.endpointKey}`);
      console.log(`    Pricing records: ${ep.pricingRecords.length}`);
      for (const pr of ep.pricingRecords) {
        console.log(`      - Source: ${pr.source?.name} | In: $${pr.inputPricePerMillion} | Out: $${pr.outputPricePerMillion} | Observed: ${pr.observedAt.toISOString()}`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
