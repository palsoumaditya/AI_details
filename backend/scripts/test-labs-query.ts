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
 * AI DETAILS PHASE 4D.1 — AI LAB DIRECTORY & LINEAGE TEST SUITE
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
  modelDId: string;
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

  // Model D: Unassociated model (should never appear in this lab's lineage)
  const modelD = await prisma.model.create({
    data: {
      slug: `${FIXTURE_PREFIX}_model_foreign_d`,
      name: "Foreign Autonomous Model D",
      family: "foreign-fam",
      releaseDate: new Date("2026-03-01T00:00:00Z"),
      status: "ACTIVE",
    },
  });
  createdModelIds.push(modelD.id);

  // 3. Multi-model AI Lab with diverse relationship roles
  const labMultiSlug = `${FIXTURE_PREFIX}_multi_lab`;
  const labMulti = await prisma.aiLab.create({
    data: {
      slug: labMultiSlug,
      name: "Frontier Cybernetics Institute",
      description: "Global research lab developing omni intelligence",
      website: "https://frontier-cyber.fixture.org",
      country: "US",
      models: {
        create: [
          // Model A is both CREATOR and PUBLISHER (dual role test)
          {
            modelId: modelA.id,
            relationshipType: "CREATOR",
          },
          {
            modelId: modelA.id,
            relationshipType: "PUBLISHER",
          },
          // Model B is COLLABORATOR
          {
            modelId: modelB.id,
            relationshipType: "COLLABORATOR",
          },
          // Model C is CREATOR (with null family)
          {
            modelId: modelC.id,
            relationshipType: "CREATOR",
          },
        ],
      },
    },
  });
  createdLabIds.push(labMulti.id);

  return {
    labEmptyId: labEmpty.id,
    labEmptySlug: labEmptySlug,
    labMultiId: labMulti.id,
    labMultiSlug: labMultiSlug,
    modelAId: modelA.id,
    modelBId: modelB.id,
    modelCId: modelC.id,
    modelDId: modelD.id,
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
  console.log("   AI DETAILS AI LAB DIRECTORY & LINEAGE TEST SUITE (4D.1)");
  console.log("=========================================================\n");

  // Record baseline counts before provisioning
  const baselineModelCount = await prisma.model.count();
  const baselineLabCount = await prisma.aiLab.count();
  const baselineModelLabCount = await prisma.modelLab.count();

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
    assert(labMulti?.lab.slug === fixtures.labMultiSlug, "Lab has identical slug");

    const nonExistent = await labDirectoryQueryService.getLabBySlug("non-existent-lab-slug-9999");
    assert(nonExistent === null, "Unknown lab slug returns null");

    const malformed = await labDirectoryQueryService.getLabBySlug("Invalid Lab Slug!");
    assert(malformed === null, "Malformed lab slug returns null");

    let slugValidationError = false;
    try {
      LabSlugParamSchema.parse({ slug: "invalid/lab/slug" });
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

    // Zero-model lab remains visible in directory collection
    const dirWithZero = await labDirectoryQueryService.listLabs({ q: fixtures.labEmptySlug });
    assert(dirWithZero.labs.length === 1 && dirWithZero.labs[0].slug === fixtures.labEmptySlug, "Zero-model lab remains visible in directory");
    assert(dirWithZero.labs[0].modelCount === 0, "Directory item modelCount is 0");

    // -------------------------------------------------------------
    // 3. Distinct Model Counts & Relationship Roles (SQL Aggregation)
    // -------------------------------------------------------------
    console.log("\n3. Testing Distinct Model Counts & Role Attribution...");

    // Model A has 2 roles (CREATOR, PUBLISHER), Model B (COLLABORATOR), Model C (CREATOR)
    // Total ModelLab records for this lab = 4
    // Distinct models = 3 (Model A, B, C)
    assert(labMulti?.lab.modelCount === 3, "Distinct model count is exactly 3 (Model A, B, C)");
    assert(labMulti?.lab.creatorModelCount === 2, "creatorModelCount is 2 (Model A + Model C)");
    assert(labMulti?.lab.publisherModelCount === 1, "publisherModelCount is 1 (Model A)");
    assert(labMulti?.lab.collaboratorModelCount === 1, "collaboratorModelCount is 1 (Model B)");

    // Role-specific counts sum to 2 + 1 + 1 = 4, which is > total distinct model count (3)
    const roleSum = (labMulti?.lab.creatorModelCount ?? 0) + (labMulti?.lab.publisherModelCount ?? 0) + (labMulti?.lab.collaboratorModelCount ?? 0);
    assert(roleSum === 4 && roleSum > (labMulti?.lab.modelCount ?? 0), "Role-specific counts correctly sum to more than distinct modelCount due to dual role on Model A");

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
      "Model A reflects all distinct persisted roles in relationshipTypes array without duplication in the model collection"
    );

    // Ensure unassociated foreign model D is NOT returned
    assert(
      !labMulti?.models.some((m) => m.slug.includes("foreign_d")),
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
    // 6. Independence of Family Distribution from Pagination & Filters
    // -------------------------------------------------------------
    console.log("\n6. Testing Independence of Family Distribution from Pagination & Filters...");

    // Test with page 1 limit 1: models array has 1 item, but family distribution must STILL have all 3 models!
    const page1Limit1 = await labDirectoryQueryService.getLabBySlug(fixtures.labMultiSlug, { page: 1, limit: 1 });
    assert(page1Limit1?.models.length === 1, "Page 1 limit 1 returns 1 model in collection");
    assert(page1Limit1?.familyDistribution.length === 2, "Family distribution covers all 2 groups regardless of pagination page size");
    assert(
      page1Limit1?.familyDistribution.find((g) => g.family === "omni-fam")?.modelCount === 2,
      "omni-fam count is 2 regardless of pagination page size"
    );

    // Test with page 2 limit 1: models array has next item, family distribution unchanged
    const page2Limit1 = await labDirectoryQueryService.getLabBySlug(fixtures.labMultiSlug, { page: 2, limit: 1 });
    assert(page2Limit1?.models.length === 1, "Page 2 limit 1 returns 1 model in collection");
    assert(
      page2Limit1?.familyDistribution.find((g) => g.family === "omni-fam")?.modelCount === 2,
      "Family distribution unchanged across different pagination pages"
    );

    // Filter by role CREATOR (Model A, Model C = 2 models in paginated collection)
    const creatorOnly = await labDirectoryQueryService.getLabBySlug(fixtures.labMultiSlug, {
      relationshipType: "CREATOR",
    });
    assert(creatorOnly?.models.length === 2, "relationshipType=CREATOR returns 2 models");
    assert(creatorOnly?.pagination.total === 2, "Pagination total is 2");
    // Verify family distribution is STILL across the lab's full association set (3 models, 2 omni + 1 null), not just the CREATOR models!
    assert(creatorOnly?.familyDistribution.length === 2, "Global family distribution remains intact when filtering paginated models by role");
    assert(
      creatorOnly?.familyDistribution.find((g) => g.family === "omni-fam")?.modelCount === 2,
      "omni-fam count is 2 in global family distribution even when role filter applied"
    );

    // Filter by role COLLABORATOR (Model B = 1 model)
    const collabOnly = await labDirectoryQueryService.getLabBySlug(fixtures.labMultiSlug, {
      relationshipType: "COLLABORATOR",
    });
    assert(collabOnly?.models.length === 1 && collabOnly?.models[0].slug.includes("omni_b"), "relationshipType=COLLABORATOR returns Model B");

    // Filter by family "omni-fam" (Model A, Model B = 2 models in paginated collection)
    const famFilter = await labDirectoryQueryService.getLabBySlug(fixtures.labMultiSlug, {
      family: "omni-fam",
    });
    assert(famFilter?.models.length === 2, "family=omni-fam returns 2 models");
    // Verify global family distribution STILL includes null family (unclassified) model
    assert(famFilter?.familyDistribution.length === 2, "Global family distribution remains intact when filtering paginated models by family");

    // -------------------------------------------------------------
    // 7. Directory Collection Queries, Search, Filters & Sorting
    // -------------------------------------------------------------
    console.log("\n7. Testing Directory Search, Country Filters, Sorting & Pagination...");

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

    // Sorting by models_desc in PostgreSQL before pagination
    const sortModels = await labDirectoryQueryService.listLabs({ sort: "models_desc", q: FIXTURE_PREFIX });
    assert(sortModels.labs[0].slug === fixtures.labMultiSlug, "models_desc puts lab with most distinct models first");

    // Pagination limit & page
    const page1 = await labDirectoryQueryService.getLabBySlug(fixtures.labMultiSlug, { page: 1, limit: 2 });
    assert(page1?.models.length === 2, "Page 1 limit 2 returns 2 models");
    assert(page1?.pagination.total === 3, "Total models is 3");
    assert(page1?.pagination.totalPages === 2, "Total pages is 2");
    assert(page1?.pagination.hasNextPage === true, "hasNextPage is true for page 1");
    assert(page1?.pagination.hasPreviousPage === false, "hasPreviousPage is false for page 1");

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
    // 9. API Response Envelope Contract Verification
    // -------------------------------------------------------------
    console.log("\n9. Testing API Envelope Structure...");

    assert(typeof dirWithZero.pagination.page === "number", "Envelope has page integer");
    assert(typeof dirWithZero.pagination.limit === "number", "Envelope has limit integer");
    assert(typeof dirWithZero.pagination.total === "number", "Envelope has total integer");
    assert(typeof dirWithZero.pagination.totalPages === "number", "Envelope has totalPages integer");
    assert(typeof dirWithZero.pagination.hasNextPage === "boolean", "Envelope has hasNextPage boolean");
    assert(typeof dirWithZero.pagination.hasPreviousPage === "boolean", "Envelope has hasPreviousPage boolean");

    // -------------------------------------------------------------
    // 10. PostgreSQL EXPLAIN (ANALYZE, BUFFERS) Check
    // -------------------------------------------------------------
    console.log("\n10. Testing PostgreSQL EXPLAIN (ANALYZE, BUFFERS)...");

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

    // Re-verify database catalog baseline counts after cleanup
    const afterModelCount = await prisma.model.count();
    const afterLabCount = await prisma.aiLab.count();
    const afterModelLabCount = await prisma.modelLab.count();

    console.log("\nChecking database catalog counts after test fixture teardown:");
    console.log(`   Models:    ${afterModelCount} (baseline: ${baselineModelCount})`);
    console.log(`   Labs:      ${afterLabCount} (baseline: ${baselineLabCount})`);
    console.log(`   ModelLabs: ${afterModelLabCount} (baseline: ${baselineModelLabCount})`);

    assert(afterModelCount === baselineModelCount, "Catalog model count unchanged after fixture cleanup");
    assert(afterLabCount === baselineLabCount, "Catalog lab count unchanged after fixture cleanup");
    assert(afterModelLabCount === baselineModelLabCount, "Catalog model_labs count unchanged after fixture cleanup");
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
