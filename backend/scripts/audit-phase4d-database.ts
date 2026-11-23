import "./env";
import { prisma } from "../src/database/index";

async function main() {
  console.log("=================================================");
  console.log("🔍 AI DETAILS LIVE DATABASE AUDIT FOR PHASE 4D");
  console.log("=================================================\n");

  // Providers
  const totalProviders = await prisma.provider.count();
  const providersWithEndpoints = await prisma.provider.count({
    where: { endpoints: { some: {} } },
  });
  const providersWithoutEndpoints = totalProviders - providersWithEndpoints;

  // Providers by type
  const providersByType = await prisma.provider.groupBy({
    by: ["providerType"],
    _count: { _all: true },
  });

  // Endpoints by status
  const endpointsByStatus = await prisma.modelProviderEndpoint.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const totalEndpoints = await prisma.modelProviderEndpoint.count();

  // Distinct canonical models with provider endpoints
  const endpointsWithModels = await prisma.modelProviderEndpoint.findMany({
    select: { modelId: true },
    distinct: ["modelId"],
  });
  const distinctModelsWithEndpoints = endpointsWithModels.length;

  // Distinct canonical models with ONLINE endpoints
  const onlineEndpointsWithModels = await prisma.modelProviderEndpoint.findMany({
    where: { status: "ONLINE" },
    select: { modelId: true },
    distinct: ["modelId"],
  });
  const distinctModelsWithOnlineEndpoints = onlineEndpointsWithModels.length;

  // AI Labs
  const totalLabs = await prisma.aiLab.count();
  const labsWithModels = await prisma.aiLab.count({
    where: { models: { some: {} } },
  });
  const labsWithoutModels = totalLabs - labsWithModels;

  // Distinct models associated with labs
  const modelLabLinks = await prisma.modelLab.findMany({
    select: { modelId: true },
    distinct: ["modelId"],
  });
  const distinctModelsWithLabs = modelLabLinks.length;

  // ModelLab relationship records grouped by role
  const modelLabRoles = await prisma.modelLab.groupBy({
    by: ["relationshipType"],
    _count: { _all: true },
  });

  const totalModelLabRecords = await prisma.modelLab.count();

  console.log("--- PROVIDER AUDIT ---");
  console.log(`Total Registered Providers:          ${totalProviders}`);
  console.log(`Providers with Endpoints:            ${providersWithEndpoints}`);
  console.log(`Providers without Endpoints:         ${providersWithoutEndpoints}`);
  console.log("Providers by Type:");
  for (const pt of providersByType) {
    console.log(`  - ${pt.providerType}: ${pt._count._all}`);
  }
  console.log(`Total Endpoints:                     ${totalEndpoints}`);
  console.log("Endpoints by Status:");
  for (const es of endpointsByStatus) {
    console.log(`  - ${es.status}: ${es._count._all}`);
  }
  console.log(`Distinct Models with Endpoints:       ${distinctModelsWithEndpoints}`);
  console.log(`Distinct Models with ONLINE Endpoints:${distinctModelsWithOnlineEndpoints}`);
  console.log("");

  console.log("--- AI LAB AUDIT ---");
  console.log(`Total AI Labs:                       ${totalLabs}`);
  console.log(`Labs with Model Associations:        ${labsWithModels}`);
  console.log(`Labs without Model Associations:     ${labsWithoutModels}`);
  console.log(`Distinct Models with Labs:           ${distinctModelsWithLabs}`);
  console.log(`Total ModelLab Links:                ${totalModelLabRecords}`);
  console.log("ModelLab Links by Role:");
  for (const r of modelLabRoles) {
    console.log(`  - ${r.relationshipType}: ${r._count._all}`);
  }
  console.log("=================================================\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
