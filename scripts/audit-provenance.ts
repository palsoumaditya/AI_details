import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing connection string");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("===============================================================");
  console.log("   ONEATLAS FIELD PROVENANCE AUDIT (Phase 3C.1)");
  console.log("===============================================================");

  const totalProvenance = await prisma.fieldProvenance.count();
  console.log(`\nTotal Field Provenance Records:    ${totalProvenance}`);

  if (totalProvenance === 0) {
    console.log("No field provenance records currently stored.");
    console.log("Run 'npx tsx scripts/reconcile-openrouter-endpoints.ts' to populate provenance.");
    return;
  }

  // Breakdown by entity type
  const byEntityType = await prisma.fieldProvenance.groupBy({
    by: ["entityType"],
    _count: true,
  });

  console.log("\n--- 1. PROVENANCE BY ENTITY TYPE ---");
  for (const group of byEntityType) {
    console.log(`  ${group.entityType}: ${group._count} records`);
  }

  // Breakdown by fieldKey
  const byFieldKey = await prisma.fieldProvenance.groupBy({
    by: ["fieldKey"],
    _count: true,
  });

  console.log("\n--- 2. PROVENANCE BY FIELD KEY ---");
  for (const group of byFieldKey) {
    console.log(`  ${group.fieldKey.padEnd(20)}: ${group._count} records`);
  }

  // Breakdown by source
  const sources = await prisma.externalSource.findMany();
  const sourceNameMap = new Map(sources.map((s) => [s.id, s.name]));

  const bySource = await prisma.fieldProvenance.groupBy({
    by: ["sourceId"],
    _count: true,
  });

  console.log("\n--- 3. PROVENANCE BY AUTHORITATIVE SOURCE ---");
  for (const group of bySource) {
    const sName = sourceNameMap.get(group.sourceId) || group.sourceId;
    console.log(`  ${sName.padEnd(20)}: ${group._count} records`);
  }

  // Sample records
  const sample = await prisma.fieldProvenance.findMany({
    take: 10,
    orderBy: { selectedAt: "desc" },
    include: { source: { select: { slug: true } } },
  });

  console.log("\n--- 4. RECENT FIELD PROVENANCE ENTRIES (SAMPLE) ---");
  for (const record of sample) {
    const valStr = JSON.stringify(record.selectedValue);
    console.log(
      `  [${record.entityType}] id=${record.entityId.slice(0, 10)}... | field=${record.fieldKey} | val=${valStr} | source=${record.source.slug} | conf=${record.confidence}`
    );
  }

  console.log("\n===============================================================");
}

main()
  .catch((e) => {
    console.error("Provenance audit failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
