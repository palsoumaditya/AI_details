import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  IngestionCoordinator,
  AdapterRegistry,
  AdvisoryLockService,
  ResultAggregator,
  ExecutionPlan,
  BatchService,
  LockConflictError,
  classifyError,
} from "../src/server/ingestion/coordinator";
import { OpenRouterIngestionAdapter } from "../src/server/integrations/openrouter/adapter";
import { ModelsDevIngestionAdapter } from "../src/server/integrations/modelsdev/adapter";
import type {
  IngestionSourceAdapter,
  IngestionExecutionContext,
  SourceSyncResult,
} from "../src/server/ingestion/contracts/types";

async function runTests() {
  console.log(`
🧪 =========================================================
   ONEATLAS SHARED INGESTION COORDINATOR TEST SUITE (3D)
=========================================================
`);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`   ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`   ✗ [FAIL] ${message}`);
      failed++;
    }
  }

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing direct database connection string for tests.");
    process.exit(1);
  }
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    // -------------------------------------------------------------
    // 1. Adapter Contract & Registry Tests
    // -------------------------------------------------------------
    console.log("1. Testing Adapter Contract & Registry System...");

    const registry = new AdapterRegistry();
    const orAdapter = new OpenRouterIngestionAdapter(prisma);
    const mdAdapter = new ModelsDevIngestionAdapter(prisma);

    registry.register(orAdapter);
    registry.register(mdAdapter);

    assert(registry.has("openrouter"), "Registry holds OpenRouter adapter");
    assert(registry.has("modelsdev"), "Registry holds Models.dev adapter");
    assert(registry.getAll().length === 2, "Registry returns all registered adapters");

    // Duplicate registration should throw
    let dupFailed = false;
    try {
      registry.register(orAdapter);
    } catch {
      dupFailed = true;
    }
    assert(dupFailed, "Duplicate adapter registration is rejected");

    // Unknown source lookup should throw
    let unknownFailed = false;
    try {
      registry.get("nonexistent_source");
    } catch {
      unknownFailed = true;
    }
    assert(unknownFailed, "Unknown source lookup throws explicit error");

    // -------------------------------------------------------------
    // 2. Result Aggregator Tests
    // -------------------------------------------------------------
    console.log("\n2. Testing Multi-Source Result Aggregation...");

    const dummyStart = new Date(Date.now() - 5000);
    const dummyEnd = new Date();

    const mockResult1: SourceSyncResult = {
      sourceSlug: "modelsdev",
      status: "COMPLETED",
      modelsProcessed: 10,
      modelsInserted: 8,
      modelsUpdated: 2,
      modelsUnchanged: 0,
      providersProcessed: 5,
      providersInserted: 5,
      providersUpdated: 0,
      providersUnchanged: 0,
      endpointsProcessed: 10,
      endpointsInserted: 5,
      endpointsUpdated: 0,
      endpointsUnchanged: 0,
      endpointsUnresolved: 5,
      pricingRecordsCreated: 5,
      rawRecordsCreated: 15,
      conflictsDetected: 1,
      itemsFailed: 0,
      itemsSkipped: 0,
      errors: [],
      durationMs: 2500,
    };

    const mockResult2: SourceSyncResult = {
      sourceSlug: "openrouter",
      status: "COMPLETED",
      modelsProcessed: 20,
      modelsInserted: 14,
      modelsUpdated: 6,
      modelsUnchanged: 0,
      providersProcessed: 10,
      providersInserted: 8,
      providersUpdated: 2,
      providersUnchanged: 0,
      endpointsProcessed: 20,
      endpointsInserted: 20,
      endpointsUpdated: 0,
      endpointsUnchanged: 0,
      endpointsUnresolved: 0,
      pricingRecordsCreated: 20,
      rawRecordsCreated: 30,
      conflictsDetected: 0,
      itemsFailed: 0,
      itemsSkipped: 0,
      errors: [],
      durationMs: 2500,
    };

    const aggregated = ResultAggregator.aggregate(
      "test-batch-1",
      "APPLY",
      ["modelsdev", "openrouter"],
      [mockResult1, mockResult2],
      dummyStart,
      dummyEnd
    );

    assert(aggregated.status === "COMPLETED", "Aggregate status is COMPLETED when all sources succeed");
    assert(aggregated.aggregateCounters.totalModelsProcessed === 30, "Total models processed correctly summed (10 + 20 = 30)");
    assert(aggregated.aggregateCounters.totalModelsInserted === 22, "Total models inserted correctly summed (8 + 14 = 22)");
    assert(aggregated.aggregateCounters.totalEndpointsUnresolved === 5, "Total endpoints unresolved preserved accurately (5)");
    assert(aggregated.aggregateCounters.totalPricingRecordsCreated === 25, "Total pricing snapshots summed accurately (25)");

    // Partial status aggregation
    const mockFailedResult: SourceSyncResult = {
      ...mockResult2,
      status: "FAILED",
      errors: ["Network connection timed out"],
    };
    const partialAgg = ResultAggregator.aggregate(
      "test-batch-2",
      "APPLY",
      ["modelsdev", "openrouter"],
      [mockResult1, mockFailedResult],
      dummyStart,
      dummyEnd
    );
    assert(partialAgg.status === "PARTIAL", "Aggregate status is PARTIAL when one source fails");
    assert(partialAgg.errors.includes("Network connection timed out"), "Child source error preserved in aggregate summary");

    // -------------------------------------------------------------
    // 3. PostgreSQL Advisory Locking Tests
    // -------------------------------------------------------------
    console.log("\n3. Testing PostgreSQL Session-Level Advisory Locking...");

    const lockService1 = new AdvisoryLockService(connectionString);
    const lockService2 = new AdvisoryLockService(connectionString);

    // Acquire lock with session 1
    const lockHandle1 = await lockService1.acquireGlobalLock();
    assert(lockHandle1 !== null, "First coordinator session successfully acquires global advisory lock");

    // Concurrent second session must be rejected with LockConflictError
    let lockConflictTriggered = false;
    try {
      await lockService2.acquireGlobalLock();
    } catch (lockErr) {
      if (lockErr instanceof LockConflictError) {
        lockConflictTriggered = true;
      }
    }
    assert(lockConflictTriggered, "Concurrent second session is rejected with LockConflictError");

    // Release lock on session 1
    await lockHandle1.release();

    // Now session 2 should be able to acquire lock
    const lockHandle2 = await lockService2.acquireGlobalLock();
    assert(lockHandle2 !== null, "Second session acquires lock immediately after release");
    await lockHandle2.release();

    // -------------------------------------------------------------
    // 4. Batch Lifecycle & SyncRun Association Tests
    // -------------------------------------------------------------
    console.log("\n4. Testing SyncBatch & SyncRun Relational Lifecycle...");

    const batchService = new BatchService(prisma);
    const testBatch = await batchService.createBatch(["modelsdev", "openrouter"], "MANUAL");
    assert(testBatch.status === "STARTED", "Created SyncBatch with initial status 'STARTED'");
    assert(testBatch.requestedSources.length === 2, "SyncBatch stores requestedSources array");

    // Ensure external source exists for linking
    const orSource = await prisma.externalSource.findUnique({ where: { slug: "openrouter" } });
    if (orSource) {
      const childRun = await batchService.createSourceRun(testBatch.id, orSource.id, "MANUAL");
      assert(childRun.batchId === testBatch.id, "Child SyncRun accurately references parent SyncBatch ID");

      await batchService.finalizeSourceRun(childRun.id, mockResult2);
      const verifiedRun = await prisma.syncRun.findUnique({ where: { id: childRun.id } });
      assert(verifiedRun?.status === "COMPLETED", "Finalized SyncRun status updated to COMPLETED");
      assert(verifiedRun?.itemsInserted === 42, "Finalized SyncRun aggregate itemsInserted calculated accurately");

      // Clean up test sync run
      await prisma.syncRun.delete({ where: { id: childRun.id } });
    }

    // Finalize batch
    await batchService.finalizeBatch(testBatch.id, aggregated);
    const verifiedBatch = await prisma.syncBatch.findUnique({ where: { id: testBatch.id } });
    assert(verifiedBatch?.status === "COMPLETED", "Finalized SyncBatch status updated to COMPLETED");
    assert(verifiedBatch?.completedAt !== null, "Finalized SyncBatch completedAt timestamp recorded");

    // Clean up test batch
    await prisma.syncBatch.delete({ where: { id: testBatch.id } });

    // -------------------------------------------------------------
    // 5. Error Classification Tests
    // -------------------------------------------------------------
    console.log("\n5. Testing Centralized Error Classification...");

    const lockErr = classifyError(new Error("pg_try_advisory_lock failed"));
    assert(lockErr.category === "LOCK_CONFLICT", "Advisory lock error classified as LOCK_CONFLICT");

    const netErr = classifyError(new Error("fetch failed: ECONNREFUSED 127.0.0.1:443"));
    assert(netErr.category === "NETWORK_ERROR", "Network failure classified as NETWORK_ERROR");

    const rateErr = classifyError(new Error("HTTP 429 Too Many Requests"));
    assert(rateErr.category === "RATE_LIMITED", "429 response classified as RATE_LIMITED");

    const authErr = classifyError(new Error("HTTP 401 Unauthorized"));
    assert(authErr.category === "AUTHENTICATION_ERROR", "401 response classified as AUTHENTICATION_ERROR");

    const permErr = classifyError(new Error("HTTP 403 Forbidden"));
    assert(permErr.category === "PERMISSION_ERROR", "403 response classified as PERMISSION_ERROR");

    // -------------------------------------------------------------
    // 6. Safe Phased Multi-Source Execution Plan Structure
    // -------------------------------------------------------------
    console.log("\n6. Testing Multi-Source Execution Plan Order & Mock Dispatch...");

    const stageCalls: string[] = [];
    const mockAdapterMD: IngestionSourceAdapter = {
      sourceSlug: "modelsdev",
      validateAccess: async () => {},
      execute: async () => mockResult1,
      syncModels: async () => { stageCalls.push("MD_MODELS"); return mockResult1; },
      syncProviders: async () => { stageCalls.push("MD_PROVIDERS"); return mockResult1; },
      syncEndpoints: async () => { stageCalls.push("MD_ENDPOINTS"); return mockResult1; },
    };

    const mockAdapterOR: IngestionSourceAdapter = {
      sourceSlug: "openrouter",
      validateAccess: async () => {},
      execute: async () => mockResult2,
      syncModels: async () => { stageCalls.push("OR_MODELS"); return mockResult2; },
      syncProviders: async () => { stageCalls.push("OR_PROVIDERS"); return mockResult2; },
      syncEndpoints: async () => { stageCalls.push("OR_ENDPOINTS"); return mockResult2; },
    };

    const testContext: IngestionExecutionContext = {
      batchId: "virtual-test-plan",
      mode: "DRY_RUN",
      stage: "ALL",
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      startedAt: new Date(),
    };

    const phasedResults = await ExecutionPlan.executePhasedMultiSource(
      [mockAdapterMD, mockAdapterOR],
      testContext
    );

    assert(phasedResults.length === 2, "ExecutionPlan returns results for both requested sources");
    assert(stageCalls[0] === "MD_MODELS", "Stage 1 executes Models.dev Canonical Models first");
    assert(stageCalls[1] === "OR_MODELS", "Stage 2 executes OpenRouter Model Catalog second");
    assert(stageCalls[2] === "MD_PROVIDERS" && stageCalls[3] === "OR_PROVIDERS", "Stage 3 executes Provider Directories third");
    assert(stageCalls[4] === "MD_ENDPOINTS", "Stage 4 executes Models.dev Provider Offerings fourth");
    assert(stageCalls[5] === "OR_ENDPOINTS", "Stage 5 executes OpenRouter Provider Endpoints fifth");

    console.log(`
=========================================================
📊 COORDINATOR TESTS COMPLETED: ${passed} Passed, ${failed} Failed.
=========================================================
`);

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
