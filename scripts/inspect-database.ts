import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString =
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("Missing connection string");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log("=========================================================");
  console.log("   ONEATLAS DATABASE & IDENTITY INSPECTION REPORT");
  console.log("=========================================================\n");

  try {
    // 1. Entity Counts
    const modelCount = await prisma.model.count();
    const modelMappingCount = await prisma.modelSourceMapping.count();
    const providerCount = await prisma.provider.count();
    const providerMappingCount = await prisma.providerSourceMapping.count();
    const endpointCount = await prisma.modelProviderEndpoint.count();
    const endpointMappingCount = await prisma.endpointSourceMapping.count();
    const benchmarkCount = await prisma.benchmark.count();
    const benchmarkResultCount = await prisma.benchmarkResult.count();
    const labCount = await prisma.aiLab.count();
    const modelLabCount = await prisma.modelLab.count();
    const externalSourceCount = await prisma.externalSource.count();
    const syncRunCount = await prisma.syncRun.count();

    console.log("1. CORE ENTITY COUNTS:");
    console.log(`- Canonical Models:           ${modelCount}`);
    console.log(`- Model Source Mappings:      ${modelMappingCount}`);
    console.log(`- Canonical Providers:        ${providerCount}`);
    console.log(`- Provider Source Mappings:   ${providerMappingCount}`);
    console.log(`- Model Provider Endpoints:   ${endpointCount}`);
    console.log(`- Endpoint Source Mappings:   ${endpointMappingCount}`);
    console.log(`- AI Labs:                    ${labCount}`);
    console.log(`- Model Lab Relationships:    ${modelLabCount}`);
    console.log(`- Benchmark Definitions:      ${benchmarkCount}`);
    console.log(`- Benchmark Results:          ${benchmarkResultCount}`);
    console.log(`- External Sources:           ${externalSourceCount}`);
    console.log(`- Sync Runs:                  ${syncRunCount}`);

    // 2. Pricing records grouped by source
    const pricingBySource = await prisma.pricingRecord.groupBy({
      by: ["sourceId"],
      _count: { id: true },
    });
    const sources = await prisma.externalSource.findMany();
    const sourceMap = new Map(sources.map((s) => [s.id, s.slug]));

    console.log("\n2. PRICING RECORDS GROUPED BY SOURCE:");
    for (const group of pricingBySource) {
      const slug = group.sourceId ? sourceMap.get(group.sourceId) ?? group.sourceId : "NULL";
      console.log(`- Source: ${slug} (${group.sourceId}): ${group._count.id} records`);
    }

    // 3. Raw source records grouped by source and entityType
    const rawBySource = await prisma.rawSourceRecord.groupBy({
      by: ["sourceId", "entityType"],
      _count: { id: true },
    });
    console.log("\n3. RAW SOURCE RECORDS GROUPED BY SOURCE & ENTITY TYPE:");
    for (const group of rawBySource) {
      const slug = sourceMap.get(group.sourceId) ?? group.sourceId;
      console.log(`- Source: ${slug}, Entity: ${group.entityType}: ${group._count.id} records`);
    }

    // 4. Sources list
    console.log("\n4. EXTERNAL SOURCES:");
    for (const s of sources) {
      console.log(`- ${s.slug} (ID: ${s.id}, Name: ${s.name})`);
    }

    // 5. Model Source Mappings breakdown by source
    const modelMappingsBySource = await prisma.modelSourceMapping.groupBy({
      by: ["sourceId"],
      _count: { id: true },
    });
    console.log("\n5. MODEL SOURCE MAPPINGS BY SOURCE:");
    for (const group of modelMappingsBySource) {
      const slug = sourceMap.get(group.sourceId) ?? group.sourceId;
      console.log(`- Source: ${slug}: ${group._count.id} mappings`);
    }

    // 6. Provider Source Mappings breakdown by source
    const providerMappingsBySource = await prisma.providerSourceMapping.groupBy({
      by: ["sourceId"],
      _count: { id: true },
    });
    console.log("\n6. PROVIDER SOURCE MAPPINGS BY SOURCE:");
    for (const group of providerMappingsBySource) {
      const slug = sourceMap.get(group.sourceId) ?? group.sourceId;
      console.log(`- Source: ${slug}: ${group._count.id} mappings`);
    }

    // 7. Check models with multiple source mappings
    const modelsWithMultipleMappings = await prisma.$queryRaw<
      Array<{ modelId: string; name: string; slug: string; count: bigint; sources: string }>
    >`
      SELECT m.id as "modelId", m.name, m.slug, COUNT(msm.id) as count,
             STRING_AGG(es.slug || ':' || msm."externalModelId", ', ') as sources
      FROM models m
      JOIN model_source_mappings msm ON msm."modelId" = m.id
      JOIN external_sources es ON es.id = msm."sourceId"
      GROUP BY m.id, m.name, m.slug
      HAVING COUNT(msm.id) > 1
    `;
    console.log("\n7. MODELS WITH MULTIPLE SOURCE MAPPINGS (Reconciled Models):", modelsWithMultipleMappings.length);
    for (const m of modelsWithMultipleMappings) {
      console.log(`- [${m.slug}] "${m.name}": mapped to [${m.sources}] (Count: ${m.count})`);
    }

    // 8. Potential duplicate canonical models (by similar slug or name)
    const allModels = await prisma.model.findMany({
      select: { id: true, slug: true, name: true, family: true, contextWindow: true },
    });
    console.log("\n8. ALL CANONICAL MODELS IN DATABASE:", allModels.length);
    for (const m of allModels) {
      console.log(`- ID: ${m.id} | Slug: ${m.slug.padEnd(30)} | Family: ${(m.family || "N/A").padEnd(15)} | Context: ${m.contextWindow ?? "N/A"} | Name: ${m.name}`);
    }

    // 9. Check duplicate model slugs
    const slugCounts = new Map<string, number>();
    for (const m of allModels) {
      slugCounts.set(m.slug, (slugCounts.get(m.slug) || 0) + 1);
    }
    const duplicateSlugs = Array.from(slugCounts.entries()).filter(([, c]) => c > 1);
    console.log("\n9. DUPLICATE MODEL SLUGS (Unique constraint check):", duplicateSlugs.length);

    // 10. Check providers and provider mappings
    const allProviders = await prisma.provider.findMany({
      include: {
        sourceMappings: {
          include: { source: true },
        },
      },
    });
    console.log("\n10. ALL CANONICAL PROVIDERS & MAPPINGS:", allProviders.length);
    for (const p of allProviders) {
      const mappingStr = p.sourceMappings
        .map((sm) => `${sm.source.slug}:${sm.externalProviderId}`)
        .join(", ");
      console.log(`- [${p.slug}] "${p.name}" (Type: ${p.providerType}) -> [${mappingStr || "NO MAPPING"}]`);
    }

    // 11. Endpoints without source mappings
    const endpointsWithoutMapping = await prisma.modelProviderEndpoint.findMany({
      where: {
        sourceMappings: { none: {} },
      },
      include: { model: true, provider: true },
    });
    console.log("\n11. ENDPOINTS WITHOUT SOURCE MAPPINGS:", endpointsWithoutMapping.length);
    for (const ep of endpointsWithoutMapping) {
      console.log(`- Endpoint ID: ${ep.id}, Model: ${ep.model.slug}, Provider: ${ep.provider.slug}, Key: ${ep.endpointKey}`);
    }

    // 12. Endpoints without valid canonical models
    const endpointsOrphaned = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT e.id FROM model_provider_endpoints e
      LEFT JOIN models m ON m.id = e."modelId"
      WHERE m.id IS NULL
    `;
    console.log("\n12. ENDPOINTS WITHOUT VALID CANONICAL MODELS:", endpointsOrphaned.length);

    // 13. Models with missing creator/lab relationships
    const modelsWithoutLab = await prisma.model.findMany({
      where: {
        labs: { none: {} },
      },
      select: { id: true, slug: true, name: true },
    });
    console.log("\n13. MODELS MISSING AI LAB RELATIONSHIP:", modelsWithoutLab.length);
    for (const m of modelsWithoutLab) {
      console.log(`- Missing lab: [${m.slug}] "${m.name}"`);
    }

    // 14. Check latest sync runs
    const latestSyncRuns = await prisma.syncRun.findMany({
      take: 5,
      orderBy: { startedAt: "desc" },
      include: { source: true },
    });
    console.log("\n14. RECENT SYNC RUNS:");
    for (const sr of latestSyncRuns) {
      console.log(`- Run ${sr.id}: Source: ${sr.source.slug}, Status: ${sr.status}, Trigger: ${sr.triggerType}, Processed: ${sr.itemsProcessed}, Inserted: ${sr.itemsInserted}, Updated: ${sr.itemsUpdated}, Unchanged: ${sr.itemsUnchanged}, Failed: ${sr.itemsFailed}, Started: ${sr.startedAt.toISOString()}`);
    }

  } catch (error) {
    console.error("Inspection error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
