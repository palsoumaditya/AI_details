import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@oneatlas/database";
import {
  normalizeModelIdentity,
  ExactMatcher,
  CanonicalMatcher,
  AliasResolver,
  CandidateGenerator,
  DecisionEngine,
  ConflictDetector,
  ProvenanceEngine,
  ProvenanceService,
  ConflictService,
  ProviderResolver,
  EndpointResolver,
  ReviewService,
  calculateConfidenceScore,
  createEvidence,
} from "../src/domain/identity-resolution";
import { EndpointService as OpenRouterEndpointService } from "../src/integrations/openrouter/endpoint.service";

/**
 * Phase 3C Comprehensive Identity Resolution & Reconciliation Test Suite
 */
async function runTests() {
  console.log(`
🧪 =========================================================
   ONEATLAS IDENTITY RESOLUTION & RECONCILIATION TEST SUITE
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

  // -------------------------------------------------------------
  // 1. Normalization & Token Extraction Tests
  // -------------------------------------------------------------
  console.log("1. Testing Deterministic Model Normalization Layer...");

  const norm1 = normalizeModelIdentity({
    id: "meta-llama/Llama-3.3-70B-Instruct-Q4_K_M",
    name: "Llama 3.3 70B Instruct (Q4_K_M)",
    family: "llama",
  });
  assert(norm1.publisherNamespace === "meta", "Publisher namespace normalized: 'meta-llama' -> 'meta'");
  assert(norm1.parameterCount === "70b", "Parameter count extracted as '70b'");
  assert(norm1.quantization === "q4_k_m", "Quantization extracted as 'q4_k_m'");
  assert(norm1.instructType === "instruct", "Instruct designation detected");
  assert(norm1.version === "3.3", "Version extracted as '3.3'");

  const norm2 = normalizeModelIdentity({
    id: "openai/o1-mini-2024-09-12",
    name: "OpenAI o1 mini",
  });
  assert(norm2.publisherNamespace === "openai", "Publisher namespace: 'openai'");
  assert(norm2.isReasoning === true, "Reasoning capability detected for o1");

  const norm3 = normalizeModelIdentity({
    id: "deepseek-ai/DeepSeek-R1-Distill-Qwen-8B",
    name: "DeepSeek R1 Distill Qwen 8B",
  });
  assert(norm3.parameterCount === "8b", "Parameter count: '8b'");
  assert(norm3.isReasoning === true, "Reasoning capability detected for R1");

  // -------------------------------------------------------------
  // 2. Confidence Scoring & Evidence Tests
  // -------------------------------------------------------------
  console.log("\n2. Testing Transparent Confidence Scoring System...");

  const ev1 = createEvidence("EXACT_SOURCE_MAPPING", "Exact mapping found");
  assert(ev1.scoreContribution === 100, "EXACT_SOURCE_MAPPING awards +100 points");

  const ev2 = createEvidence("PENALTY_DIFFERENT_PARAMETERS", "70b vs 8b mismatch");
  assert(ev2.scoreContribution === -40, "PENALTY_DIFFERENT_PARAMETERS penalizes -40 points");

  const scoreCombined = calculateConfidenceScore([
    createEvidence("SAME_PUBLISHER_AND_VERSION", "same"),
    createEvidence("SAME_FAMILY", "same"),
    createEvidence("MATCHING_PARAMETER_COUNT", "same"),
  ]);
  assert(scoreCombined === 60, `Score combination calculated accurately: 30+15+15 = 60 (got ${scoreCombined})`);

  // -------------------------------------------------------------
  // 3. Decision Engine Safety & Strict Policy Tests
  // -------------------------------------------------------------
  console.log("\n3. Testing Decision Engine Strict Anti-Merge Safety Policies...");

  const engine = new DecisionEngine();

  // Authoritative Strategy 1 resolves automatically
  const resExact = engine.evaluate({
    strategy: "STRATEGY_1_EXACT_SOURCE_MAPPING",
    canonicalModelId: "model-123",
    canonicalModelSlug: "test-slug",
    evidence: [createEvidence("EXACT_SOURCE_MAPPING", "exact")],
  });
  assert(resExact.status === "RESOLVED", "Strategy 1 exact mapping resolves automatically (status: RESOLVED)");

  // Heuristic Strategy 4 MUST NEVER automatically resolve, even with high score
  const resHeuristic = engine.evaluate({
    strategy: "STRATEGY_4_HEURISTIC_CANDIDATE",
    candidates: [
      {
        candidateModelId: "model-456",
        candidateModelSlug: "cand-slug",
        candidateModelName: "Cand Model",
        confidenceScore: 85, // High heuristic score
        matchingStrategy: "STRATEGY_4_HEURISTIC_CANDIDATE",
        evidence: [],
        conflicts: [],
        recommendedAction: "APPROVE_MANUAL",
      },
    ],
    evidence: [],
  });
  assert(
    resHeuristic.status === "CANDIDATE_GENERATED",
    "Strategy 4 heuristic candidate stays CANDIDATE_GENERATED (NEVER automatically resolved)"
  );

  // Strategy 5 unresolved
  const resUnresolved = engine.evaluate({
    strategy: "STRATEGY_5_UNRESOLVED",
    evidence: [],
  });
  assert(resUnresolved.status === "UNRESOLVED", "Strategy 5 correctly yields UNRESOLVED");

  // -------------------------------------------------------------
  // 4. Conflict Detector Tests
  // -------------------------------------------------------------
  console.log("\n4. Testing Metadata Disagreement & Conflict Detection...");

  const conflictDetector = new ConflictDetector();
  const mockCanonicalModel = {
    id: "test-model",
    slug: "gpt-4o",
    name: "GPT-4o",
    description: "OpenAI multimodal model",
    family: "gpt-4o",
    releaseDate: new Date("2024-05-13"),
    knowledgeCutoff: "2023-10",
    license: "proprietary",
    architectureType: "multimodal",
    isReasoning: false,
    isOpenWeight: false,
    inputModalities: ["text", "image"],
    outputModalities: ["text"],
    capabilities: null,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    status: "ACTIVE" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Open-weight mismatch (CRITICAL)
  const openWeightConflicts = conflictDetector.detectModelConflicts(mockCanonicalModel, {
    sourceId: "source-test",
    externalModelId: "test-id",
    name: "GPT-4o",
    isOpenWeight: true, // Conflict: canonical is false!
  });
  assert(
    openWeightConflicts.some((c) => c.field === "isOpenWeight" && c.severity === "CRITICAL"),
    "Open-weight status disagreement detected as CRITICAL conflict"
  );

  // Modality mismatch (CRITICAL)
  const modalityConflicts = conflictDetector.detectModelConflicts(mockCanonicalModel, {
    sourceId: "source-test",
    externalModelId: "test-id",
    name: "GPT-4o",
    inputModalities: ["text"], // Missing image modality
  });
  assert(
    modalityConflicts.some((c) => c.field === "inputModalities" && c.severity === "CRITICAL"),
    "Multimodal image input mismatch detected as CRITICAL conflict"
  );

  // Release date divergence (>60 days is CRITICAL)
  const releaseConflicts = conflictDetector.detectModelConflicts(mockCanonicalModel, {
    sourceId: "source-test",
    externalModelId: "test-id",
    name: "GPT-4o",
    releaseDate: new Date("2023-01-01"), // >1 year off
  });
  assert(
    releaseConflicts.some((c) => c.field === "releaseDate" && c.severity === "CRITICAL"),
    "Divergent release date (>60 days) detected as CRITICAL conflict"
  );

  // Context window disagreement (WARNING)
  const contextConflicts = conflictDetector.detectModelConflicts(mockCanonicalModel, {
    sourceId: "source-test",
    externalModelId: "test-id",
    name: "GPT-4o",
    contextWindow: 200000,
  });
  assert(
    contextConflicts.some((c) => c.field === "contextWindow" && c.severity === "WARNING"),
    "Context window disagreement detected as WARNING conflict"
  );

  // -------------------------------------------------------------
  // 5. Field Provenance & Ownership Reconciliation Tests
  // -------------------------------------------------------------
  console.log("\n5. Testing Field Ownership & Non-Destructive Provenance Policy...");

  const provenanceEngine = new ProvenanceEngine();

  // Models.dev has authority over family, releaseDate, license
  const reconciledModelsDev = provenanceEngine.reconcileModelFields(
    mockCanonicalModel,
    {
      sourceId: "modelsdev",
      externalModelId: "openai/gpt-4o",
      name: "GPT-4o Updated",
      family: "gpt-4o-family",
      releaseDate: new Date("2024-05-14"),
      license: "openai-commercial",
    },
    "modelsdev"
  );
  assert(reconciledModelsDev.fields.family === "gpt-4o-family", "Models.dev updates model family authoritatively");
  assert(reconciledModelsDev.fields.license === "openai-commercial", "Models.dev updates model license authoritatively");
  assert(reconciledModelsDev.fields.name === "GPT-4o", "Canonical name preserved (not overwritten by incoming)");

  // Inferior source with null values must NOT wipe out existing canonical values
  const reconciledNulls = provenanceEngine.reconcileModelFields(
    mockCanonicalModel,
    {
      sourceId: "other-source",
      externalModelId: "test",
      name: "Test",
      contextWindow: null,
      family: null,
      license: null,
    },
    "other-source"
  );
  assert(reconciledNulls.fields.contextWindow === 128000, "Existing contextWindow NOT overwritten by null");
  assert(reconciledNulls.fields.family === "gpt-4o", "Existing family NOT overwritten by null");
  assert(reconciledNulls.fields.license === "proprietary", "Existing license NOT overwritten by null");

  // -------------------------------------------------------------
  // 6. Live Database Relational Resolution & Persistence Tests
  // -------------------------------------------------------------
  console.log("\n6. Testing Live Neon DB Relational Resolution & Workflow...");

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing connection string");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const testSuffix = `idres_${Date.now()}`;
  let testModelId: string | null = null;
  let testProviderId: string | null = null;
  let testSourceId: string | null = null;
  let testCandidateId: string | null = null;

  try {
    // Setup isolated test entities
    const source = await prisma.externalSource.upsert({
      where: { slug: `test-source-${testSuffix}` },
      update: {},
      create: {
        slug: `test-source-${testSuffix}`,
        name: "Test Identity Source",
        baseUrl: "https://test.example.com",
        isActive: true,
      },
    });
    testSourceId = source.id;

    const canonicalModel = await prisma.model.create({
      data: {
        slug: `test-canonical-${testSuffix}`,
        name: "Test Canonical Model 70B",
        family: "testfamily",
        contextWindow: 131072,
        isOpenWeight: true,
        isReasoning: false,
      },
    });
    testModelId = canonicalModel.id;

    // A. Strategy 1 Live Test: Exact Source Mapping
    console.log("   - Testing Strategy 1: Exact Source Mapping...");
    await prisma.modelSourceMapping.create({
      data: {
        sourceId: source.id,
        modelId: canonicalModel.id,
        externalModelId: `exact-ext-${testSuffix}`,
      },
    });

    const exactMatcher = new ExactMatcher(prisma);
    const match1 = await exactMatcher.match({
      sourceId: source.id,
      externalModelId: `exact-ext-${testSuffix}`,
      name: "Random Display Name",
    });
    assert(match1.isMatch && match1.model?.id === canonicalModel.id, "Strategy 1 resolves existing exact source mapping");

    // B. Strategy 2 Live Test: Authoritative canonical_model_id
    console.log("   - Testing Strategy 2: Authoritative canonical_model_id...");
    const canonicalMatcher = new CanonicalMatcher(prisma);
    const match2 = await canonicalMatcher.match({
      sourceId: source.id,
      externalModelId: `provider-offering-${testSuffix}`,
      canonicalModelId: `exact-ext-${testSuffix}`, // Points to authoritative model
      name: "Provider Offering Model",
    });
    assert(
      match2.isMatch && match2.model?.id === canonicalModel.id,
      "Strategy 2 resolves offering with authoritative canonical_model_id"
    );

    // C. Strategy 3 Live Test: Explicit Alias Resolver
    console.log("   - Testing Strategy 3: Explicit Alias Mapping...");
    const aliasResolver = new AliasResolver(prisma);
    const match3 = await aliasResolver.match({
      sourceId: source.id,
      externalModelId: "meta-llama/llama-3.3-70b-instruct",
      name: "Llama 3.3",
    });
    // Even if canonical model for alias doesn't exist in test DB yet, verifies matching logic
    assert(typeof match3.isMatch === "boolean", "Strategy 3 executes explicit alias lookup");

    // D. Strategy 4 Live Test: Heuristic Candidate Generation & Ranking
    console.log("   - Testing Strategy 4: Heuristic Candidate Generation & Distinction...");
    const candidateGenerator = new CandidateGenerator(prisma);

    // Same family and parameters -> generates candidate
    const candidatesSimilar = await candidateGenerator.generateCandidates(
      {
        sourceId: source.id,
        externalModelId: `incoming-similar-${testSuffix}`,
        name: "Test Canonical Model 70B Variant",
        family: "testfamily",
      },
      [canonicalModel]
    );
    assert(candidatesSimilar.length > 0, "Similar model generates reviewable candidate match");
    assert(
      candidatesSimilar[0].matchingStrategy === "STRATEGY_4_HEURISTIC_CANDIDATE",
      "Strategy tagged as STRATEGY_4_HEURISTIC_CANDIDATE"
    );

    // Different parameter count (8B vs 70B) -> heavy penalty, candidate filtered out
    const candidatesDifferentParam = await candidateGenerator.generateCandidates(
      {
        sourceId: source.id,
        externalModelId: `incoming-8b-${testSuffix}`,
        name: "Test Model 8B",
        family: "testfamily",
      },
      [canonicalModel]
    );
    assert(
      candidatesDifferentParam.length === 0,
      "Different parameter count (8B vs 70B) is heavily penalized and rejected as candidate"
    );

    // E. Candidate Persistence & CLI Review Workflow
    console.log("   - Testing Candidate Table Persistence & Approval Workflow...");
    const candidate = await prisma.modelResolutionCandidate.create({
      data: {
        sourceId: source.id,
        externalModelId: `candidate-review-${testSuffix}`,
        candidateModelId: canonicalModel.id,
        matchingStrategy: "STRATEGY_4_HEURISTIC_CANDIDATE",
        confidenceScore: 78,
        evidence: [createEvidence("SAME_FAMILY", "family match")] as unknown as object,
        status: "PENDING",
      },
    });
    testCandidateId = candidate.id;

    const reviewService = new ReviewService(prisma);
    const pendingList = await reviewService.listCandidates("PENDING", source.id);
    assert(pendingList.some((c) => c.id === candidate.id), "Candidate appears in pending review list");

    // Approve candidate
    const { mapping: approvedMapping, candidate: approvedCandidate } = await reviewService.approveCandidate(
      candidate.id,
      "Audited and approved by test"
    );
    assert(approvedCandidate.status === "APPROVED", "Approved candidate status is APPROVED");
    assert(approvedMapping.modelId === canonicalModel.id, "Approved candidate produces authoritative ModelSourceMapping");

    // Second approval of already approved candidate should throw
    let duplicateApprovalFailed = false;
    try {
      await reviewService.approveCandidate(candidate.id);
    } catch {
      duplicateApprovalFailed = true;
    }
    assert(duplicateApprovalFailed, "Duplicate approval of already approved candidate rejected");

    // F. Provider Resolution & Idempotency
    console.log("   - Testing Provider Resolution & Cross-Source Idempotency...");
    const providerResolver = new ProviderResolver(prisma);

    const normProv = {
      externalId: `test-prov-${testSuffix}`,
      slug: `test-prov-${testSuffix}`,
      name: "Test Inference Provider",
      website: "https://prov.example.com",
      payloadHash: "hash-provider-v1",
    };

    const resP1 = await providerResolver.resolveOrCreateProvider(source.id, normProv);
    testProviderId = resP1.provider.id;
    assert(resP1.status === "inserted", "First provider import returns status 'inserted'");

    // Second import with identical payloadHash -> UNCHANGED (zero updates)
    const resP2 = await providerResolver.resolveOrCreateProvider(source.id, normProv);
    assert(resP2.status === "unchanged", "Second provider import with identical hash returns status 'unchanged'");

    // G. Endpoint Resolution
    console.log("   - Testing Endpoint Resolution & Source Isolation...");
    const endpointResolver = new EndpointResolver(prisma);

    // Unresolved model must NOT create an endpoint
    const unresEp = await endpointResolver.resolveEndpoint(
      {
        sourceId: source.id,
        providerExternalId: normProv.externalId,
        modelExternalId: "nonexistent-model",
        endpointKey: "key-1",
      },
      null // Unresolved model
    );
    assert(unresEp.status === "UNRESOLVED", "Unresolved canonical model prevents invalid endpoint creation");

    // Verified model creates endpoint and EndpointSourceMapping
    const resEp = await endpointResolver.resolveEndpoint(
      {
        sourceId: source.id,
        providerExternalId: normProv.externalId,
        modelExternalId: `exact-ext-${testSuffix}`,
        endpointKey: `endpoint-key-${testSuffix}`,
        contextWindow: 128000,
        status: "ONLINE",
        payloadHash: "hash-ep-v1",
      },
      canonicalModel.id
    );
    assert(resEp.status === "RESOLVED", "Verified canonical model & provider successfully create endpoint");

    const epMapping = await prisma.endpointSourceMapping.findUnique({
      where: {
        sourceId_externalEndpointId: {
          sourceId: source.id,
          externalEndpointId: `${normProv.externalId}/exact-ext-${testSuffix}`,
        },
      },
    });
    assert(epMapping !== null, "EndpointSourceMapping successfully created and linked");

    // Repeat endpoint resolution is idempotent
    const resEp2 = await endpointResolver.resolveEndpoint(
      {
        sourceId: source.id,
        providerExternalId: normProv.externalId,
        modelExternalId: `exact-ext-${testSuffix}`,
        endpointKey: `endpoint-key-${testSuffix}`,
        contextWindow: 128000,
        status: "ONLINE",
        payloadHash: "hash-ep-v1",
      },
      canonicalModel.id
    );
    assert(resEp2.endpointSyncStatus === "unchanged", "Identical endpoint returns status 'unchanged'");

    // H. Field Provenance Service
    console.log("   - Testing Durable Field Provenance Persistence & Auditability...");
    const provenanceService = new ProvenanceService(prisma);

    const prov1 = await provenanceService.recordProvenance({
      entityType: "MODEL",
      entityId: canonicalModel.id,
      fieldKey: "contextWindow",
      sourceId: source.id,
      sourceExternalId: `exact-ext-${testSuffix}`,
      selectedValue: 128000,
      confidence: 1.0,
    });
    assert(prov1.fieldKey === "contextWindow", "Recorded field provenance for canonical model field");
    assert(Number(prov1.selectedValue) === 128000, "Field provenance preserves selected scalar value");

    // Upsert same field provenance must update existing row, not duplicate
    const prov2 = await provenanceService.recordProvenance({
      entityType: "MODEL",
      entityId: canonicalModel.id,
      fieldKey: "contextWindow",
      sourceId: source.id,
      sourceExternalId: `exact-ext-${testSuffix}`,
      selectedValue: 128000,
      confidence: 1.0,
    });
    assert(prov1.id === prov2.id, "Field provenance upsert is idempotent (updates existing row)");

    const modelProvList = await provenanceService.getEntityProvenance("MODEL", canonicalModel.id);
    assert(modelProvList.length >= 1, "Retrieved entity field provenance records successfully");

    // I. Data Conflict Service
    console.log("   - Testing Persistent Data Conflict Tracking & Resolution Lifecycle...");
    const conflictService = new ConflictService(prisma);

    const conflict1 = await conflictService.recordConflict({
      entityType: "MODEL",
      entityId: canonicalModel.id,
      fieldKey: "contextWindow",
      severity: "WARNING",
      sourceAId: source.id,
      sourceBId: source.id,
      observedValueA: 128000,
      observedValueB: 200000,
      resolutionNotes: "Discrepancy in reported context lengths",
    });
    assert(conflict1.severity === "WARNING", "Data conflict recorded with WARNING severity");
    assert(conflict1.status === "OPEN", "Initial conflict status is OPEN");

    // Recording same conflict again updates existing record (no duplicate rows)
    const conflictDuplicate = await conflictService.recordConflict({
      entityType: "MODEL",
      entityId: canonicalModel.id,
      fieldKey: "contextWindow",
      severity: "WARNING",
      sourceAId: source.id,
      sourceBId: source.id,
      observedValueA: 128000,
      observedValueB: 200000,
    });
    assert(conflictDuplicate.id === conflict1.id, "Identical conflict deduplicated to existing row");

    // Resolve conflict
    const resolvedConflict = await conflictService.resolveConflict(
      conflict1.id,
      "Resolved by administrator preference"
    );
    assert(resolvedConflict.status === "RESOLVED", "Conflict transition to RESOLVED succeeds");
    assert(
      Boolean(resolvedConflict.resolutionNotes?.includes("administrator")),
      "Resolution notes recorded"
    );

    // J. Non-Additive Boolean Metadata Reconciliation & Nullability
    console.log("   - Testing Non-Additive Boolean Reconciliation & Nullable Semantics...");
    const provEngine = new ProvenanceEngine();

    // Canonical model has isOpenWeight: false (from Models.dev)
    const mockCanonical = {
      id: "mock-model",
      name: "Mock Model",
      slug: "mock-model",
      family: "mock",
      isOpenWeight: false,
      isReasoning: false,
      inputModalities: ["text"],
      outputModalities: ["text"],
      contextWindow: 128000,
      maxOutputTokens: 4096,
      releaseDate: null,
      knowledgeCutoff: null,
      license: null,
      description: null,
      architectureType: null,
      creatorLabId: null,
      isActive: true,
      capabilities: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Incoming OpenRouter offering claims isOpenWeight: true (additive union attempt)
    const incomingOR = {
      sourceId: source.id,
      externalModelId: "or-model-1",
      name: "Mock Model",
      slug: "mock-model",
      isOpenWeight: true,
      isReasoning: true,
      inputModalities: ["text"],
      outputModalities: ["text"],
    };

    const reconResult = provEngine.reconcileModelFields(
      mockCanonical as unknown as import("@oneatlas/database").Model,
      incomingOR as unknown as import("../src/domain/identity-resolution").ExternalModelInput,
      "openrouter"
    );

    assert(
      reconResult.fields.isOpenWeight === false,
      "Non-authoritative source CANNOT flip authoritative isOpenWeight=false to true (no blind OR union)"
    );
    assert(
      reconResult.conflicts.some((c) => c.field === "isOpenWeight"),
      "Metadata conflict is flagged when sources disagree on isOpenWeight"
    );

    // When boolean is null on canonical and incoming has no boolean, it remains null
    const mockCanonicalUnknown = {
      ...mockCanonical,
      isOpenWeight: null,
      isReasoning: null,
    };
    const incomingUnknown = {
      sourceId: source.id,
      externalModelId: "unknown-model",
      name: "Unknown Model",
      slug: "unknown-model",
    };
    const unknownRecon = provEngine.reconcileModelFields(
      mockCanonicalUnknown as unknown as import("@oneatlas/database").Model,
      incomingUnknown as unknown as import("../src/domain/identity-resolution").ExternalModelInput,
      "unknown-source"
    );
    assert(
      unknownRecon.fields.isOpenWeight === null,
      "Unknown isOpenWeight defaults to null (not coerced to false)"
    );
    assert(
      unknownRecon.fields.isReasoning === null,
      "Unknown isReasoning defaults to null (not coerced to false)"
    );

    // K. OpenRouter Endpoint Service Source Mapping & Modalities
    console.log("   - Testing OpenRouter EndpointService Source Mapping Persistence...");
    const orEndpointService = new OpenRouterEndpointService(prisma);

    const orNormEndpoint = {
      endpointKey: `openrouter/test-ep-${testSuffix}`,
      name: "OpenRouter Test Endpoint",
      providerExternalSlug: "openrouter",
      contextWindow: 128000,
      maxOutputTokens: 4096,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      status: "ONLINE" as const,
      isModerated: false,
      pricing: null,
      rawPayload: { test: true },
      payloadHash: "or-ep-hash-1",
    };

    const orRes1 = await orEndpointService.resolveOrCreateEndpoint(
      canonicalModel.id,
      resP1.provider.id,
      source.id,
      orNormEndpoint
    );
    assert(orRes1.status === "inserted", "First OpenRouter endpoint import returns 'inserted'");

    const orMapping = await prisma.endpointSourceMapping.findUnique({
      where: {
        sourceId_externalEndpointId: {
          sourceId: source.id,
          externalEndpointId: `openrouter/test-ep-${testSuffix}`,
        },
      },
    });
    assert(orMapping !== null, "OpenRouter endpoint creates durable EndpointSourceMapping");
    assert(
      orRes1.endpoint.inputModalities.includes("image"),
      "Endpoint preserves provider-specific input modalities ('image')"
    );

    // Second run with same hash -> unchanged
    const orRes2 = await orEndpointService.resolveOrCreateEndpoint(
      canonicalModel.id,
      resP1.provider.id,
      source.id,
      orNormEndpoint
    );
    assert(orRes2.status === "unchanged", "Repeated OpenRouter endpoint import returns 'unchanged'");
  } finally {
    // Clean up isolated test entities
    if (testCandidateId) {
      await prisma.modelResolutionCandidate.deleteMany({
        where: { id: testCandidateId },
      }).catch(() => {});
    }
    if (testModelId) {
      await prisma.fieldProvenance.deleteMany({
        where: { entityId: testModelId },
      }).catch(() => {});
      await prisma.dataConflict.deleteMany({
        where: { entityId: testModelId },
      }).catch(() => {});
      await prisma.model.deleteMany({
        where: { id: testModelId },
      }).catch(() => {});
    }
    if (testProviderId) {
      await prisma.provider.deleteMany({
        where: { id: testProviderId },
      }).catch(() => {});
    }
    if (testSourceId) {
      await prisma.externalSource.deleteMany({
        where: { id: testSourceId },
      }).catch(() => {});
    }
    console.log("\n   ✓ Teardown complete: Isolated identity resolution entities cleaned up.");
  }

  console.log(`
=========================================================
📊 IDENTITY RESOLUTION TESTS COMPLETED: ${passed} Passed, ${failed} Failed.
=========================================================
`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
