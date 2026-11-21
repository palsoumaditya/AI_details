import { PrismaClient, Model } from "@/generated/prisma/client";
import type { ExternalModelInput, MatchEvidence } from "./types";
import { createEvidence } from "./confidence";

export interface ExactMatchResult {
  isMatch: boolean;
  model?: Model;
  evidence: MatchEvidence[];
}

export class ExactMatcher {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Strategy 1: Existing exact source mapping (sourceId + externalModelId).
   * This represents the strongest possible identity link (100% confidence).
   */
  async match(input: ExternalModelInput): Promise<ExactMatchResult> {
    const mapping = await this.prisma.modelSourceMapping.findUnique({
      where: {
        sourceId_externalModelId: {
          sourceId: input.sourceId,
          externalModelId: input.externalModelId,
        },
      },
      include: {
        model: true,
      },
    });

    if (mapping) {
      return {
        isMatch: true,
        model: mapping.model,
        evidence: [
          createEvidence(
            "EXACT_SOURCE_MAPPING",
            `Found existing ModelSourceMapping (${mapping.id}) for source ${input.sourceId} and external ID '${input.externalModelId}' linked to canonical model '${mapping.model.slug}' (${mapping.model.id})`
          ),
        ],
      };
    }

    return {
      isMatch: false,
      evidence: [],
    };
  }
}
