import "./env";
import { prisma, Prisma } from "../src/database/index";
import { modelsQueryService } from "../src/services/models-query.service";
import { ModelsCatalogQuerySchema } from "../src/shared/schemas/api";
import { ZodError } from "zod";

/**
 * =========================================================================
 * ONEATLAS PHASE 4B — MODEL CATALOG QUERY, SEARCH & FILTERING TEST SUITE
 * =========================================================================
 */

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`   ✓ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`   ✗ [FAIL] ${message}`);
    failedCount++;
  }
}

const FIXTURE_PREFIX = `_test_fixture_${Date.now()}`;

interface TestFixtureContext {
  labId: string;
  labSlug: string;
  providerId: string;
  providerSlug: string;
  sourceId: string;
  createdModelIds: string[];
}

async function setupFixtures(): Promise<TestFixtureContext> {
  // 1. Create isolated AI Lab
  const labSlug = `${FIXTURE_PREFIX}_lab`;
  const lab = await prisma.aiLab.create({
    data: {
      slug: labSlug,
      name: "Fixture Research Lab",
      website: "https://fixture-lab.ai",
    },
  });

  // 2. Create isolated Inference Provider
  const providerSlug = `${FIXTURE_PREFIX}_provider`;
  const provider = await prisma.provider.create({
    data: {
      slug: providerSlug,
      name: "Fixture Cloud Inference",
      providerType: "CLOUD",
      isActive: true,
    },
  });

  // 3. Ensure ExternalSource for pricing records
  const sourceSlug = `${FIXTURE_PREFIX}_source`;
  const source = await prisma.externalSource.upsert({
    where: { slug: sourceSlug },
    update: {},
    create: {
      slug: sourceSlug,
      name: "Fixture Pricing Aggregator",
      isActive: true,
    },
  });

  const createdModelIds: string[] = [];

  // Model A: Reasoning, Image input, Lab associated, Endpoint with known pricing
  const modelA = await prisma.model.create({
    data: {
      slug: `${FIXTURE_PREFIX}_model_alpha`,
      name: "Alpha Reasoner Pro",
      family: "AlphaSeries",
      description: "Advanced reasoning model for complex mathematics.",
      isReasoning: true,
      isOpenWeight: false,
      contextWindow: 128000,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      releaseDate: new Date("2026-05-15T00:00:00Z"),
      status: "ACTIVE",
      labs: {
        create: {
          aiLabId: lab.id,
          relationshipType: "CREATOR",
        },
      },
      endpoints: {
        create: {
          providerId: provider.id,
          endpointKey: "alpha-primary",
          status: "ONLINE",
          pricingRecords: {
            create: {
              sourceId: source.id,
              inputPricePerMillion: new Prisma.Decimal("1.5000"),
              outputPricePerMillion: new Prisma.Decimal("6.0000"),
              observedAt: new Date("2026-11-20T10:00:00Z"),
            },
          },
        },
      },
    },
  });
  createdModelIds.push(modelA.id);

  // Model B: Open Weight, Audio input, Free (Zero Price), Large Context
  const modelB = await prisma.model.create({
    data: {
      slug: `${FIXTURE_PREFIX}_model_beta`,
      name: "Beta Sound Wave 8B",
      family: "BetaWave",
      description: "Multimodal audio understanding model with open weights.",
      isReasoning: false,
      isOpenWeight: true,
      contextWindow: 256000,
      inputModalities: ["text", "audio"],
      outputModalities: ["text"],
      releaseDate: new Date("2026-08-20T00:00:00Z"),
      status: "ACTIVE",
      endpoints: {
        create: {
          providerId: provider.id,
          endpointKey: "beta-free-tier",
          status: "ONLINE",
          pricingRecords: {
            create: {
              sourceId: source.id,
              inputPricePerMillion: new Prisma.Decimal("0.0000"),
              outputPricePerMillion: new Prisma.Decimal("0.0000"),
              observedAt: new Date("2026-11-20T11:00:00Z"),
            },
          },
        },
      },
    },
  });
  createdModelIds.push(modelB.id);

  // Model C: Null Reasoning, Null OpenWeight, Null Context, Offline endpoint (no verified pricing)
  const modelC = await prisma.model.create({
    data: {
      slug: `${FIXTURE_PREFIX}_model_gamma`,
      name: "Gamma Quantum Unknown",
      family: "GammaLab",
      description: "Experimental architecture with unknown capability metadata.",
      isReasoning: null,
      isOpenWeight: null,
      contextWindow: null,
      inputModalities: ["text"],
      outputModalities: ["text"],
      releaseDate: null,
      status: "ACTIVE",
      endpoints: {
        create: {
          providerId: provider.id,
          endpointKey: "gamma-offline",
          status: "OFFLINE", // Offline endpoint should be ignored in pricing
          pricingRecords: {
            create: {
              sourceId: source.id,
              inputPricePerMillion: new Prisma.Decimal("99.0000"),
              outputPricePerMillion: new Prisma.Decimal("99.0000"),
              observedAt: new Date("2026-11-20T12:00:00Z"),
            },
          },
        },
      },
    },
  });
  createdModelIds.push(modelC.id);

  return {
    labId: lab.id,
    labSlug: lab.slug,
    providerId: provider.id,
    providerSlug: provider.slug,
    sourceId: source.id,
    createdModelIds,
  };
}

async function cleanupFixtures(ctx: TestFixtureContext): Promise<void> {
  // Delete created models in cascade
  if (ctx.createdModelIds.length > 0) {
    await prisma.model.deleteMany({
      where: {
        id: { in: ctx.createdModelIds },
      },
    });
  }

  // Delete isolated provider
  await prisma.provider.deleteMany({
    where: { id: ctx.providerId },
  });

  // Delete isolated lab
  await prisma.aiLab.deleteMany({
    where: { id: ctx.labId },
  });

  // Delete isolated source
  await prisma.externalSource.deleteMany({
    where: { id: ctx.sourceId },
  });
}

async function runTests(): Promise<void> {
  console.log("🧪 =========================================================");
  console.log("   ONEATLAS MODEL CATALOG QUERY & FILTERING TEST SUITE (4B)");
  console.log("=========================================================\n");

  let fixtures: TestFixtureContext | null = null;

  try {
    console.log("Setting up isolated test fixtures in PostgreSQL...");
    fixtures = await setupFixtures();
    console.log("✓ Fixtures successfully provisioned.\n");

    // -------------------------------------------------------------
    // 1. Search Queries
    // -------------------------------------------------------------
    console.log("1. Testing Search Functionality (q)...");

    // Exact name search
    const exactName = await modelsQueryService.getModelsCatalog({
      q: "Alpha Reasoner Pro",
    });
    assert(
      exactName.models.some((m) => m.slug.includes("alpha")),
      "Exact name search matches model"
    );

    // Partial case-insensitive search
    const partialSearch = await modelsQueryService.getModelsCatalog({
      q: "sound wave",
    });
    assert(
      partialSearch.models.some((m) => m.slug.includes("beta")),
      "Partial case-insensitive name search matches model"
    );

    // Slug substring search
    const slugSearch = await modelsQueryService.getModelsCatalog({
      q: "model_gamma",
    });
    assert(
      slugSearch.models.some((m) => m.slug.includes("gamma")),
      "Search matches model by slug substring"
    );

    // Family search
    const familySearch = await modelsQueryService.getModelsCatalog({
      q: "AlphaSeries",
    });
    assert(
      familySearch.models.some((m) => m.slug.includes("alpha")),
      "Search matches model by family"
    );

    // Description search
    const descSearch = await modelsQueryService.getModelsCatalog({
      q: "complex mathematics",
    });
    assert(
      descSearch.models.some((m) => m.slug.includes("alpha")),
      "Search matches model by description text"
    );

    // Empty query returns normal results
    const emptySearch = await modelsQueryService.getModelsCatalog({
      q: "",
    });
    assert(emptySearch.models.length > 0, "Empty query returns normal catalog");

    // -------------------------------------------------------------
    // 2. AI Lab Filtering
    // -------------------------------------------------------------
    console.log("\n2. Testing AI Lab Filtering (lab)...");

    const labFilter = await modelsQueryService.getModelsCatalog({
      lab: fixtures.labSlug,
    });
    assert(
      labFilter.models.length === 1 && labFilter.models[0].slug.includes("alpha"),
      "Filtering by lab returns only verified associated models"
    );

    const unknownLab = await modelsQueryService.getModelsCatalog({
      lab: "non-existent-lab-slug-9999",
    });
    assert(unknownLab.models.length === 0, "Filtering by non-existent lab yields 0 models");

    // -------------------------------------------------------------
    // 3. Provider Filtering
    // -------------------------------------------------------------
    console.log("\n3. Testing Provider Filtering (provider)...");

    const providerFilter = await modelsQueryService.getModelsCatalog({
      provider: fixtures.providerSlug,
    });
    // Alpha and Beta have ONLINE endpoints with this provider. Gamma has OFFLINE endpoint.
    assert(
      providerFilter.models.length === 2 &&
        providerFilter.models.every((m) => m.slug.includes("alpha") || m.slug.includes("beta")),
      "Provider filter returns models with ONLINE endpoints (excluding OFFLINE endpoints)"
    );

    const unknownProvider = await modelsQueryService.getModelsCatalog({
      provider: "non-existent-provider-9999",
    });
    assert(unknownProvider.models.length === 0, "Filtering by non-existent provider yields 0 models");

    // -------------------------------------------------------------
    // 4. Modality Filtering
    // -------------------------------------------------------------
    console.log("\n4. Testing Modality Filtering...");

    const audioFilter = await modelsQueryService.getModelsCatalog({
      modality: "audio",
      q: FIXTURE_PREFIX,
    });
    assert(
      audioFilter.models.length === 1 && audioFilter.models[0].slug.includes("beta"),
      "Modality filter 'audio' correctly matches model with audio modality"
    );

    const imageInputFilter = await modelsQueryService.getModelsCatalog({
      inputModality: "image",
      q: FIXTURE_PREFIX,
    });
    assert(
      imageInputFilter.models.length === 1 && imageInputFilter.models[0].slug.includes("alpha"),
      "InputModality filter 'image' matches model with image input"
    );

    // -------------------------------------------------------------
    // 5. Nullable Capability Metadata
    // -------------------------------------------------------------
    console.log("\n5. Testing Nullable Capability Metadata (Reasoning & Open Weights)...");

    const reasoningTrue = await modelsQueryService.getModelsCatalog({
      reasoning: true,
      q: FIXTURE_PREFIX,
    });
    assert(
      reasoningTrue.models.length === 1 && reasoningTrue.models[0].slug.includes("alpha"),
      "reasoning=true returns verified reasoning models"
    );

    const reasoningFalse = await modelsQueryService.getModelsCatalog({
      reasoning: false,
      q: FIXTURE_PREFIX,
    });
    assert(
      reasoningFalse.models.length === 1 && reasoningFalse.models[0].slug.includes("beta"),
      "reasoning=false returns verified non-reasoning models (excluding null)"
    );

    const openWeightsTrue = await modelsQueryService.getModelsCatalog({
      openWeights: true,
      q: FIXTURE_PREFIX,
    });
    assert(
      openWeightsTrue.models.length === 1 && openWeightsTrue.models[0].slug.includes("beta"),
      "openWeights=true returns open weight models"
    );

    const openWeightsFalse = await modelsQueryService.getModelsCatalog({
      openWeights: false,
      q: FIXTURE_PREFIX,
    });
    assert(
      openWeightsFalse.models.length === 1 && openWeightsFalse.models[0].slug.includes("alpha"),
      "openWeights=false returns closed weight models (excluding null)"
    );

    // -------------------------------------------------------------
    // 6. Context Window Range Filtering
    // -------------------------------------------------------------
    console.log("\n6. Testing Context Window Filtering...");

    const minContext = await modelsQueryService.getModelsCatalog({
      minimumContext: 200000,
      q: FIXTURE_PREFIX,
    });
    assert(
      minContext.models.length === 1 && minContext.models[0].slug.includes("beta"),
      "minimumContext=200000 matches model with 256k context"
    );

    const maxContext = await modelsQueryService.getModelsCatalog({
      maximumContext: 150000,
      q: FIXTURE_PREFIX,
    });
    assert(
      maxContext.models.length === 1 && maxContext.models[0].slug.includes("alpha"),
      "maximumContext=150000 matches model with 128k context (excluding null)"
    );

    const boundedContext = await modelsQueryService.getModelsCatalog({
      minimumContext: 100000,
      maximumContext: 300000,
      q: FIXTURE_PREFIX,
    });
    assert(
      boundedContext.models.length === 2,
      "Bounded context range [100k, 300k] matches both 128k and 256k models"
    );

    // -------------------------------------------------------------
    // 7. Pricing Filters & Provider-Aware Summaries
    // -------------------------------------------------------------
    console.log("\n7. Testing Pricing Filters & Exact Decimal Summaries...");

    // Filter by maximum input price
    const lowCostInput = await modelsQueryService.getModelsCatalog({
      maximumInputPrice: 0.5,
      q: FIXTURE_PREFIX,
    });
    assert(
      lowCostInput.models.length === 1 && lowCostInput.models[0].slug.includes("beta"),
      "maximumInputPrice=0.5 matches free model (0.0000)"
    );

    // Verify explicit zero price handling
    const zeroModel = lowCostInput.models[0];
    assert(
      zeroModel.pricing.lowestInput?.amount === "0",
      "Explicit zero input price preserved as exact '0' string"
    );
    assert(
      zeroModel.pricing.lowestOutput?.amount === "0",
      "Explicit zero output price preserved as exact '0' string"
    );

    // Combined input and output price bounds on same offer
    const combinedPrice = await modelsQueryService.getModelsCatalog({
      minimumInputPrice: 1.0,
      maximumInputPrice: 2.0,
      minimumOutputPrice: 5.0,
      maximumOutputPrice: 7.0,
      q: FIXTURE_PREFIX,
    });
    assert(
      combinedPrice.models.length === 1 && combinedPrice.models[0].slug.includes("alpha"),
      "Combined input [1, 2] and output [5, 7] matches Alpha ($1.50 in, $6.00 out)"
    );

    // Offline endpoint price isolation: Gamma had an offline endpoint with $99 price.
    const offlinePriceQuery = await modelsQueryService.getModelsCatalog({
      minimumInputPrice: 50.0,
      q: FIXTURE_PREFIX,
    });
    assert(
      offlinePriceQuery.models.length === 0,
      "Offline endpoint pricing is ignored; Gamma does not appear"
    );

    // Verify unknown pricing summary for Gamma
    const gammaCatalog = await modelsQueryService.getModelsCatalog({
      q: `${FIXTURE_PREFIX}_model_gamma`,
    });
    const gammaModel = gammaCatalog.models[0];
    assert(
      gammaModel.pricing.lowestInput === null && gammaModel.pricing.lowestOutput === null,
      "Model with no online pricing records returns lowestInput: null, lowestOutput: null"
    );
    assert(
      gammaModel.pricing.availableProviderCount === 0,
      "Model with no online endpoints returns availableProviderCount: 0"
    );

    // -------------------------------------------------------------
    // 8. Sorting Modes & Deterministic Tie-Breaking
    // -------------------------------------------------------------
    console.log("\n8. Testing Sorting Modes & Null Placement...");

    // Name ascending
    const nameAsc = await modelsQueryService.getModelsCatalog({
      q: FIXTURE_PREFIX,
      sort: "name_asc",
    });
    assert(
      nameAsc.models[0].name.startsWith("Alpha") && nameAsc.models[1].name.startsWith("Beta"),
      "sort=name_asc orders alphabetically ascending"
    );

    // Name descending
    const nameDesc = await modelsQueryService.getModelsCatalog({
      q: FIXTURE_PREFIX,
      sort: "name_desc",
    });
    assert(
      nameDesc.models[0].name.startsWith("Gamma"),
      "sort=name_desc orders alphabetically descending"
    );

    // Context descending (nulls last)
    const contextDesc = await modelsQueryService.getModelsCatalog({
      q: FIXTURE_PREFIX,
      sort: "context_desc",
    });
    assert(
      contextDesc.models[0].contextWindow === 256000 &&
        contextDesc.models[contextDesc.models.length - 1].contextWindow === null,
      "sort=context_desc orders largest context first, nulls placed last"
    );

    // Price sorting ascending (free $0 first, then $1.50, then nulls last)
    const priceAsc = await modelsQueryService.getModelsCatalog({
      q: FIXTURE_PREFIX,
      sort: "input_price_asc",
    });
    assert(
      priceAsc.models[0].slug.includes("beta") &&
        priceAsc.models[1].slug.includes("alpha") &&
        priceAsc.models[2].slug.includes("gamma"),
      "sort=input_price_asc orders free ($0) first, then $1.50, with unpriced models placed last"
    );

    // Price sorting descending (highest price first, nulls last)
    const priceDesc = await modelsQueryService.getModelsCatalog({
      q: FIXTURE_PREFIX,
      sort: "input_price_desc",
    });
    assert(
      priceDesc.models[0].slug.includes("alpha") &&
        priceDesc.models[1].slug.includes("beta") &&
        priceDesc.models[2].slug.includes("gamma"),
      "sort=input_price_desc orders $1.50 first, then $0.00, with unpriced models placed last"
    );

    // -------------------------------------------------------------
    // 9. Pagination & Single Model Per Page Guarantee
    // -------------------------------------------------------------
    console.log("\n9. Testing Pagination & Entity Uniqueness...");

    const pagedResult = await modelsQueryService.getModelsCatalog({
      page: 1,
      limit: 2,
      q: FIXTURE_PREFIX,
    });
    assert(pagedResult.models.length === 2, "limit=2 returns exactly 2 records");
    assert(pagedResult.pagination.total === 3, "total indicates 3 total matching models");
    assert(pagedResult.pagination.totalPages === 2, "totalPages calculated as 2");
    assert(pagedResult.pagination.hasNextPage === true, "hasNextPage is true on page 1");
    assert(pagedResult.pagination.hasPreviousPage === false, "hasPreviousPage is false on page 1");

    // Page 2
    const page2Result = await modelsQueryService.getModelsCatalog({
      page: 2,
      limit: 2,
      q: FIXTURE_PREFIX,
    });
    assert(page2Result.models.length === 1, "page=2 returns the remaining 1 model");
    assert(page2Result.pagination.hasNextPage === false, "hasNextPage is false on last page");
    assert(page2Result.pagination.hasPreviousPage === true, "hasPreviousPage is true on page 2");

    // Entity uniqueness
    const allSlugs = pagedResult.models.map((m) => m.slug);
    assert(new Set(allSlugs).size === allSlugs.length, "Each canonical model appears exactly once per page");

    // -------------------------------------------------------------
    // 10. Security & Validation Reject Rules
    // -------------------------------------------------------------
    console.log("\n10. Testing Security & Rejection Bounds...");

    // SQL Injection in search query
    const sqlInjectionQuery = await modelsQueryService.getModelsCatalog({
      q: "' OR 1=1; DROP TABLE models; --",
    });
    assert(sqlInjectionQuery.models.length === 0, "SQL injection string safely escaped by parameterized query");

    // Invalid range validation
    let caughtRangeError = false;
    try {
      ModelsCatalogQuerySchema.parse({
        minimumContext: 500000,
        maximumContext: 100000,
      });
    } catch (e) {
      caughtRangeError = e instanceof ZodError;
    }
    assert(caughtRangeError, "Contradictory context range (min > max) rejected by schema");

    let caughtPriceRangeError = false;
    try {
      ModelsCatalogQuerySchema.parse({
        minimumInputPrice: 10.0,
        maximumInputPrice: 2.0,
      });
    } catch (e) {
      caughtPriceRangeError = e instanceof ZodError;
    }
    assert(caughtPriceRangeError, "Contradictory pricing range (min > max) rejected by schema");

    // -------------------------------------------------------------
    // 11. Database Query Performance Review: EXPLAIN (ANALYZE, BUFFERS)
    // -------------------------------------------------------------
    console.log("\n11. Database Query Performance Review: EXPLAIN (ANALYZE, BUFFERS)...");

    const explainResult = await prisma.$queryRaw<Array<{ "QUERY PLAN": string }>>`
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT m.id, m.slug, m.name, m."contextWindow", m."releaseDate"
      FROM models m
      WHERE m.status = 'ACTIVE'
        AND (m.name ILIKE '%gpt%' OR m.slug ILIKE '%gpt%')
      ORDER BY m."releaseDate" DESC NULLS LAST, m.id DESC
      LIMIT 20 OFFSET 0;
    `;

    console.log("   --- EXPLAIN (ANALYZE, BUFFERS) Plan ---");
    for (const row of explainResult) {
      console.log(`   ${row["QUERY PLAN"]}`);
    }
    assert(explainResult.length > 0, "EXPLAIN (ANALYZE, BUFFERS) successfully retrieved query plan");
  } finally {
    if (fixtures) {
      console.log("\nCleaning up test fixtures from database...");
      await cleanupFixtures(fixtures);
      console.log("✓ Cleanup complete. Zero residual test records left.");
    }
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log("\n=========================================================");
  console.log(`📊 PHASE 4B TESTS: ${passedCount} Passed, ${failedCount} Failed.`);
  console.log("=========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
