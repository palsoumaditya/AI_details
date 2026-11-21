import "./env";
import { prisma } from "../src/database/index";

async function runExplainPlans() {
  console.log("=========================================================");
  console.log("   ONEATLAS EXPLAIN (ANALYZE, BUFFERS) VERIFICATION");
  console.log("=========================================================\n");

  // Fetch OpenRouter provider ID and Google Lab ID for realistic parameter bindings
  const openrouter = await prisma.provider.findUnique({ where: { slug: "openrouter-provider" } });
  const googleLab = await prisma.aiLab.findUnique({ where: { slug: "google" } });

  const providerId = openrouter?.id ?? "cmwpx61m4000f20um1muhqth4";
  const labId = googleLab?.id ?? "cmwpx5zvd000020umw7yqqr6d";

  const queries = [
    {
      num: 1,
      name: "Provider directory filtered search and pagination",
      sql: `EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  p."id", p."slug", p."name", p."description", p."website", p."logoUrl", p."providerType"::text AS "providerType",
  COUNT(e."id")::int AS "endpointCount",
  COUNT(CASE WHEN e."status" = 'ONLINE' THEN 1 END)::int AS "onlineEndpointCount",
  COUNT(CASE WHEN e."status" = 'OFFLINE' THEN 1 END)::int AS "offlineEndpointCount",
  COUNT(CASE WHEN e."status" NOT IN ('ONLINE', 'OFFLINE') THEN 1 END)::int AS "unknownEndpointCount",
  COUNT(DISTINCT e."modelId")::int AS "modelCount",
  COUNT(DISTINCT CASE WHEN e."status" = 'ONLINE' THEN e."modelId" END)::int AS "onlineModelCount",
  MAX(e."lastSeenAt") AS "lastSeenAt"
FROM "providers" p
LEFT JOIN "model_provider_endpoints" e ON p."id" = e."providerId"
WHERE (p."name" ILIKE '%Open%' OR p."slug" ILIKE '%Open%')
GROUP BY p."id"
ORDER BY p."name" ASC, p."id" DESC
LIMIT 20 OFFSET 0;`,
    },
    {
      num: 2,
      name: "Provider directory endpoint-count sorting",
      sql: `EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  p."id", p."slug", p."name", p."description", p."website", p."logoUrl", p."providerType"::text AS "providerType",
  COUNT(e."id")::int AS "endpointCount",
  COUNT(CASE WHEN e."status" = 'ONLINE' THEN 1 END)::int AS "onlineEndpointCount",
  COUNT(CASE WHEN e."status" = 'OFFLINE' THEN 1 END)::int AS "offlineEndpointCount",
  COUNT(CASE WHEN e."status" NOT IN ('ONLINE', 'OFFLINE') THEN 1 END)::int AS "unknownEndpointCount",
  COUNT(DISTINCT e."modelId")::int AS "modelCount",
  COUNT(DISTINCT CASE WHEN e."status" = 'ONLINE' THEN e."modelId" END)::int AS "onlineModelCount",
  MAX(e."lastSeenAt") AS "lastSeenAt"
FROM "providers" p
LEFT JOIN "model_provider_endpoints" e ON p."id" = e."providerId"
GROUP BY p."id"
ORDER BY COUNT(e."id") DESC, p."name" ASC, p."id" DESC
LIMIT 20 OFFSET 0;`,
    },
    {
      num: 3,
      name: "Provider directory distinct-model-count sorting",
      sql: `EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  p."id", p."slug", p."name", p."description", p."website", p."logoUrl", p."providerType"::text AS "providerType",
  COUNT(e."id")::int AS "endpointCount",
  COUNT(CASE WHEN e."status" = 'ONLINE' THEN 1 END)::int AS "onlineEndpointCount",
  COUNT(CASE WHEN e."status" = 'OFFLINE' THEN 1 END)::int AS "offlineEndpointCount",
  COUNT(CASE WHEN e."status" NOT IN ('ONLINE', 'OFFLINE') THEN 1 END)::int AS "unknownEndpointCount",
  COUNT(DISTINCT e."modelId")::int AS "modelCount",
  COUNT(DISTINCT CASE WHEN e."status" = 'ONLINE' THEN e."modelId" END)::int AS "onlineModelCount",
  MAX(e."lastSeenAt") AS "lastSeenAt"
FROM "providers" p
LEFT JOIN "model_provider_endpoints" e ON p."id" = e."providerId"
GROUP BY p."id"
ORDER BY COUNT(DISTINCT e."modelId") DESC, p."name" ASC, p."id" DESC
LIMIT 20 OFFSET 0;`,
    },
    {
      num: 4,
      name: "Provider detail endpoint pagination with status filters",
      sql: `EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  e."id", e."endpointKey", e."name", e."status"::text AS "status",
  e."contextWindow", e."maxOutputTokens", e."inputModalities", e."outputModalities",
  e."capabilities", e."isModerated", e."lastSeenAt",
  m."id" AS "model_id", m."slug" AS "model_slug", m."name" AS "model_name", m."family" AS "model_family"
FROM "model_provider_endpoints" e
JOIN "models" m ON e."modelId" = m."id"
WHERE e."providerId" = '${providerId}' AND e."status" = 'ONLINE'
ORDER BY e."lastSeenAt" DESC NULLS LAST, e."id" DESC
LIMIT 20 OFFSET 0;`,
    },
    {
      num: 5,
      name: "Provider distinct-model aggregation",
      sql: `EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  COUNT(e."id")::int AS "endpointCount",
  COUNT(CASE WHEN e."status" = 'ONLINE' THEN 1 END)::int AS "onlineEndpointCount",
  COUNT(CASE WHEN e."status" = 'OFFLINE' THEN 1 END)::int AS "offlineEndpointCount",
  COUNT(CASE WHEN e."status" NOT IN ('ONLINE', 'OFFLINE') THEN 1 END)::int AS "unknownEndpointCount",
  COUNT(DISTINCT e."modelId")::int AS "modelCount",
  COUNT(DISTINCT CASE WHEN e."status" = 'ONLINE' THEN e."modelId" END)::int AS "onlineModelCount",
  MAX(e."lastSeenAt") AS "lastSeenAt"
FROM "model_provider_endpoints" e
WHERE e."providerId" = '${providerId}';`,
    },
    {
      num: 6,
      name: "Lab directory search and pagination",
      sql: `EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  l."id", l."slug", l."name", l."description", l."website", l."logoUrl", l."country",
  COUNT(DISTINCT ml."modelId")::int AS "modelCount",
  COUNT(DISTINCT CASE WHEN ml."relationshipType" = 'CREATOR' THEN ml."modelId" END)::int AS "creatorModelCount",
  COUNT(DISTINCT CASE WHEN ml."relationshipType" = 'PUBLISHER' THEN ml."modelId" END)::int AS "publisherModelCount",
  COUNT(DISTINCT CASE WHEN ml."relationshipType" = 'COLLABORATOR' THEN ml."modelId" END)::int AS "collaboratorModelCount"
FROM "ai_labs" l
LEFT JOIN "model_labs" ml ON l."id" = ml."aiLabId"
WHERE (l."name" ILIKE '%Google%' OR l."slug" ILIKE '%Google%')
GROUP BY l."id"
ORDER BY l."name" ASC, l."id" DESC
LIMIT 20 OFFSET 0;`,
    },
    {
      num: 7,
      name: "Lab directory distinct-model and role aggregation",
      sql: `EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  l."id", l."slug", l."name", l."description", l."website", l."logoUrl", l."country",
  COUNT(DISTINCT ml."modelId")::int AS "modelCount",
  COUNT(DISTINCT CASE WHEN ml."relationshipType" = 'CREATOR' THEN ml."modelId" END)::int AS "creatorModelCount",
  COUNT(DISTINCT CASE WHEN ml."relationshipType" = 'PUBLISHER' THEN ml."modelId" END)::int AS "publisherModelCount",
  COUNT(DISTINCT CASE WHEN ml."relationshipType" = 'COLLABORATOR' THEN ml."modelId" END)::int AS "collaboratorModelCount"
FROM "ai_labs" l
LEFT JOIN "model_labs" ml ON l."id" = ml."aiLabId"
GROUP BY l."id"
ORDER BY COUNT(DISTINCT ml."modelId") DESC, l."name" ASC, l."id" DESC
LIMIT 20 OFFSET 0;`,
    },
    {
      num: 8,
      name: "Lab detail distinct-model pagination",
      sql: `EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  m."id", m."slug", m."name", m."family", m."releaseDate", m."status"::text AS "status",
  m."isReasoning", m."isOpenWeight"
FROM "models" m
WHERE EXISTS (
  SELECT 1 FROM "model_labs" ml
  WHERE ml."aiLabId" = '${labId}' AND ml."modelId" = m."id"
)
ORDER BY m."releaseDate" DESC NULLS LAST, m."id" DESC
LIMIT 20 OFFSET 0;`,
    },
    {
      num: 9,
      name: "Lab detail family distribution aggregation",
      sql: `EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  m."family",
  COUNT(DISTINCT m."id")::int AS "modelCount"
FROM "models" m
JOIN "model_labs" ml ON m."id" = ml."modelId"
WHERE ml."aiLabId" = '${labId}'
GROUP BY m."family"
ORDER BY "modelCount" DESC, m."family" ASC NULLS LAST;`,
    },
  ];

  for (const q of queries) {
    console.log(`========================================================================`);
    console.log(`QUERY PLAN #${q.num}: ${q.name}`);
    console.log(`========================================================================`);
    try {
      const planRows = await prisma.$queryRawUnsafe<Array<{ "QUERY PLAN": string }>>(q.sql);
      const planText = planRows.map((r) => r["QUERY PLAN"]).join("\n");
      console.log(planText);
      console.log("\n");
    } catch (err) {
      console.error(`Error running plan #${q.num}:`, err);
    }
  }
}

runExplainPlans()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
