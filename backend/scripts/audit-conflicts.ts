import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@oneatlas/database";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing connection string");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("===============================================================");
  console.log("   AI DETAILS DATA CONFLICTS AUDIT (Phase 3C.1)");
  console.log("===============================================================");

  const totalConflicts = await prisma.dataConflict.count();
  console.log(`\nTotal Persistent Data Conflicts:   ${totalConflicts}`);

  if (totalConflicts === 0) {
    console.log("\n[STATUS: PASS] Zero open data conflicts in database.");
    console.log("Cross-source metadata reconciliation rules applied successfully without active schema violations.");
    console.log("===============================================================");
    return;
  }

  // Breakdown by severity
  const bySeverity = await prisma.dataConflict.groupBy({
    by: ["severity"],
    _count: true,
  });

  console.log("\n--- 1. CONFLICTS BY SEVERITY ---");
  for (const group of bySeverity) {
    console.log(`  ${group.severity}: ${group._count}`);
  }

  // Breakdown by status
  const byStatus = await prisma.dataConflict.groupBy({
    by: ["status"],
    _count: true,
  });

  console.log("\n--- 2. CONFLICTS BY RESOLUTION STATUS ---");
  for (const group of byStatus) {
    console.log(`  ${group.status}: ${group._count}`);
  }

  // Breakdown by fieldKey
  const byField = await prisma.dataConflict.groupBy({
    by: ["fieldKey"],
    _count: true,
  });

  console.log("\n--- 3. AFFECTED FIELDS ---");
  for (const group of byField) {
    console.log(`  ${group.fieldKey}: ${group._count}`);
  }

  // Sample conflicts
  const conflicts = await prisma.dataConflict.findMany({
    take: 15,
    include: {
      sourceA: { select: { slug: true } },
      sourceB: { select: { slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log("\n--- 4. CONFLICT DETAILS (SAMPLE) ---");
  for (const c of conflicts) {
    console.log(
      `  [${c.severity}] [${c.status}] entity=${c.entityType} (${c.entityId}) field=${c.fieldKey}`
    );
    console.log(`    Source A (${c.sourceA.slug}): ${JSON.stringify(c.observedValueA)}`);
    console.log(`    Source B (${c.sourceB.slug}): ${JSON.stringify(c.observedValueB)}`);
    if (c.resolutionNotes) {
      console.log(`    Notes: ${c.resolutionNotes}`);
    }
  }

  console.log("\n===============================================================");
}

main()
  .catch((e) => {
    console.error("Conflict audit failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
