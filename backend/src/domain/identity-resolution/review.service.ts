import { PrismaClient, CandidateStatus, ModelResolutionCandidate, ModelSourceMapping } from "@oneatlas/database";

export interface CandidateReviewDetail extends ModelResolutionCandidate {
  candidateModel: {
    id: string;
    slug: string;
    name: string;
    family: string | null;
  };
  source: {
    id: string;
    slug: string;
    name: string;
  };
}

export class ReviewService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Lists resolution candidates by status (default: PENDING).
   */
  async listCandidates(status: CandidateStatus = "PENDING", sourceId?: string): Promise<CandidateReviewDetail[]> {
    return this.prisma.modelResolutionCandidate.findMany({
      where: {
        status,
        ...(sourceId ? { sourceId } : {}),
      },
      include: {
        candidateModel: {
          select: {
            id: true,
            slug: true,
            name: true,
            family: true,
          },
        },
        source: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
      orderBy: [
        { confidenceScore: "desc" },
        { createdAt: "desc" },
      ],
    });
  }

  /**
   * Retrieves single candidate with model and source relations.
   */
  async getCandidate(id: string): Promise<CandidateReviewDetail | null> {
    return this.prisma.modelResolutionCandidate.findUnique({
      where: { id },
      include: {
        candidateModel: {
          select: {
            id: true,
            slug: true,
            name: true,
            family: true,
          },
        },
        source: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Approves a candidate:
   * 1. Validates that no mapping already exists for (sourceId, externalModelId).
   * 2. Creates the authoritative ModelSourceMapping.
   * 3. Sets candidate status = APPROVED, reviewedAt = now.
   * 4. Marks any other competing pending candidates for the same externalModelId as STALE.
   */
  async approveCandidate(
    candidateId: string,
    notes?: string
  ): Promise<{ mapping: ModelSourceMapping; candidate: ModelResolutionCandidate }> {
    const candidate = await this.prisma.modelResolutionCandidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new Error(`Candidate with ID '${candidateId}' not found.`);
    }

    if (candidate.status === "APPROVED") {
      throw new Error(`Candidate '${candidateId}' has already been approved.`);
    }

    // Verify uniqueness
    const existingMapping = await this.prisma.modelSourceMapping.findUnique({
      where: {
        sourceId_externalModelId: {
          sourceId: candidate.sourceId,
          externalModelId: candidate.externalModelId,
        },
      },
    });

    let mapping: ModelSourceMapping;

    if (existingMapping) {
      if (existingMapping.modelId !== candidate.candidateModelId) {
        throw new Error(
          `Conflict: Source mapping already exists for ${candidate.externalModelId} pointing to model ${existingMapping.modelId}, differing from candidate model ${candidate.candidateModelId}.`
        );
      }
      mapping = existingMapping;
    } else {
      // Create authoritative mapping
      mapping = await this.prisma.modelSourceMapping.create({
        data: {
          sourceId: candidate.sourceId,
          externalModelId: candidate.externalModelId,
          modelId: candidate.candidateModelId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Update approved candidate
    const updatedCandidate = await this.prisma.modelResolutionCandidate.update({
      where: { id: candidateId },
      data: {
        status: "APPROVED",
        notes: notes || candidate.notes,
        reviewedAt: new Date(),
      },
    });

    // Mark other pending candidates for this same external ID as STALE
    await this.prisma.modelResolutionCandidate.updateMany({
      where: {
        sourceId: candidate.sourceId,
        externalModelId: candidate.externalModelId,
        id: { not: candidateId },
        status: "PENDING",
      },
      data: {
        status: "STALE",
        notes: `Superseded by approval of candidate '${candidateId}'.`,
        reviewedAt: new Date(),
      },
    });

    return { mapping, candidate: updatedCandidate };
  }

  /**
   * Rejects a candidate:
   * Sets status = REJECTED, prevents re-suggestion on identical payloads.
   */
  async rejectCandidate(
    candidateId: string,
    notes?: string
  ): Promise<ModelResolutionCandidate> {
    const candidate = await this.prisma.modelResolutionCandidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new Error(`Candidate with ID '${candidateId}' not found.`);
    }

    return this.prisma.modelResolutionCandidate.update({
      where: { id: candidateId },
      data: {
        status: "REJECTED",
        notes: notes || "Rejected during manual review.",
        reviewedAt: new Date(),
      },
    });
  }
}
