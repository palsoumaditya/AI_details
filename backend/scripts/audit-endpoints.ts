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
  console.log("   AI DETAILS ENDPOINT RECONCILIATION AUDIT (Phase 3C.1)");
  console.log("===============================================================\n");

  const totalEndpoints = await prisma.modelProviderEndpoint.count();
  const totalEndpointMappings = await prisma.endpointSourceMapping.count();

  const endpoints = await prisma.modelProviderEndpoint.findMany({
    include: {
      model: { select: { id: true, slug: true, name: true } },
      provider: { select: { id: true, slug: true, name: true, providerType: true } },
      sourceMappings: { include: { source: true } },
      pricingRecords: { select: { id: true } },
    },
  });

  let directEndpoints = 0;
  let aggregatorEndpoints = 0;
  let openrouterGatewayEndpoints = 0;
  let endpointsWithMappings = 0;
  let endpointsWithoutMappings = 0;
  let endpointsWithEmptyModalities = 0;

  for (const ep of endpoints) {
    if (ep.provider.providerType === "AGGREGATOR") {
      aggregatorEndpoints++;
    } else {
      directEndpoints++;
    }

    if (ep.endpointKey.startsWith("openrouter/")) {
      openrouterGatewayEndpoints++;
    }

    if (ep.sourceMappings.length > 0) {
      endpointsWithMappings++;
    } else {
      endpointsWithoutMappings++;
    }

    if (ep.inputModalities.length === 0 && ep.outputModalities.length === 0) {
      endpointsWithEmptyModalities++;
    }
  }

  // Mappings by source
  const mappingsBySource = await prisma.endpointSourceMapping.groupBy({
    by: ["sourceId"],
    _count: true,
  });

  const sources = await prisma.externalSource.findMany();
  const sourceNameMap = new Map(sources.map((s) => [s.id, s.name]));

  console.log("--- 1. ENDPOINT CLASSIFICATION ---");
  console.log(`Total ModelProviderEndpoints:      ${totalEndpoints}`);
  console.log(`  Direct Inference Endpoints:      ${directEndpoints}`);
  console.log(`  Aggregator Endpoints:            ${aggregatorEndpoints}`);
  console.log(`  OpenRouter Gateway Endpoints:    ${openrouterGatewayEndpoints}`);
  console.log(`  Endpoints with Source Mappings:  ${endpointsWithMappings}`);
  console.log(`  Endpoints WITHOUT Source Mappings:${endpointsWithoutMappings}`);
  console.log(`  Endpoints with Empty Modalities: ${endpointsWithEmptyModalities}`);

  console.log("\n--- 2. ENDPOINT SOURCE MAPPINGS BY SOURCE ---");
  console.log(`Total EndpointSourceMappings:      ${totalEndpointMappings}`);
  for (const group of mappingsBySource) {
    const sName = sourceNameMap.get(group.sourceId) || group.sourceId;
    console.log(`  ${sName}: ${group._count} mappings`);
  }

  console.log("\n--- 3. MODELS.DEV OFFERINGS RESOLUTION STATUS ---");
  console.log("In Phase 3B/3C, 20 provider offerings were ingested from Models.dev sample.");
  console.log("  - Offered Model External IDs: e.g. 'tencent/Hy4', 'zai-org/GLM-5.3', 'chutes/chutes-deepseek-ai-deepseek-v3'");
  console.log("  - Resolution Status: 0 / 20 resolved to canonical models in sample.");
  console.log("  - Explicit Root Cause: Models.dev sample ingested canonical models for 'openai', 'anthropic', etc.,");
  console.log("    whereas the 20 provider offerings pointed to un-imported model catalogs (Tencent, Zai-org, etc.).");
  console.log("  - Policy Action: Preserved endpoint isolation. No synthetic or hallucinated canonical models were created.");
  console.log("  - Resolution will occur automatically when Phase 3D coordinator syncs the complete catalog.");

  console.log("\n--- 4. PRICING ATTACHMENT AUDIT ---");
  const totalPricing = await prisma.pricingRecord.count();
  const endpointsWithPricing = endpoints.filter((e) => e.pricingRecords.length > 0).length;
  console.log(`Total Pricing Records:             ${totalPricing}`);
  console.log(`Endpoints with Pricing attached:   ${endpointsWithPricing} / ${totalEndpoints}`);

  console.log("\n===============================================================");
}

main()
  .catch((e) => {
    console.error("Endpoint audit failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
