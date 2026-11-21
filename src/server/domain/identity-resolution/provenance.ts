import type { Model } from "@/generated/prisma/client";
import type { ExternalModelInput } from "./types";

export interface ReconciledModelFields {
  name: string;
  family?: string | null;
  releaseDate?: Date | null;
  knowledgeCutoff?: string | null;
  license?: string | null;
  isOpenWeight: boolean;
  isReasoning: boolean;
  contextWindow?: number | null;
  maxOutputTokens?: number | null;
  inputModalities: string[];
  outputModalities: string[];
  description?: string | null;
}

/**
 * Field Ownership Policy Engine
 *
 * Implements deterministic reconciliation rules across sources:
 * - Prevents last-write-wins overwriting.
 * - Respects source authority for specific fields (e.g. Models.dev for family, releaseDate, license).
 * - Preserves existing high-quality verified fields against null or inferior incoming values.
 */
export class ProvenanceEngine {
  /**
   * Reconciles canonical model fields between an existing canonical Model and an incoming source update.
   */
  reconcileModelFields(
    canonical: Model,
    incoming: ExternalModelInput,
    sourceSlug: string
  ): { fields: ReconciledModelFields; hasChanges: boolean; changedFields: string[] } {
    const isModelsDev = sourceSlug === "modelsdev" || sourceSlug === "models_dev";
    const changedFields: string[] = [];

    // 1. Family: Models.dev is authoritative. If canonical has none, incoming can populate.
    let family = canonical.family;
    if (isModelsDev && incoming.family && incoming.family !== canonical.family) {
      family = incoming.family;
      changedFields.push("family");
    } else if (!family && incoming.family) {
      family = incoming.family;
      changedFields.push("family");
    }

    // 2. Release Date: Models.dev is authoritative
    let releaseDate = canonical.releaseDate;
    if (isModelsDev && incoming.releaseDate && incoming.releaseDate.getTime() !== canonical.releaseDate?.getTime()) {
      releaseDate = incoming.releaseDate;
      changedFields.push("releaseDate");
    } else if (!releaseDate && incoming.releaseDate) {
      releaseDate = incoming.releaseDate;
      changedFields.push("releaseDate");
    }

    // 3. Knowledge Cutoff: Models.dev is authoritative
    let knowledgeCutoff = canonical.knowledgeCutoff;
    if (isModelsDev && incoming.knowledgeCutoff && incoming.knowledgeCutoff !== canonical.knowledgeCutoff) {
      knowledgeCutoff = incoming.knowledgeCutoff;
      changedFields.push("knowledgeCutoff");
    } else if (!knowledgeCutoff && incoming.knowledgeCutoff) {
      knowledgeCutoff = incoming.knowledgeCutoff;
      changedFields.push("knowledgeCutoff");
    }

    // 4. License: Models.dev is authoritative
    let license = canonical.license;
    if (isModelsDev && incoming.license && incoming.license !== canonical.license) {
      license = incoming.license;
      changedFields.push("license");
    } else if (!license && incoming.license) {
      license = incoming.license;
      changedFields.push("license");
    }

    // 5. Context Window: Canonical model level (preserve max or verified, non-null)
    let contextWindow = canonical.contextWindow;
    if (!contextWindow && incoming.contextWindow) {
      contextWindow = incoming.contextWindow;
      changedFields.push("contextWindow");
    }

    // 6. Max Output Tokens: non-destructive update
    let maxOutputTokens = canonical.maxOutputTokens;
    if (!maxOutputTokens && incoming.maxOutputTokens) {
      maxOutputTokens = incoming.maxOutputTokens;
      changedFields.push("maxOutputTokens");
    }

    // 7. Modalities: merge distinct modalities
    const inputSet = new Set([...canonical.inputModalities, ...(incoming.inputModalities || [])]);
    const outputSet = new Set([...canonical.outputModalities, ...(incoming.outputModalities || [])]);
    const inputModalities = Array.from(inputSet);
    const outputModalities = Array.from(outputSet);

    if (inputModalities.length !== canonical.inputModalities.length) {
      changedFields.push("inputModalities");
    }
    if (outputModalities.length !== canonical.outputModalities.length) {
      changedFields.push("outputModalities");
    }

    // 8. Open-weight and Reasoning: once true, stay true (additive capability)
    let isOpenWeight = canonical.isOpenWeight;
    if (!isOpenWeight && incoming.isOpenWeight) {
      isOpenWeight = true;
      changedFields.push("isOpenWeight");
    }

    let isReasoning = canonical.isReasoning;
    if (!isReasoning && incoming.isReasoning) {
      isReasoning = true;
      changedFields.push("isReasoning");
    }

    // 9. Description: keep canonical if present, else incoming
    let description = canonical.description;
    if (!description && incoming.description) {
      description = incoming.description;
      changedFields.push("description");
    }

    const name = canonical.name; // Keep verified canonical model name

    return {
      fields: {
        name,
        family,
        releaseDate,
        knowledgeCutoff,
        license,
        isOpenWeight,
        isReasoning,
        contextWindow,
        maxOutputTokens,
        inputModalities,
        outputModalities,
        description,
      },
      hasChanges: changedFields.length > 0,
      changedFields,
    };
  }
}
