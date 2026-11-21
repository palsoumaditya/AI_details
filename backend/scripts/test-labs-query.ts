import "./env";
import { prisma } from "../src/database/index";
import { labDirectoryQueryService } from "../src/services/lab-directory-query.service";
import {
  LabsQuerySchema,
  LabModelsQuerySchema,
  LabSlugParamSchema,
} from "../src/shared/schemas/api";
import { ZodError } from "zod";

/**
 * =========================================================================
 * ONEATLAS PHASE 4D — AI LAB DIRECTORY & LINEAGE TEST SUITE
 * =========================================================================
 */

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean | undefined | null, message: string): void {
  if (condition) {
    console.log(`   ✓ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`   ✗ [FAIL] ${message}`);
    failedCount++;
  }
}

const FIXTURE_PREFIX = `_test_4d_l_${Date.now()}`;

interface LabTestContext {
  labEmptyId: string;
  labEmptySlug: string;
  labMultiId: string;
  labMultiSlug: string;
  modelAId: string;
  modelBId: string;
  modelCId: string;
  createdLabIds: string[];
  createdModelIds: string[];
}

async function setupFixtures(): Promise<LabTestContext> {
  const createdLabIds: string[] = [];
  const createdModelIds: string[] = [];

  // 1. Lab with 0 models
  const labEmptySlug = `${FIXTURE_PREFIX}_empty`;
  const labEmpty = await prisma.aiLab.create({
    data: {
      slug: labEmptySlug,
      name: "Empty Research Foundation",
      description: "Organization with zero foundation models",
      website: "https://empty-research.fixture.org",
      country: "DE",
    },
  });
  createdLabIds.push(labEmpty.id);

  // 2. Models with distinct families
  // Model A: family "omni-fam", dual role (CREATOR & PUBLISHER)
  const modelA = await prisma.model.create({
    data: {
      slug: `${FIXTURE_PREFIX}_model_omni_a`,
      name: "Frontier Omni A",
      family: "omni-fam",
      releaseDate: new Date("2026-06-01T00:00:00Z"),
      isReasoning: true,
      isOpenWeight: true,
      status: "ACTIVE",
    },
  });
  createdModelIds.push(modelA.id);

  // Model B: family "omni-fam", COLLABORATOR role
  const modelB = await prisma.model.create({
    data: {
      slug: `${FIXTURE_PREFIX}_model_omni_b`,
      name: "Frontier Omni B",
      family: "omni-fam",
      releaseDate: new Date("2026-05-01T00:00:00Z"),
      isReasoning: false,
      isOpenWeight: false,
      status: "ACTIVE",
    },
  });
  createdModelIds.push(modelB.id);

  // Model C: family null (unclassified), CREATOR role
  const modelC = await prisma.model.create({
    data: {
      slug: `${FIXTURE_PREFIX}_model_null_fam`,
      name: "Standalone Lab Model C",
      family: null,
      releaseDate: new Date("2026-04-01T00:00:00Z"),
      isReasoning: null,
      isOpenWeight: null,
      status: "ACTIVE",
    },
  });
  createdModelIds.push(modelC.id);

  // Model D: Unassociated model (should never appear under this lab)
  const modelD = await prisma.model.create({
    data: {
      slug: `${FIXTURE_PREFIX}_unassociated_model`,
      name: "Unrelated Foreign Model",
      family: "foreign-fam",
      status: "ACTIVE",
    },
  });
  createdModelIds.push(modelD.id);

  // 3. Multi Lab
  const labMultiSlug = `${FIXTURE_PREFIX}_multi_lab`;
  const labMulti = await prisma.aiLab.create({
    data: {
      slug: labMultiSlug,
      name: "Frontier Cybernetics Institute",
      description: "Global research lab developing omni intelligence",
      website: "https://cybernetics.fixture.org",
      logoUrl: "https://cybernetics.fixture.org/logo.png",
      country: "US",
      models: {
        create: [
          // Model A has 2 roles: CREATOR and PUBLISHER!
          { modelId: modelA.id, relationshipType: "CREATOR" },
          { modelId: modelA.id, relationshipType: "PUBLISHER" },
          // Model B has COLLABORATOR role
          { modelId: modelB.id, relationshipType: "COLLABORATOR" },
          // Model C has CREATOR role with null family
          { modelId: modelC.id, relationshipType: "CREATOR" },
        ],
      },
    },
  });
  createdLabIds.push(labMulti.id);

  return {
    labEmptyId: labEmpty.id,
    labEmptySlug,
    labMultiId: labMulti.id,
    labMultiSlug,
    modelAId: modelA.id,
    modelBId: modelB.id,
    modelCId: modelC.id,
    createdLabIds,
    createdModelIds,
  };
}

async function cleanupFixtures(ctx: LabTestContext): Promise<void> {
  // 1. Delete models (cascades to model_labs)
  if (ctx.createdModelIds.length > 0) {
    await prisma.model.deleteMany({
      where: { id: { in: ctx.createdModelIds } },
    });
  }

  // 2. Delete labs
  if (ctx.createdLabIds.length > 0) {
    await prisma.aiLab.deleteMany({
      where: { id: { in: ctx.createdLabIds } },
    });
  }
}

async function runTests(): Promise<void> {
  console.log("🧪 =========================================================");
  console.log("   ONEATLAS AI LAB DIRECTORY & LINEAGE TEST SUITE (4D)");
  console.log("=========================================================\n");

  let fixtures: LabTestContext | null = null;

  try {
    console.log("Setting up isolated test fixtures in PostgreSQL...");
    fixtures = await setupFixtures();
    console.log("✓ Fixtures successfully provisioned.\n");

    // -------------------------------------------------------------
    // 1. AI Lab Resolution & Slug Lookup
    // -------------------------------------------------------------
    console.log("1. Testing AI Lab Resolution & Slug Lookup...");

    const labMulti = await labDirectoryQueryService.getLabBySlug(fixtures.labMultiSlug);
    assert(labMulti !== null, "Existing AI lab resolves successfully");
    assert(labMulti?.lab.slug === fixtures.labMultiSlug, "Returned lab has identical slug");

    const nonExistent = await labDirectoryQueryService.getLabBySlug("non-existent-lab-slug-9999");
    assert(nonExistent === null, "Unknown lab slug returns null");

    const malformed = await labDirectoryQueryService.getLabBySlug("Invalid Slug With Spaces!");
    assert(malformed === null, "Malformed slug returns null");

    let slugValidationError = false;
    try {
      LabSlugParamSchema.parse({ slug: "invalid/slug/with/slashes" });
    } catch (e) {
      slugValidationError = e instanceof ZodError;
    }
    assert(slugValidationError, "Slug with illegal slashes rejected by Zod schema");

    // -------------------------------------------------------------
    // 2. AI Lab with Zero Models
    // -------------------------------------------------------------
    console.log("\n2. Testing AI Lab with Zero Models...");

    const labEmpty = await labDirectoryQueryService.getLabBySlug(fixtures.labEmptySlug);
    assert(labEmpty !== null, "Lab with zero models resolved");
    assert(labEmpty?.lab.modelCount === 0, "modelCount is exactly 0");
    assert(labEmpty?.lab.creatorModelCount === 0, "creatorModelCount is exactly 0");
    assert(labEmpty?.lab.publisherModelCount === 0, "publisherModelCount is exactly 0");
    assert(labEmpty?.lab.collaboratorModelCount === 0, "collaboratorModelCount is exactly 0");
    assert(labEmpty?.familyDistribution.length === 0, "familyDistribution is empty array");
    assert(labEmpty?.models.length === 0, "Models array is empty");
    assert(labEmpty?.pagination.total === 0, "Pagination total is 0");

    // -------------------------------------------------------------
    // 3. Distinct Model Counts & Relationship Roles
    // -------------------------------------------------------------
    console.log("\n3. Testing Distinct Model Counts & Role Attribution...");

    // Model A has 2 roles (CREATOR, PUBLISHER), Model B (COLLABORATOR), Model C (CREATOR)
    // Distinct models = 3 (Model A, B, C)
    assert(labMulti?.lab.modelCount === 3, "Distinct model count is exactly 3 (Model A, B, C)");
    assert(labMulti?.lab.creatorModelCount === 2, "creatorModelCount is 2 (Model A + Model C)");
    assert(labMulti?.lab.publisherModelCount === 1, "publisherModelCount is 1 (Model A)");
    assert(labMulti?.lab.collaboratorModelCount === 1, "collaboratorModelCount is 1 (Model B)");

    // -------------------------------------------------------------
    // 4. Model Collection Deduplication & Array Roles
    // -------------------------------------------------------------
    console.log("\n4. Testing Model Collection Deduplication & Roles Array...");

    // Model A must appear only ONCE in the models array, with roles ["CREATOR", "PUBLISHER"]
    assert(labMulti?.models.length === 3, "Paginated model collection contains exactly 3 models");

    const modelAItem = labMulti?.models.find((m) => m.slug.includes("omni_a"));
    assert(modelAItem !== undefined, "Model A present in collection");
    assert(
      modelAItem?.relationshipTypes.includes("CREATOR") &&
        modelAItem?.relationshipTypes.includes("PUBLISHER") &&
        modelAItem?.relationshipTypes.length === 2,
      "Model A reflects all persisted roles in relationshipTypes array without duplication in the model collection"
    );

    // Ensure unassociated foreign model D is NOT returned
    assert(
      !labMulti?.models.some((m) => m.slug.includes("unassociated")),
      "Foreign unassociated model D is strictly excluded"
    );

    // -------------------------------------------------------------
    // 5. Family Distribution & Null Preservation
    // -------------------------------------------------------------
    console.log("\n5. Testing Family Distribution Across Entire Association Set...");

    // Model A & B are "omni-fam" (2 models), Model C has null family (1 model)
    assert(labMulti?.familyDistribution.length === 2, "Family distribution has 2 groups (omni-fam and null)");

    const omniGroup = labMulti?.familyDistribution.find((g) => g.family === "omni-fam");
    assert(omniGroup?.modelCount === 2, "omni-fam group has 2 distinct models");

    const nullGroup = labMulti?.familyDistribution.find((g) => g.family === null);
    assert(nullGroup?.modelCount === 1, "Null family is preserved as unclassified group with 1 model");

    // -------------------------------------------------------------
    // 6. Filtering by Relationship Role and Family
    // -------------------------------------------------------------
    console.log("\n6. Testing Relationship Role & Family Filters...");

    // Filter by role CREATOR (Model A, Model C = 2 models)
    const creatorOnly = await labDirectoryQueryService.getLabBySlug(fixtures.labMultiSlug, {
      relationshipType: "CREATOR",
    });
    assert(creatorOnly?.models.length === 2, "relationshipType=CREATOR returns 2 models");
    assert(creatorOnly?.pagination.total === 2, "Pagination total is 2");

    // Filter by role COLLABORATOR (Model B = 1 model)
    const collabOnly = await labDirectoryQueryService.getLabBySlug(fixtures.labMultiSlug, {
      relationshipType: "COLLABORATOR",
    });
    assert(collabOnly?.models.length === 1 && collabOnly?.models[0].slug.includes("omni_b"), "relationshipType=COLLABORATOR returns Model B");

    // Filter by family "omni-fam" (Model A, Model B = 2 models)
    const famFilter = await labDirectoryQueryService.getLabBySlug(fixtures.labMultiSlug, {
      family: "omni-fam",
    });
    assert(famFilter?.models.length === 2, "family=omni-fam returns 2 models");

    // Verify family distribution is computed across the lab's full association set, even when filtering
    assert(famFilter?.familyDistribution.length === 2, "Global family distribution remains intact when filtering paginated models");

    // -------------------------------------------------------------
    // 7. Directory Collection Queries, Search & Country Filters
    // -------------------------------------------------------------
    console.log("\n7. Testing Directory Search, Country Filters & Pagination...");

    // Search by name
    const searchName = await labDirectoryQueryService.listLabs({ q: "Cybernetics" });
    assert(searchName.labs.some((l) => l.slug === fixtures?.labMultiSlug), "Search by lab name matches");

    // Search by slug
    const searchSlug = await labDirectoryQueryService.listLabs({ q: fixtures.labEmptySlug });
    assert(searchSlug.labs.length === 1 && searchSlug.labs[0].slug === fixtures.labEmptySlug, "Search by lab slug matches");

    // Country filter
    const filterUS = await labDirectoryQueryService.listLabs({ country: "US", q: FIXTURE_PREFIX });
    assert(filterUS.labs.length === 1 && filterUS.labs[0].slug === fixtures.labMultiSlug, "country=US filter matches US lab");

    const filterDE = await labDirectoryQueryService.listLabs({ country: "DE", q: FIXTURE_PREFIX });
    assert(filterDE.labs.length === 1 && filterDE.labs[0].slug === fixtures.labEmptySlug, "country=DE filter matches DE lab");

    // Pagination limit & page
    const page1 = await labDirectoryQueryService.getLabBySlug(fixtures.labMultiSlug, { page: 1, limit: 2 });
    assert(page1?.models.length === 2, "Page 1 limit 2 returns 2 models");
    assert(page1?.pagination.total === 3, "Total models is 3");
    assert(page1?.pagination.totalPages === 2, "Total pages is 2");

    // -------------------------------------------------------------
    // 8. Validation Bounds & SQL Injection Safety
    // -------------------------------------------------------------
    console.log("\n8. Testing Validation Bounds & Security...");

    // Reject limit > 100
    let limitExceeded = false;
    try {
      LabsQuerySchema.parse({ limit: 500 });
    } catch (e) {
      limitExceeded = e instanceof ZodError;
    }
    assert(limitExceeded, "Limit exceeding 100 rejected by LabsQuerySchema");

    // Reject invalid relationship role
    let invalidRole = false;
    try {
      LabModelsQuerySchema.parse({ relationshipType: "INVALID_ROLE" as any });
    } catch (e) {
      invalidRole = e instanceof ZodError;
    }
    assert(invalidRole, "Invalid relationship role rejected by LabModelsQuerySchema");

    // SQL injection search safety
    const sqlSearch = await labDirectoryQueryService.listLabs({ q: "'; DROP TABLE models; --" });
    assert(Array.isArray(sqlSearch.labs), "SQL injection attack string handled safely via parameters");

    // -------------------------------------------------------------
    // 9. PostgreSQL EXPLAIN (ANALYZE, BUFFERS) Check
    // -------------------------------------------------------------
    console.log("\n9. Testing PostgreSQL EXPLAIN (ANALYZE, BUFFERS)...");

    const explainLabs = await prisma.$queryRawUnsafe<Array<{ "QUERY PLAN": string }>>(
      `EXPLAIN (ANALYZE, BUFFERS)
       SELECT "id", "slug", "name", "country"
       FROM "ai_labs"
       WHERE "name" ILIKE '%Cybernetics%' OR "slug" ILIKE '%Cybernetics%'
       ORDER BY "name" ASC, "id" DESC
       LIMIT 20;`
    );

    assert(
      explainLabs.length > 0 && typeof explainLabs[0]["QUERY PLAN"] === "string",
      "EXPLAIN (ANALYZE, BUFFERS) query plan retrieved for AI Lab search"
    );

    const planText = explainLabs.map((r) => r["QUERY PLAN"]).join("\n");
    console.log("   --- EXPLAIN Output ---");
    console.log(
      planText
        .split("\n")
        .slice(0, 5)
        .map((l) => `   ${l}`)
        .join("\n")
    );
  } finally {
    if (fixtures) {
      console.log("\nCleaning up test fixtures from PostgreSQL...");
      await cleanupFixtures(fixtures);
      console.log("✓ Fixtures successfully cleaned up.");
    }
  }

  console.log("\n=========================================================");
  console.log(`📊 AI LAB DIRECTORY TESTS: ${passedCount} Passed, ${failedCount} Failed.`);
  console.log("=========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
