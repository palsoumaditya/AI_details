import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@oneatlas/database";
import { ProvenanceService } from "../src/domain/identity-resolution/provenance.service";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing connection string");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== AI DETAILS ENDPOINT & PROVENANCE RECONCILIATION ===");

  const openrouterSource = await prisma.externalSource.findUnique({
    where: { slug: "openrouter" },
  });

  if (!openrouterSource) {
    console.error("OpenRouter external source not found in database.");
    process.exit(1);
  }

  // 1. Reconcile OpenRouter Endpoints and EndpointSourceMappings
  console.log("\n1. Reconciling OpenRouter Endpoints...");
  const endpoints = await prisma.modelProviderEndpoint.findMany({
    where: {
      endpointKey: { startsWith: "openrouter/" },
    },
    include: {
      sourceMappings: true,
      model: true,
    },
  });

  console.log(`Found ${endpoints.length} OpenRouter endpoints in database.`);
  let mappingsCreated = 0;
  let modalitiesUpdated = 0;

  for (const ep of endpoints) {
    const hasMapping = ep.sourceMappings.some((m) => m.sourceId === openrouterSource.id);

    if (!hasMapping) {
      await prisma.endpointSourceMapping.create({
        data: {
          endpointId: ep.id,
          sourceId: openrouterSource.id,
          externalEndpointId: ep.endpointKey,
          lastFetchedAt: new Date(),
        },
      });
      mappingsCreated++;
    }

    // Populate endpoint modalities from model if endpoint modalities are empty
    if (
      (ep.inputModalities.length === 0 && ep.model.inputModalities.length > 0) ||
      (ep.outputModalities.length === 0 && ep.model.outputModalities.length > 0)
    ) {
      await prisma.modelProviderEndpoint.update({
        where: { id: ep.id },
        data: {
          inputModalities: ep.model.inputModalities,
          outputModalities: ep.model.outputModalities,
        },
      });
      modalitiesUpdated++;
    }
  }

  console.log(`- Created ${mappingsCreated} missing EndpointSourceMapping records.`);
  console.log(`- Backfilled modalities on ${modalitiesUpdated} endpoints.`);

  // 2. Populate Field Provenance for existing canonical models
  console.log("\n2. Seeding Field Provenance for Canonical Models...");
  const provenanceService = new ProvenanceService(prisma);
  const models = await prisma.model.findMany({
    include: {
      sourceMappings: {
        include: { source: true },
      },
    },
  });

  let provCount = 0;
  for (const model of models) {
    // Determine authoritative source: modelsdev > openrouter
    const hasModelsdev = model.sourceMappings.find((m) => m.source.slug === "modelsdev");
    const hasOpenRouter = model.sourceMappings.find((m) => m.source.slug === "openrouter");
    const primaryMapping = hasModelsdev || hasOpenRouter;

    if (!primaryMapping) continue;

    const sourceId = primaryMapping.sourceId;
    const sourceExternalId = primaryMapping.externalModelId;

    // Record provenance for key canonical fields
    await provenanceService.recordProvenance({
      entityType: "MODEL",
      entityId: model.id,
      fieldKey: "name",
      sourceId,
      sourceExternalId,
      selectedValue: model.name,
      confidence: 1.0,
    });
    provCount++;

    if (model.contextWindow !== null) {
      await provenanceService.recordProvenance({
        entityType: "MODEL",
        entityId: model.id,
        fieldKey: "contextWindow",
        sourceId,
        sourceExternalId,
        selectedValue: model.contextWindow,
        confidence: 0.95,
      });
      provCount++;
    }

    if (model.isOpenWeight !== null) {
      const openWeightSourceId = hasModelsdev ? hasModelsdev.sourceId : sourceId;
      const openWeightExtId = hasModelsdev ? hasModelsdev.externalModelId : sourceExternalId;
      await provenanceService.recordProvenance({
        entityType: "MODEL",
        entityId: model.id,
        fieldKey: "isOpenWeight",
        sourceId: openWeightSourceId,
        sourceExternalId: openWeightExtId,
        selectedValue: model.isOpenWeight,
        confidence: hasModelsdev ? 1.0 : 0.7,
      });
      provCount++;
    }

    if (model.isReasoning !== null) {
      await provenanceService.recordProvenance({
        entityType: "MODEL",
        entityId: model.id,
        fieldKey: "isReasoning",
        sourceId,
        sourceExternalId,
        selectedValue: model.isReasoning,
        confidence: 0.9,
      });
      provCount++;
    }
  }

  console.log(`- Recorded ${provCount} field provenance entries across ${models.length} models.`);
  console.log("\nReconciliation completed successfully.");
}

main()
  .catch((e) => {
    console.error("Reconciliation failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
