import "./env";
import * as fs from "fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@oneatlas/database";
import { ModelResolver } from "../src/domain/identity-resolution/model-resolver";
import { CandidateGenerator } from "../src/domain/identity-resolution/candidate-generator";
import type { ExternalModelInput, ResolutionResult, FieldConflict } from "../src/domain/identity-resolution/types";

/**
 * Command-Line Identity Analysis & Duplicate Audit Tool
 *
 * Usage:
 *   npx tsx scripts/analyze-model-identities.ts [options]
 *
 * Options:
 *   --dry-run             Run analysis in simulation mode (default: true)
 *   --source <slug>       Filter by source: 'openrouter', 'modelsdev', or all
 *   --limit <number>      Limit number of records analyzed
 *   --include-unresolved  Include full detail for unresolved models
 *   --export <filepath>   Export full audit results to JSON
 */

function printHelp() {
  console.log(`
=========================================================
   ONEATLAS MODEL IDENTITY & DUPLICATE AUDIT CLI
=========================================================
Options:
  --dry-run             Analyze without persisting candidate records.
  --persist             Persist generated candidates into database for review.
  --source <slug>       Scope to 'openrouter', 'modelsdev', or all sources.
  --limit <n>           Limit number of records analyzed.
  --include-unresolved  Show detailed diagnostics for unresolved records.
  --export <file.json>  Export structured audit results to JSON file.
  --help                Display this message.
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const isPersist = args.includes("--persist");
  const isDryRun = !isPersist || args.includes("--dry-run");
  const includeUnresolved = args.includes("--include-unresolved");

  let sourceSlug: string | undefined;
  const sourceIndex = args.indexOf("--source");
  if (sourceIndex !== -1 && args[sourceIndex + 1]) {
    sourceSlug = args[sourceIndex + 1].toLowerCase();
  }

  let limit: number | undefined;
  const limitIndex = args.indexOf("--limit");
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    const parsed = parseInt(args[limitIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) limit = parsed;
  }

  let exportPath: string | undefined;
  const exportIndex = args.indexOf("--export");
  if (exportIndex !== -1 && args[exportIndex + 1]) {
    exportPath = args[exportIndex + 1];
  }

  console.log(`
=========================================================
   ONEATLAS MODEL IDENTITY RESOLUTION & AUDIT
=========================================================
• Mode:               ${isDryRun ? "DRY RUN (Analysis Only)" : "PERSIST CANDIDATES"}
• Target Source:      ${sourceSlug || "All Active Sources"}
• Model Limit:        ${limit ?? "All Records"}
• Include Unresolved: ${includeUnresolved ? "Yes" : "No"}
• Export Path:        ${exportPath || "None"}
=========================================================
`);

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is missing.");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  const resolver = new ModelResolver(prisma);
  const candidateGenerator = new CandidateGenerator(prisma);

  try {
    // 1. Fetch available external sources
    const sources = await prisma.externalSource.findMany({
      where: sourceSlug ? { slug: sourceSlug } : { isActive: true },
    });

    if (sources.length === 0) {
      console.error(`❌ No external sources found matching '${sourceSlug}'.`);
      process.exit(1);
    }

    // 2. Fetch canonical models in DB
    const allCanonicalModels = await prisma.model.findMany({
      include: {
        sourceMappings: { include: { source: true } },
        labs: { include: { aiLab: true } },
      },
    });

    console.log(`Loaded ${allCanonicalModels.length} canonical models currently in database.`);

    // 3. Section 12: Duplicate Canonical Model Audit
    console.log("\n---------------------------------------------------------");
    console.log("   CANONICAL MODEL DUPLICATE AUDIT");
    console.log("---------------------------------------------------------");

    const duplicateGroups: Array<{
      modelA: { id: string; slug: string; name: string };
      modelB: { id: string; slug: string; name: string };
      score: number;
      evidence: string[];
      conflicts: FieldConflict[];
      recommendedAction: string;
    }> = [];

    for (let i = 0; i < allCanonicalModels.length; i++) {
      for (let j = i + 1; j < allCanonicalModels.length; j++) {
        const mA = allCanonicalModels[i];
        const mB = allCanonicalModels[j];

        // Check if mA and mB might be duplicate versions
        const inputA: ExternalModelInput = {
          sourceId: "internal",
          externalModelId: mA.slug,
          name: mA.name,
          family: mA.family,
          contextWindow: mA.contextWindow,
          isOpenWeight: mA.isOpenWeight,
          isReasoning: mA.isReasoning,
        };

        const candidates = await candidateGenerator.generateCandidates(inputA, [mB]);
        if (candidates.length > 0 && candidates[0].confidenceScore >= 50) {
          const match = candidates[0];
          duplicateGroups.push({
            modelA: { id: mA.id, slug: mA.slug, name: mA.name },
            modelB: { id: mB.id, slug: mB.slug, name: mB.name },
            score: match.confidenceScore,
            evidence: match.evidence.map((e) => e.description),
            conflicts: match.conflicts,
            recommendedAction: match.recommendedAction,
          });
        }
      }
    }

    console.log(`Found ${duplicateGroups.length} potential duplicate canonical model pair(s):`);
    for (const dup of duplicateGroups) {
      console.log(`\n  • Model A: [${dup.modelA.slug}] "${dup.modelA.name}" (${dup.modelA.id})`);
      console.log(`    Model B: [${dup.modelB.slug}] "${dup.modelB.name}" (${dup.modelB.id})`);
      console.log(`    Confidence Score: ${dup.score}/100 | Recommended: ${dup.recommendedAction}`);
      console.log(`    Evidence:`);
      for (const ev of dup.evidence) console.log(`      - ${ev}`);
      if (dup.conflicts.length > 0) {
        console.log(`    Conflicts:`);
        for (const c of dup.conflicts) console.log(`      ⚠️ [${c.severity}] ${c.reason}`);
      }
    }

    // 4. Source-level Identity Resolution Analysis
    console.log("\n---------------------------------------------------------");
    console.log("   CROSS-SOURCE MODEL IDENTITY RESOLUTION AUDIT");
    console.log("---------------------------------------------------------");

    const analysisStats = {
      totalAnalyzed: 0,
      strategy1Exact: 0,
      strategy2Canonical: 0,
      strategy3Alias: 0,
      strategy4Candidates: 0,
      strategy5Unresolved: 0,
      totalConflicts: 0,
      criticalConflicts: 0,
    };

    const resolutionDetails: Array<{
      source: string;
      externalId: string;
      result: ResolutionResult;
    }> = [];

    for (const source of sources) {
      console.log(`\nAnalyzing source '${source.slug}' (${source.name})...`);

      // Retrieve source mappings or raw source records
      const mappings = await prisma.modelSourceMapping.findMany({
        where: { sourceId: source.id },
        include: { model: true },
        take: limit,
      });

      console.log(`Found ${mappings.length} existing ModelSourceMappings for '${source.slug}'.`);

      for (const msm of mappings) {
        analysisStats.totalAnalyzed++;

        const input: ExternalModelInput = {
          sourceId: source.id,
          externalModelId: msm.externalModelId,
          externalSlug: msm.externalSlug,
          name: msm.model.name,
          family: msm.model.family,
          contextWindow: msm.model.contextWindow,
          isOpenWeight: msm.model.isOpenWeight,
          isReasoning: msm.model.isReasoning,
        };

        const res = await resolver.resolveModel(input, { persistCandidates: !isDryRun });

        if (res.matchingStrategy === "STRATEGY_1_EXACT_SOURCE_MAPPING") analysisStats.strategy1Exact++;
        else if (res.matchingStrategy === "STRATEGY_2_AUTHORITATIVE_CANONICAL_ID") analysisStats.strategy2Canonical++;
        else if (res.matchingStrategy === "STRATEGY_3_EXPLICIT_ALIAS") analysisStats.strategy3Alias++;
        else if (res.matchingStrategy === "STRATEGY_4_HEURISTIC_CANDIDATE") analysisStats.strategy4Candidates++;
        else analysisStats.strategy5Unresolved++;

        if (res.conflicts.length > 0) {
          analysisStats.totalConflicts += res.conflicts.length;
          analysisStats.criticalConflicts += res.conflicts.filter((c) => c.severity === "CRITICAL").length;
        }

        resolutionDetails.push({
          source: source.slug,
          externalId: msm.externalModelId,
          result: res,
        });
      }
    }

    // 5. Summary Metrics
    console.log("\n=========================================================");
    console.log("   IDENTITY RESOLUTION AUDIT SUMMARY");
    console.log("=========================================================");
    console.log(`• Total Models Analyzed:              ${analysisStats.totalAnalyzed}`);
    console.log(`• Strategy 1 (Exact Mapping):          ${analysisStats.strategy1Exact}`);
    console.log(`• Strategy 2 (Authoritative ID):       ${analysisStats.strategy2Canonical}`);
    console.log(`• Strategy 3 (Explicit Verified Alias):${analysisStats.strategy3Alias}`);
    console.log(`• Strategy 4 (Heuristic Candidates):   ${analysisStats.strategy4Candidates}`);
    console.log(`• Strategy 5 (Unresolved):             ${analysisStats.strategy5Unresolved}`);
    console.log(`• Canonical Duplicate Groups Found:   ${duplicateGroups.length}`);
    console.log(`• Metadata Conflicts Detected:        ${analysisStats.totalConflicts} (${analysisStats.criticalConflicts} critical)`);
    console.log("=========================================================");

    // 6. Optional Export
    if (exportPath) {
      const exportData = {
        timestamp: new Date().toISOString(),
        mode: isDryRun ? "dry-run" : "applied",
        stats: analysisStats,
        duplicateGroups,
        resolutions: resolutionDetails,
      };
      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), "utf8");
      console.log(`\n📄 Successfully exported audit report to: ${exportPath}`);
    }
  } catch (error) {
    console.error("❌ Identity analysis failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
