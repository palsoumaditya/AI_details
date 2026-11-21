import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { OpenRouterSyncService } from "../src/server/integrations/openrouter/sync.service";
import { OpenRouterClient } from "../src/server/integrations/openrouter/client";

/**
 * CLI script to execute OpenRouter synchronization.
 *
 * Usage:
 *   npx tsx scripts/sync-openrouter.ts --dry-run --limit 10
 *   npx tsx scripts/sync-openrouter.ts --apply --limit 20
 *   npx tsx scripts/sync-openrouter.ts --apply
 */

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isApply = args.includes("--apply");
  const includeEndpoints = args.includes("--endpoints");

  let limit: number | undefined;
  const limitIndex = args.indexOf("--limit");
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    const parsed = parseInt(args[limitIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = parsed;
    }
  }

  if (!isDryRun && !isApply) {
    console.error("❌ Error: Must specify either --dry-run or --apply.");
    console.log("Usage: npx tsx scripts/sync-openrouter.ts [--dry-run | --apply] [--limit <number>] [--endpoints]");
    process.exit(1);
  }

  console.log("=========================================================");
  console.log("   ONEATLAS OPENROUTER SYNCHRONIZATION CLI");
  console.log("=========================================================");
  console.log(`• Mode:               ${isDryRun ? "DRY RUN (No database writes)" : "APPLY (Persisting to PostgreSQL)"}`);
  console.log(`• Model Limit:        ${limit ? limit : "Full Catalog (All Models)"}`);
  console.log(`• Include Endpoints:  ${includeEndpoints ? "Yes" : "No"}`);
  console.log(`• Auth Configured:    API Key: ${Boolean(process.env.OPENROUTER_API_KEY)}, Management Key: ${Boolean(process.env.OPENROUTER_MANAGEMENT_KEY)}`);
  console.log("=========================================================\n");

  const connectionString =
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/oneatlas?schema=public";

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  const client = new OpenRouterClient();
  const syncService = new OpenRouterSyncService(prisma, client);

  try {
    const result = await syncService.sync({
      dryRun: isDryRun,
      limit,
      includeEndpoints,
    });

    console.log("\n=========================================================");
    console.log("   SYNCHRONIZATION EXECUTION SUMMARY");
    console.log("=========================================================");
    console.log(`• Status:                  ${result.status}`);
    console.log(`• Execution Time:          ${result.durationMs}ms`);
    console.log(`• Models Processed:        ${result.modelsProcessed}`);
    console.log(`• Models Inserted:         ${result.modelsInserted}`);
    console.log(`• Models Updated:          ${result.modelsUpdated}`);
    console.log(`• Providers Processed:     ${result.providersProcessed}`);
    console.log(`• Providers Inserted:      ${result.providersInserted}`);
    console.log(`• Providers Updated:       ${result.providersUpdated}`);
    console.log(`• Endpoints Processed:     ${result.endpointsProcessed}`);
    console.log(`• Endpoints Inserted:      ${result.endpointsInserted}`);
    console.log(`• Pricing Records Created: ${result.pricingRecordsCreated}`);
    console.log(`• Raw Snapshots Created:   ${result.rawRecordsCreated}`);

    if (result.errors.length > 0) {
      console.log("\n⚠️ Notices & Warnings:");
      for (const err of result.errors) {
        console.log(`  - ${err}`);
      }
    }

    if (result.status === "FAILED") {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("❌ Fatal synchronization failure:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
