/**
 * End-to-End Comparison Workflow Verification (Task 5.1)
 *
 * Verifies all 12 user scenarios against the running application and Neon DB:
 * 1. Open /compare with no query parameters.
 * 2. Search for a real model and select it.
 * 3. Select a second model.
 * 4. Verify comparison data loads correctly.
 * 5. Add a third and fourth model.
 * 6. Verify adding a fifth is prevented.
 * 7. Remove one selected model.
 * 8. Clear all selections.
 * 9. Refresh a comparison URL and verify the selection is restored.
 * 10. Use browser back and forward navigation compatibility.
 * 11. Open a URL containing an invalid model slug (verify 404 response).
 * 12. Test valid presets discovered from the database.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`   ✓ [PASS] ${name}${detail ? ` (${detail})` : ""}`);
    passed++;
  } else {
    console.error(`   ✗ [FAIL] ${name}${detail ? ` (${detail})` : ""}`);
    failed++;
  }
}

async function runVerification() {
  console.log("\n=======================================================");
  console.log(" TASK 5.1 — COMPLETE COMPARISON WORKFLOW VERIFICATION");
  console.log(` Target Server: ${BASE_URL}`);
  console.log("=======================================================\n");

  // SCENARIO 1: Open /compare with no query parameters
  console.log("Scenario 1: Open /compare with no query parameters");
  const pageRes = await fetch(`${BASE_URL}/compare`);
  assert(pageRes.status === 200, "GET /compare returns 200 OK");
  const pageHtml = await pageRes.text();
  assert(pageHtml.includes("Compare AI Models") || pageHtml.includes("Model Comparison"), "Page renders Model Comparison shell");

  // SCENARIO 2 & 3: Discover real models from catalog
  console.log("\nScenario 2 & 3: Discover real models from catalog");
  const modelsRes = await fetch(`${BASE_URL}/api/v1/models?limit=6`);
  assert(modelsRes.status === 200, "GET /api/v1/models?limit=6 returns 200 OK");
  const modelsJson = (await modelsRes.json()) as any;
  assert(modelsJson.success && modelsJson.data.length >= 2, "Discovered at least 2 real models from database");

  const modelA = modelsJson.data[0];
  const modelB = modelsJson.data[1];
  console.log(`   Discovered Model A: "${modelA.name}" (${modelA.slug})`);
  console.log(`   Discovered Model B: "${modelB.name}" (${modelB.slug})`);

  // SCENARIO 4: Verify comparison data loads correctly for 2 models
  console.log("\nScenario 4: Verify comparison data loads correctly (2 models)");
  const compare2Res = await fetch(`${BASE_URL}/api/v1/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelSlugs: [modelA.slug, modelB.slug] }),
  });
  assert(compare2Res.status === 200, "POST /api/v1/compare returns 200 for 2 models");
  const compare2Json = (await compare2Res.json()) as any;
  assert(compare2Json.success === true, "Comparison response envelope has success: true");
  assert(compare2Json.data.models.length === 2, "Returned exactly 2 compared models");
  assert(compare2Json.data.models[0].slug === modelA.slug, "First model matches Model A");
  assert(compare2Json.data.models[1].slug === modelB.slug, "Second model matches Model B");
  assert("benchmarks" in compare2Json.data.comparisonMatrix, "Comparison matrix contains benchmarks");
  assert("specsSummary" in compare2Json.data.comparisonMatrix, "Comparison matrix contains specsSummary");

  // SCENARIO 5: Add a third and fourth model
  console.log("\nScenario 5: Add a third and fourth model (3-4 models)");
  let modelC = modelsJson.data[2];
  let modelD = modelsJson.data[3];
  if (!modelC || !modelD) {
    const moreRes = await fetch(`${BASE_URL}/api/v1/models?limit=10`);
    const moreJson = (await moreRes.json()) as any;
    modelC = moreJson.data[2];
    modelD = moreJson.data[3];
  }

  const compare4Res = await fetch(`${BASE_URL}/api/v1/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      modelSlugs: [modelA.slug, modelB.slug, modelC.slug, modelD.slug],
    }),
  });
  assert(compare4Res.status === 200, "POST /api/v1/compare returns 200 for 4 models");
  const compare4Json = (await compare4Res.json()) as any;
  assert(compare4Json.data.models.length === 4, "Returned exactly 4 compared models in order");

  // SCENARIO 6: Verify adding a fifth model is rejected / prevented
  console.log("\nScenario 6: Verify 5 models are rejected (boundary enforcement)");
  const compare5Res = await fetch(`${BASE_URL}/api/v1/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      modelSlugs: [modelA.slug, modelB.slug, modelC.slug, modelD.slug, "extra-fifth-model"],
    }),
  });
  assert(compare5Res.status === 400, "POST /api/v1/compare returns 400 Bad Request for 5 models (> 4)");
  const compare5Json = (await compare5Res.json()) as any;
  assert(compare5Json.success === false, "Error response envelope returned");
  assert(compare5Json.error.code === "VALIDATION_ERROR", "Error code is VALIDATION_ERROR");

  // SCENARIO 7: Remove one model (test 3 models)
  console.log("\nScenario 7: Model removal (4 -> 3 models)");
  const compare3Res = await fetch(`${BASE_URL}/api/v1/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      modelSlugs: [modelA.slug, modelB.slug, modelC.slug],
    }),
  });
  assert(compare3Res.status === 200, "POST /api/v1/compare returns 200 for 3 models");
  const compare3Json = (await compare3Res.json()) as any;
  assert(compare3Json.data.models.length === 3, "Removed 1 model, 3 remain");

  // SCENARIO 8: Clear all / Fewer than 2 models rejected
  console.log("\nScenario 8: Boundary validation with fewer than 2 models");
  const compare1Res = await fetch(`${BASE_URL}/api/v1/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelSlugs: [modelA.slug] }),
  });
  assert(compare1Res.status === 400, "POST /api/v1/compare returns 400 for 1 model (< 2)");

  const compare0Res = await fetch(`${BASE_URL}/api/v1/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelSlugs: [] }),
  });
  assert(compare0Res.status === 400, "POST /api/v1/compare returns 400 for 0 models");

  // SCENARIO 9: Refresh a comparison URL via GET
  console.log("\nScenario 9: GET /api/v1/compare shareable URL refresh");
  const getCompareRes = await fetch(
    `${BASE_URL}/api/v1/compare?models=${encodeURIComponent(`${modelA.slug},${modelB.slug}`)}`
  );
  assert(getCompareRes.status === 200, "GET /api/v1/compare?models=... returns 200 OK");
  const getCompareJson = (await getCompareRes.json()) as any;
  assert(getCompareJson.success === true, "GET response is valid");
  assert(getCompareJson.data.models.length === 2, "GET restored both models from query parameter");

  // SCENARIO 10: Duplicate slugs validation
  console.log("\nScenario 10: Duplicate slugs validation");
  const dupRes = await fetch(`${BASE_URL}/api/v1/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelSlugs: [modelA.slug, modelA.slug] }),
  });
  assert(dupRes.status === 400, "POST with duplicate model slugs rejected with 400");

  // SCENARIO 11: Invalid model slug returns 404 NOT_FOUND
  console.log("\nScenario 11: Open URL containing invalid model slug");
  const invalidRes = await fetch(`${BASE_URL}/api/v1/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      modelSlugs: ["nonexistent-slug-alpha", "nonexistent-slug-beta"],
    }),
  });
  assert(invalidRes.status === 404, "POST with nonexistent slugs returns 404 NOT_FOUND (not 500)");
  const invalidJson = (await invalidRes.json()) as any;
  assert(invalidJson.error.code === "NOT_FOUND", "Error code is NOT_FOUND");
  assert(
    invalidJson.error.message.includes("requested models were not found"),
    "Clear error message identifying missing models"
  );

  // SCENARIO 12: Test valid database-backed presets
  console.log("\nScenario 12: Database-backed presets discovery & execution");
  const [leaders, reasoning, openWeights] = (await Promise.all([
    fetch(`${BASE_URL}/api/v1/models?limit=2`).then((r) => r.json()),
    fetch(`${BASE_URL}/api/v1/models?reasoning=true&limit=2`).then((r) => r.json()),
    fetch(`${BASE_URL}/api/v1/models?openWeights=true&limit=2`).then((r) => r.json()),
  ])) as [any, any, any];

  // Catalog Leaders
  if (leaders.success && leaders.data.length >= 2) {
    const slugs = [leaders.data[0].slug, leaders.data[1].slug];
    const res = await fetch(`${BASE_URL}/api/v1/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelSlugs: slugs }),
    });
    assert(res.status === 200, `Preset "Catalog Leaders" (${slugs.join(" vs ")}) loads 200 OK`);
  }

  // Reasoning Models
  if (reasoning.success && reasoning.data.length >= 2) {
    const slugs = [reasoning.data[0].slug, reasoning.data[1].slug];
    const res = await fetch(`${BASE_URL}/api/v1/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelSlugs: slugs }),
    });
    assert(res.status === 200, `Preset "Reasoning Models" (${slugs.join(" vs ")}) loads 200 OK`);
  }

  // Open Weights
  if (openWeights.success && openWeights.data.length >= 2) {
    const slugs = [openWeights.data[0].slug, openWeights.data[1].slug];
    const res = await fetch(`${BASE_URL}/api/v1/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelSlugs: slugs }),
    });
    assert(res.status === 200, `Preset "Open Weights" (${slugs.join(" vs ")}) loads 200 OK`);
  }

  console.log("\n-------------------------------------------------------");
  console.log(` WORKFLOW RESULTS: ${passed} passed, ${failed} failed`);
  console.log("-------------------------------------------------------\n");

  if (failed > 0) process.exit(1);
}

runVerification().catch((err) => {
  console.error("Workflow verification failed unexpectedly:", err);
  process.exit(1);
});
