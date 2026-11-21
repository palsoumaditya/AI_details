import "./env";
import { prisma } from "../src/database/index";

async function auditDatabase(): Promise<void> {
  console.log("🔍 =========================================================");
  console.log("   ONEATLAS DATABASE CATALOG & SCHEMA AUDIT (PHASE 4B)");
  console.log("=========================================================\n");

  // 1. Model counts
  const totalModels = await prisma.model.count();
  const activeModels = await prisma.model.count({ where: { status: "ACTIVE" } });
  const deprecatedModels = await prisma.model.count({ where: { status: "DEPRECATED" } });
  const experimentalModels = await prisma.model.count({ where: { status: "EXPERIMENTAL" } });

  console.log(`1. Total Canonical Models: ${totalModels}`);
  console.log(`2. Active Models: ${activeModels} (Deprecated: ${deprecatedModels}, Experimental: ${experimentalModels})`);

  // 3. Endpoints & Providers
  const totalEndpoints = await prisma.modelProviderEndpoint.count();
  const onlineEndpoints = await prisma.modelProviderEndpoint.count({ where: { status: "ONLINE" } });
  const totalProviders = await prisma.provider.count();
  const totalLabs = await prisma.aiLab.count();
  const modelLabAssociations = await prisma.modelLab.count();

  console.log(`3. Total Model-Provider Endpoints: ${totalEndpoints} (${onlineEndpoints} ONLINE)`);
  console.log(`4. Total Inference Providers: ${totalProviders}, Total AI Labs: ${totalLabs}`);
  console.log(`   Total Verified Model-to-Lab associations: ${modelLabAssociations}`);

  // Models with at least one verified AI lab association
  const modelsWithLab = await prisma.model.count({
    where: {
      labs: {
        some: {},
      },
    },
  });
  console.log(`7. Models with Verified AI Lab associations: ${modelsWithLab}`);

  // 5 & 6. Models with known vs unknown pricing
  const modelsWithPricing = await prisma.model.count({
    where: {
      endpoints: {
        some: {
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
  const modelsWithoutPricing = totalModels - modelsWithPricing;
  console.log(`5. Models with Known Pricing Records: ${modelsWithPricing}`);
  console.log(`6. Models with Unknown/No Pricing Records: ${modelsWithoutPricing}`);

  // 8. Models with benchmark results
  const modelsWithBenchmarks = await prisma.model.count({
    where: {
      benchmarkResults: {
        some: {},
      },
    },
  });
  console.log(`8. Models with Benchmark Results: ${modelsWithBenchmarks}`);

  // Inspect sample model provider distributions
  const modelEndpointDistributions = await prisma.model.findMany({
    take: 5,
    select: {
      slug: true,
      name: true,
      _count: {
        select: {
          endpoints: true,
          labs: true,
        },
      },
      endpoints: {
        select: {
          provider: { select: { slug: true } },
          pricingRecords: {
            take: 1,
            orderBy: { observedAt: "desc" },
            select: { inputPricePerMillion: true, outputPricePerMillion: true },
          },
        },
      },
    },
  });

  console.log("\nSample Model Distributions:");
  for (const m of modelEndpointDistributions) {
    console.log(` - ${m.name} (${m.slug}): ${m._count.endpoints} endpoints, ${m._count.labs} labs`);
    for (const ep of m.endpoints) {
      const p = ep.pricingRecords[0];
      console.log(`    ↳ Provider: ${ep.provider.slug}, Pricing: In=$${p?.inputPricePerMillion ?? "null"}, Out=$${p?.outputPricePerMillion ?? "null"}`);
    }
  }

  // Database indexes check
  console.log("\n9. Database Index Inspection on 'models' & related tables:");
  const indexes = await prisma.$queryRaw<Array<{ tablename: string; indexname: string; indexdef: string }>>`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename IN ('models', 'model_provider_endpoints', 'pricing_records', 'model_labs')
    ORDER BY tablename, indexname;
  `;

  for (const idx of indexes) {
    console.log(`   [${idx.tablename}] ${idx.indexname} -> ${idx.indexdef}`);
  }

  console.log("\n✅ Audit complete.");
}

auditDatabase().catch((e) => {
  console.error("Audit failed:", e);
  process.exit(1);
});
