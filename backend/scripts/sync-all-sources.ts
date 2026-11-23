import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@oneatlas/database";
import { IngestionCoordinator } from "../src/ingestion/coordinator/coordinator";
import { AdapterRegistry } from "../src/ingestion/coordinator/adapter-registry";
import { OpenRouterIngestionAdapter } from "../src/integrations/openrouter/adapter";
import { ModelsDevIngestionAdapter } from "../src/integrations/modelsdev/adapter";
import type { IngestionStage, IngestionExecutionMode } from "../src/ingestion/contracts/types";

function printHelp() {
  console.log(`
AI Details — Unified Shared Ingestion Coordinator CLI
======================================================
Usage:
  npm run sync:all -- [options]

Modes (Required — Choose exactly one):
  --dry-run             Simulate synchronization without modifying database records
  --apply               Execute live catalog mutations (acquires global advisory lock)

Scope (Required — Choose exactly one):
  --full                Synchronize unrestricted complete catalog
  --limit <number>      Process only a bounded sample of records per source (e.g. --limit 20)

Source Selection:
  --sources <list>      Comma-separated source slugs (default: openrouter,modelsdev)
                        Available: openrouter, modelsdev

Stage Selection (Optional — Choose at most one):
  --models-only         Ingest only canonical model metadata
  --providers-only      Ingest only provider directories
  --endpoints-only      Ingest only provider-specific endpoints & pricing

Formatting:
  --json                Output execution summary as raw JSON
  --help, -h            Show this help reference

Examples:
  npm run sync:all -- --dry-run --full
  npm run sync:all -- --dry-run --sources openrouter,modelsdev --limit 10
  npm run sync:all -- --apply --sources openrouter,modelsdev --limit 10
  npm run sync:all -- --apply --full
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const isDryRun = args.includes("--dry-run");
  const isApply = args.includes("--apply");
  const isFull = args.includes("--full");
  const isJson = args.includes("--json");
  const modelsOnly = args.includes("--models-only");
  const providersOnly = args.includes("--providers-only");
  const endpointsOnly = args.includes("--endpoints-only");

  // Parse limit
  let limit: number | undefined;
  const limitIdx = args.indexOf("--limit");
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    const parsed = parseInt(args[limitIdx + 1], 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = parsed;
    }
  }

  // Parse sources
  let requestedSources: string[] = ["modelsdev", "openrouter"];
  const sourcesIdx = args.indexOf("--sources");
  if (sourcesIdx !== -1 && args[sourcesIdx + 1]) {
    requestedSources = args[sourcesIdx + 1]
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  // Validation
  if (!isDryRun && !isApply) {
    console.error("Error: You must explicitly specify execution mode: either '--dry-run' or '--apply'.");
    process.exit(1);
  }

  if (isDryRun && isApply) {
    console.error("Error: Contradictory flags: '--dry-run' and '--apply' cannot be used together.");
    process.exit(1);
  }

  if (!isFull && limit === undefined) {
    console.error("Error: You must specify scope: either '--full' for complete catalog or '--limit <n>' for bounded sample.");
    process.exit(1);
  }

  if (isFull && limit !== undefined) {
    console.error("Error: Contradictory flags: '--full' and '--limit' cannot be combined.");
    process.exit(1);
  }

  const stageCount = [modelsOnly, providersOnly, endpointsOnly].filter(Boolean).length;
  if (stageCount > 1) {
    console.error("Error: Contradictory stage flags: specify at most one of '--models-only', '--providers-only', or '--endpoints-only'.");
    process.exit(1);
  }

  let stage: IngestionStage = "ALL";
  if (modelsOnly) stage = "MODELS_ONLY";
  else if (providersOnly) stage = "PROVIDERS_ONLY";
  else if (endpointsOnly) stage = "ENDPOINTS_ONLY";

  const mode: IngestionExecutionMode = isApply ? "APPLY" : "DRY_RUN";

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Error: Missing database connection string in environment.");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const registry = new AdapterRegistry();
    registry.register(new ModelsDevIngestionAdapter(prisma));
    registry.register(new OpenRouterIngestionAdapter(prisma));

    const coordinator = new IngestionCoordinator(prisma, registry);

    if (!isJson) {
      console.log("===============================================================");
      console.log("   AI DETAILS SHARED DATA INGESTION COORDINATOR (Phase 3D)");
      console.log(`   Mode:     ${mode}`);
      console.log(`   Scope:    ${isFull ? "FULL COMPLETE CATALOG" : `Bounded limit = ${limit}`}`);
      console.log(`   Sources:  ${requestedSources.join(", ")}`);
      console.log(`   Stage:    ${stage}`);
      console.log("===============================================================\n");
    }

    const result = await coordinator.run({
      sources: requestedSources,
      mode,
      stage,
      limit,
    });

    if (isJson) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log("\n===============================================================");
    console.log(`   EXECUTION SUMMARY — Status: [${result.status}]`);
    console.log(`   Batch ID:    ${result.batchId}`);
    console.log(`   Duration:    ${(result.durationMs / 1000).toFixed(2)}s`);
    console.log("---------------------------------------------------------------");
    console.log("SOURCE BREAKDOWN:");
    for (const [slug, src] of Object.entries(result.sources)) {
      console.log(`\n  Source: [${slug.toUpperCase()}] — Status: ${src.status}`);
      console.log(`    Models:    Processed=${src.modelsProcessed} | Inserted=${src.modelsInserted} | Updated=${src.modelsUpdated} | Unchanged=${src.modelsUnchanged}`);
      console.log(`    Providers: Processed=${src.providersProcessed} | Inserted=${src.providersInserted} | Updated=${src.providersUpdated} | Unchanged=${src.providersUnchanged}`);
      console.log(`    Endpoints: Processed=${src.endpointsProcessed} | Inserted=${src.endpointsInserted} | Updated=${src.endpointsUpdated} | Unchanged=${src.endpointsUnchanged} | Unresolved=${src.endpointsUnresolved}`);
      console.log(`    Pricing:   Created=${src.pricingRecordsCreated} | Raw Snapshots=${src.rawRecordsCreated} | Conflicts=${src.conflictsDetected}`);
      if (src.errors.length > 0) {
        console.log(`    Errors:    ${src.errors.join("; ")}`);
      }
    }

    console.log("\n---------------------------------------------------------------");
    console.log("AGGREGATE COUNTERS:");
    const agg = result.aggregateCounters;
    console.log(`  Total Models Processed:     ${agg.totalModelsProcessed}`);
    console.log(`  Total Models Inserted:      ${agg.totalModelsInserted}`);
    console.log(`  Total Models Updated:       ${agg.totalModelsUpdated}`);
    console.log(`  Total Models Unchanged:     ${agg.totalModelsUnchanged}`);
    console.log(`  Total Providers Inserted:   ${agg.totalProvidersInserted}`);
    console.log(`  Total Endpoints Inserted:   ${agg.totalEndpointsInserted}`);
    console.log(`  Total Endpoints Unresolved: ${agg.totalEndpointsUnresolved}`);
    console.log(`  Total Pricing Snapshots:    ${agg.totalPricingRecordsCreated}`);
    console.log(`  Total Raw Snapshots:        ${agg.totalRawRecordsCreated}`);
    console.log("===============================================================");

    if (result.status === "FAILED") {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("\n[FATAL ERROR]", err);
  process.exit(1);
});
