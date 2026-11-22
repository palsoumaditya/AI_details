import "./env";
import { prisma } from "../src/database/index";

async function runAudit() {
  console.log("=== PHASE 4D.1 DATABASE AUDIT FOR COUNT RECONCILIATION ===\n");

  // General counts
  const totalModels = await prisma.$queryRawUnsafe<any[]>(`SELECT count(*)::int AS count FROM "models"`);
  const modelsByStatus = await prisma.$queryRawUnsafe<any[]>(`SELECT "status", count(*)::int AS count FROM "models" GROUP BY "status"`);
  const totalProviders = await prisma.$queryRawUnsafe<any[]>(`SELECT count(*)::int AS count FROM "providers"`);
  const totalLabs = await prisma.$queryRawUnsafe<any[]>(`SELECT count(*)::int AS count FROM "ai_labs"`);

  console.log("--- GENERAL COUNTS ---");
  console.log(`Total Models: ${totalModels[0].count}`);
  console.log("Models by status:", modelsByStatus);
  console.log(`Total Providers: ${totalProviders[0].count}`);
  console.log(`Total Labs: ${totalLabs[0].count}\n`);

  // Provider Relationships
  console.log("--- PROVIDER RELATIONSHIPS ---");
  const totalEndpoints = await prisma.$queryRawUnsafe<any[]>(`SELECT count(*)::int AS count FROM "model_provider_endpoints"`);
  console.log(`1. Total provider endpoint records: ${totalEndpoints[0].count}`);

  const distinctModelsWithEndpoints = await prisma.$queryRawUnsafe<any[]>(
    `SELECT count(DISTINCT "modelId")::int AS count FROM "model_provider_endpoints"`
  );
  console.log(`2. Distinct canonical models associated with any endpoint: ${distinctModelsWithEndpoints[0].count}`);

  const distinctProvidersWithEndpoints = await prisma.$queryRawUnsafe<any[]>(
    `SELECT count(DISTINCT "providerId")::int AS count FROM "model_provider_endpoints"`
  );
  console.log(`3. Distinct providers associated with endpoints: ${distinctProvidersWithEndpoints[0].count}`);

  const endpointsGroupedByProvider = await prisma.$queryRawUnsafe<any[]>(
    `SELECT p."id", p."slug", p."name", count(e."id")::int AS endpoint_count, count(DISTINCT e."modelId")::int AS distinct_model_count
     FROM "providers" p
     LEFT JOIN "model_provider_endpoints" e ON p."id" = e."providerId"
     GROUP BY p."id", p."slug", p."name"
     ORDER BY endpoint_count DESC`
  );
  console.log("4 & 5. Endpoints & distinct models grouped by provider:");
  for (const row of endpointsGroupedByProvider) {
    console.log(`   Provider: ${row.slug} (${row.name}) -> Endpoints: ${row.endpoint_count}, Distinct Models: ${row.distinct_model_count}`);
  }

  const endpointsByStatus = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "status", count(*)::int AS endpoint_count, count(DISTINCT "modelId")::int AS distinct_model_count
     FROM "model_provider_endpoints"
     GROUP BY "status"
     ORDER BY "status"`
  );
  console.log("6 & 7. Endpoint count & distinct model count grouped by persisted status:", endpointsByStatus);

  const duplicateEndpointModelCombos = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "modelId", "providerId", count(*)::int AS cnt
     FROM "model_provider_endpoints"
     GROUP BY "modelId", "providerId"
     HAVING count(*) > 1`
  );
  console.log(`8. Duplicate endpoint/model combinations (same provider & model, multiple endpoints): ${duplicateEndpointModelCombos.length}`);
  if (duplicateEndpointModelCombos.length > 0) {
    console.log("   Duplicate rows:", duplicateEndpointModelCombos);
  }

  const endpointsWithMissingOrInactiveModels = await prisma.$queryRawUnsafe<any[]>(
    `SELECT e."id", e."endpointKey", e."modelId", m."status" AS model_status
     FROM "model_provider_endpoints" e
     LEFT JOIN "models" m ON e."modelId" = m."id"
     WHERE m."id" IS NULL OR m."status" != 'ACTIVE'`
  );
  console.log(`9. Endpoints referencing missing or non-ACTIVE models: ${endpointsWithMissingOrInactiveModels.length}`);
  if (endpointsWithMissingOrInactiveModels.length > 0) {
    console.log("   Rows:", endpointsWithMissingOrInactiveModels);
  }

  // AI Lab Relationships
  console.log("\n--- AI LAB RELATIONSHIPS ---");
  const totalModelLab = await prisma.$queryRawUnsafe<any[]>(`SELECT count(*)::int AS count FROM "model_labs"`);
  console.log(`1. Total ModelLab records: ${totalModelLab[0].count}`);

  const distinctModelsWithLab = await prisma.$queryRawUnsafe<any[]>(
    `SELECT count(DISTINCT "modelId")::int AS count FROM "model_labs"`
  );
  console.log(`2. Distinct canonical models associated with at least one lab: ${distinctModelsWithLab[0].count}`);

  const distinctLabsWithModel = await prisma.$queryRawUnsafe<any[]>(
    `SELECT count(DISTINCT "aiLabId")::int AS count FROM "model_labs"`
  );
  console.log(`3. Distinct labs associated with at least one model: ${distinctLabsWithModel[0].count}`);

  const relationshipsByRole = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "relationshipType", count(*)::int AS record_count, count(DISTINCT "modelId")::int AS distinct_model_count
     FROM "model_labs"
     GROUP BY "relationshipType"
     ORDER BY "relationshipType"`
  );
  console.log("4 & 5. Relationship records and distinct models grouped by role:", relationshipsByRole);

  const modelsByLab = await prisma.$queryRawUnsafe<any[]>(
    `SELECT l."id", l."slug", l."name", count(ml."id")::int AS record_count, count(DISTINCT ml."modelId")::int AS distinct_model_count
     FROM "ai_labs" l
     LEFT JOIN "model_labs" ml ON l."id" = ml."aiLabId"
     GROUP BY l."id", l."slug", l."name"
     ORDER BY distinct_model_count DESC`
  );
  console.log("6. Distinct model count grouped by lab:");
  for (const row of modelsByLab) {
    console.log(`   Lab: ${row.slug} (${row.name}) -> Records: ${row.record_count}, Distinct Models: ${row.distinct_model_count}`);
  }

  const multiRoleSameModelLab = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "modelId", "aiLabId", count(*)::int AS role_count, array_agg("relationshipType"::text) AS roles
     FROM "model_labs"
     GROUP BY "modelId", "aiLabId"
     HAVING count(*) > 1`
  );
  console.log(`7. Relationship records where same model and lab have multiple roles: ${multiRoleSameModelLab.length}`);
  if (multiRoleSameModelLab.length > 0) {
    console.log("   Rows:", multiRoleSameModelLab);
  }

  const duplicateModelLabRole = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "modelId", "aiLabId", "relationshipType", count(*)::int AS cnt
     FROM "model_labs"
     GROUP BY "modelId", "aiLabId", "relationshipType"
     HAVING count(*) > 1`
  );
  console.log(`8. Duplicate model/lab/role relationships: ${duplicateModelLabRole.length}`);

  const orphanedModelLab = await prisma.$queryRawUnsafe<any[]>(
    `SELECT ml."id", ml."modelId", ml."aiLabId"
     FROM "model_labs" ml
     LEFT JOIN "models" m ON ml."modelId" = m."id"
     LEFT JOIN "ai_labs" l ON ml."aiLabId" = l."id"
     WHERE m."id" IS NULL OR l."id" IS NULL`
  );
  console.log(`9. Orphaned ModelLab references: ${orphanedModelLab.length}`);
}

runAudit()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
