import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@oneatlas/database";
import { ModelsDevSyncService } from "../src/integrations/modelsdev";

/**
 * AI DETAILS Models.dev Synchronization CLI
 * Usage:
 *   npx tsx scripts/sync-modelsdev.ts [options]
 *
 * Options:
 *   --dry-run          Simulate synchronization without writing to database
 *   --apply            Apply changes to live database
 *   --limit <number>   Limit the number of records to process
 *   --models-only      Only synchronize canonical models
 *   --providers-only   Only synchronize providers
 *   --endpoints-only   Only synchronize provider endpoints & pricing
 *   --help             Show help documentation
 */

function printHelp() {
  console.log(`
=========================================================
   AI DETAILS MODELs.DEV SYNCHRONIZATION CLI
=========================================================

Usage:
  npx tsx scripts/sync-modelsdev.ts [options]

Commands & Options:
  --dry-run             Run synchronization in simulation mode (no DB writes).
  --apply               Apply synchronization and persist records into PostgreSQL.
  --limit <n>           Limit number of records processed (e.g. --limit 20).
  --models-only         Only synchronize canonical models from models.json.
  --providers-only      Only synchronize providers from api.json.
  --endpoints-only      Only synchronize provider endpoints & pricing.
  --help                Display this documentation.

Examples:
  npx tsx scripts/sync-modelsdev.ts --dry-run --limit 10
  npx tsx scripts/sync-modelsdev.ts --apply --limit 20
  npx tsx scripts/sync-modelsdev.ts --apply --models-only
  npm run sync:modelsdev -- --apply --limit 20
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
  const modelsOnly = args.includes("--models-only");
  const providersOnly = args.includes("--providers-only");
  const endpointsOnly = args.includes("--endpoints-only");

  if (!isDryRun && !isApply) {
    console.error("❌ Error: Must specify either --dry-run or --apply.");
    printHelp();
    process.exit(1);
  }

  const limitIndex = args.indexOf("--limit");
  let limit: number | undefined;
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    const parsed = parseInt(args[limitIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = parsed;
    }
  }

  console.log(`
=========================================================
   AI DETAILS MODELs.DEV SYNCHRONIZATION CLI
=========================================================
• Mode:               ${isDryRun ? "DRY RUN (No database writes)" : "APPLY (Persisting to PostgreSQL)"}
• Model Limit:        ${limit ?? "All"}
• Filter:             ${modelsOnly ? "Models Only" : providersOnly ? "Providers Only" : endpointsOnly ? "Endpoints Only" : "Full Catalog"}
=========================================================
`);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ Error: DATABASE_URL environment variable is missing.");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const syncService = new ModelsDevSyncService(prisma);
    const result = await syncService.sync({
      dryRun: isDryRun,
      limit,
      modelsOnly,
      providersOnly,
      endpointsOnly,
    });

    console.log(`
=========================================================
   SYNCHRONIZATION EXECUTION SUMMARY
=========================================================
• Status:                  ${result.status}
• Execution Time:          ${result.durationMs}ms
• Models Processed:        ${result.stats.modelsProcessed}
• Models Inserted:         ${result.stats.modelsInserted} ${isDryRun ? "(Simulated)" : ""}
• Models Updated:          ${result.stats.modelsUpdated}
• Models Unchanged:        ${result.stats.modelsUnchanged}
• Models Skipped:          ${result.stats.modelsSkipped}
• Models Failed:           ${result.stats.modelsFailed}
---------------------------------------------------------
• Providers Processed:     ${result.stats.providersProcessed}
• Providers Inserted:      ${result.stats.providersInserted} ${isDryRun ? "(Simulated)" : ""}
• Providers Updated:       ${result.stats.providersUpdated}
• Providers Unchanged:     ${result.stats.providersUnchanged}
• Providers Skipped:       ${result.stats.providersSkipped}
• Providers Failed:        ${result.stats.providersFailed}
---------------------------------------------------------
• Endpoints Processed:     ${result.stats.endpointsProcessed}
• Endpoints Inserted:      ${result.stats.endpointsInserted} ${isDryRun ? "(Simulated)" : ""}
• Endpoints Updated:       ${result.stats.endpointsUpdated}
• Endpoints Unchanged:     ${result.stats.endpointsUnchanged}
• Endpoints Unresolved:    ${result.stats.endpointsUnresolved}
• Endpoints Failed:        ${result.stats.endpointsFailed}
---------------------------------------------------------
• Pricing Records Created: ${result.stats.pricingRecordsCreated} ${isDryRun ? "(Simulated)" : ""}
• Raw Snapshots Created:   ${result.stats.rawSnapshotsCreated}
=========================================================
`);

    if (result.status === "FAILED") {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Synchronization failed with unexpected error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
