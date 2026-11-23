import "./env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, CandidateStatus } from "@oneatlas/database";
import { ReviewService } from "../src/domain/identity-resolution/review.service";

/**
 * Command-Line Candidate Review & Decision Tool
 *
 * Usage:
 *   npx tsx scripts/review-model-candidates.ts --list
 *   npx tsx scripts/review-model-candidates.ts --inspect <candidateId>
 *   npx tsx scripts/review-model-candidates.ts --approve <candidateId> --confirm [--notes "..."]
 *   npx tsx scripts/review-model-candidates.ts --reject <candidateId> --confirm [--notes "..."]
 */

function printHelp() {
  console.log(`
=========================================================
   AI DETAILS MODEL RESOLUTION CANDIDATE REVIEW CLI
=========================================================

Commands:
  --list                    List pending model resolution candidates.
  --status <status>         Filter list by status: PENDING, APPROVED, REJECTED, NEEDS_REVIEW, STALE.
  --inspect <candidateId>   Inspect evidence, conflicts, and score for a specific candidate.
  --approve <candidateId>   Approve candidate and create authoritative ModelSourceMapping.
  --reject <candidateId>    Reject candidate to prevent repeated suggestion.
  --confirm                 Required flag to confirm approval or rejection database writes.
  --notes <text>            Optional reviewer notes to persist with approval/rejection.
  --help                    Display this documentation.
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const isList = args.includes("--list");
  const isConfirm = args.includes("--confirm") || args.includes("--yes");

  let statusFilter: CandidateStatus = "PENDING";
  const statusIndex = args.indexOf("--status");
  if (statusIndex !== -1 && args[statusIndex + 1]) {
    statusFilter = args[statusIndex + 1].toUpperCase() as CandidateStatus;
  }

  let inspectId: string | undefined;
  const inspectIndex = args.indexOf("--inspect");
  if (inspectIndex !== -1 && args[inspectIndex + 1]) {
    inspectId = args[inspectIndex + 1];
  }

  let approveId: string | undefined;
  const approveIndex = args.indexOf("--approve");
  if (approveIndex !== -1 && args[approveIndex + 1]) {
    approveId = args[approveIndex + 1];
  }

  let rejectId: string | undefined;
  const rejectIndex = args.indexOf("--reject");
  if (rejectIndex !== -1 && args[rejectIndex + 1]) {
    rejectId = args[rejectIndex + 1];
  }

  let notes: string | undefined;
  const notesIndex = args.indexOf("--notes");
  if (notesIndex !== -1 && args[notesIndex + 1]) {
    notes = args[notesIndex + 1];
  }

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is missing.");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  const reviewService = new ReviewService(prisma);

  try {
    // 1. List Candidates
    if (isList) {
      console.log(`\nFetching candidates with status: ${statusFilter}...`);
      const candidates = await reviewService.listCandidates(statusFilter);

      console.log(`\nFound ${candidates.length} candidate(s):\n`);
      for (const c of candidates) {
        console.log(`• ID: [${c.id}] | Status: ${c.status} | Score: ${c.confidenceScore}/100`);
        console.log(`  Source: ${c.source.slug} | External Model: ${c.externalModelId}`);
        console.log(`  Proposed Canonical Model: [${c.candidateModel.slug}] "${c.candidateModel.name}" (${c.candidateModel.id})`);
        console.log(`  Created: ${c.createdAt.toISOString()}${c.notes ? ` | Notes: ${c.notes}` : ""}`);
        console.log("------------------------------------------------------------------");
      }
      return;
    }

    // 2. Inspect Single Candidate
    if (inspectId) {
      console.log(`\nInspecting candidate '${inspectId}'...`);
      const candidate = await reviewService.getCandidate(inspectId);

      if (!candidate) {
        console.error(`❌ Candidate '${inspectId}' not found.`);
        process.exit(1);
      }

      console.log("\n=========================================================");
      console.log(`CANDIDATE DETAILS: ${candidate.id}`);
      console.log("=========================================================");
      console.log(`• Status:            ${candidate.status}`);
      console.log(`• Confidence Score:  ${candidate.confidenceScore}/100`);
      console.log(`• Strategy:          ${candidate.matchingStrategy}`);
      console.log(`• Source:            ${candidate.source.slug} (${candidate.source.name})`);
      console.log(`• External Model ID: ${candidate.externalModelId}`);
      console.log(`• Candidate Model:   [${candidate.candidateModel.slug}] "${candidate.candidateModel.name}"`);
      console.log(`• Candidate Model ID:${candidate.candidateModel.id}`);
      console.log(`• Created At:        ${candidate.createdAt.toISOString()}`);
      if (candidate.reviewedAt) console.log(`• Reviewed At:       ${candidate.reviewedAt.toISOString()}`);
      if (candidate.notes) console.log(`• Reviewer Notes:    ${candidate.notes}`);

      console.log("\nEVIDENCE LOG:");
      const evidence = candidate.evidence as Array<{ signal: string; scoreContribution: number; description: string }>;
      if (Array.isArray(evidence)) {
        for (const ev of evidence) {
          console.log(`  - [${ev.signal}] (${ev.scoreContribution >= 0 ? "+" : ""}${ev.scoreContribution} pts): ${ev.description}`);
        }
      } else {
        console.log("  " + JSON.stringify(candidate.evidence, null, 2));
      }

      console.log("=========================================================");
      return;
    }

    // 3. Approve Candidate
    if (approveId) {
      if (!isConfirm) {
        console.error("❌ Refusing to approve without explicit confirmation.");
        console.log(`To approve this candidate, rerun with --confirm:`);
        console.log(`  npx tsx scripts/review-model-candidates.ts --approve ${approveId} --confirm`);
        process.exit(1);
      }

      console.log(`Approving candidate '${approveId}'...`);
      const { mapping, candidate } = await reviewService.approveCandidate(
        approveId,
        notes || "Approved via review CLI."
      );

      console.log("\n✅ CANDIDATE SUCCESSFULLY APPROVED!");
      console.log(`• Candidate ID:        ${candidate.id}`);
      console.log(`• Status:              ${candidate.status}`);
      console.log(`• Source Mapping ID:   ${mapping.id}`);
      console.log(`• Source ID:           ${mapping.sourceId}`);
      console.log(`• External Model ID:   ${mapping.externalModelId}`);
      console.log(`• Canonical Model ID:  ${mapping.modelId}`);
      return;
    }

    // 4. Reject Candidate
    if (rejectId) {
      if (!isConfirm) {
        console.error("❌ Refusing to reject without explicit confirmation.");
        console.log(`To reject this candidate, rerun with --confirm:`);
        console.log(`  npx tsx scripts/review-model-candidates.ts --reject ${rejectId} --confirm`);
        process.exit(1);
      }

      console.log(`Rejecting candidate '${rejectId}'...`);
      const candidate = await reviewService.rejectCandidate(
        rejectId,
        notes || "Rejected via review CLI."
      );

      console.log("\n✅ CANDIDATE SUCCESSFULLY REJECTED!");
      console.log(`• Candidate ID: ${candidate.id}`);
      console.log(`• Status:       ${candidate.status}`);
      console.log(`• Reviewed At:  ${candidate.reviewedAt?.toISOString()}`);
      return;
    }
  } catch (error) {
    console.error("❌ Review operation failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
