import type { Model } from "@oneatlas/database";
import type { ExternalModelInput, FieldConflict } from "./types";

export interface ReconciledModelFields {
  name: string;
  family?: string | null;
  releaseDate?: Date | null;
  knowledgeCutoff?: string | null;
  license?: string | null;
  isOpenWeight: boolean | null;
  isReasoning: boolean | null;
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
 * - STRICTLY eliminates unsafe additive boolean unions (no logical OR for isOpenWeight or isReasoning).
 * - Distinguishes canonical model modalities from provider-specific endpoint modalities.
 * - Respects source authority for specific fields (e.g. Models.dev for family, releaseDate, license, open-weight status).
 * - Preserves existing verified fields against null or inferior incoming values.
 */
export class ProvenanceEngine {
  /**
   * Reconciles canonical model fields between an existing canonical Model and an incoming source update.
   */
  reconcileModelFields(
    canonical: Model,
    incoming: ExternalModelInput,
    sourceSlug: string
  ): {
    fields: ReconciledModelFields;
    hasChanges: boolean;
    changedFields: string[];
    conflicts: FieldConflict[];
  } {
    const isModelsDev = sourceSlug === "modelsdev" || sourceSlug === "models_dev";
    const changedFields: string[] = [];
    const conflicts: FieldConflict[] = [];

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

    // 7. Modalities: Canonical model modalities vs Provider endpoint modalities
    // Rule: Do NOT blindly union modalities across providers.
    // Canonical modalities are authoritative from model catalog.
    let inputModalities = canonical.inputModalities;
    let outputModalities = canonical.outputModalities;

    if (isModelsDev && incoming.inputModalities && incoming.inputModalities.length > 0) {
      if (JSON.stringify(inputModalities.slice().sort()) !== JSON.stringify(incoming.inputModalities.slice().sort())) {
        inputModalities = incoming.inputModalities;
        changedFields.push("inputModalities");
      }
    } else if (incoming.inputModalities && incoming.inputModalities.length > 0) {
      const canonicalSet = new Set(canonical.inputModalities);
      const incomingSet = new Set(incoming.inputModalities);
      const hasVisionDiff =
        (canonicalSet.has("image") && !incomingSet.has("image")) ||
        (!canonicalSet.has("image") && incomingSet.has("image"));
      if (hasVisionDiff) {
        conflicts.push({
          field: "inputModalities",
          canonicalValue: canonical.inputModalities,
          incomingValue: incoming.inputModalities,
          sourceId: incoming.sourceId,
          severity: "CRITICAL",
          reason: "Multimodal capability disagreement: incoming provider offering diverges from canonical model input modalities.",
        });
      }
    }

    if (isModelsDev && incoming.outputModalities && incoming.outputModalities.length > 0) {
      if (JSON.stringify(outputModalities.slice().sort()) !== JSON.stringify(incoming.outputModalities.slice().sort())) {
        outputModalities = incoming.outputModalities;
        changedFields.push("outputModalities");
      }
    }

    // 8. Open-weight status: NO UNSAFE LOGICAL OR
    // Nullable semantics: null = unknown, true = open-weight, false = proprietary.
    let isOpenWeight = canonical.isOpenWeight;
    if (incoming.isOpenWeight !== undefined && incoming.isOpenWeight !== null) {
      if (canonical.isOpenWeight === null || canonical.isOpenWeight === undefined) {
        isOpenWeight = incoming.isOpenWeight;
        changedFields.push("isOpenWeight");
      } else if (canonical.isOpenWeight !== incoming.isOpenWeight) {
        conflicts.push({
          field: "isOpenWeight",
          canonicalValue: canonical.isOpenWeight,
          incomingValue: incoming.isOpenWeight,
          sourceId: incoming.sourceId,
          severity: "CRITICAL",
          reason: `Disagreement on open-weight status: canonical=${canonical.isOpenWeight}, incoming=${incoming.isOpenWeight}`,
        });

        // Models.dev is authoritative for catalog open-weight metadata
        if (isModelsDev) {
          isOpenWeight = incoming.isOpenWeight;
          changedFields.push("isOpenWeight");
        }
      }
    }

    // 9. Reasoning status: NO UNSAFE LOGICAL OR
    let isReasoning = canonical.isReasoning;
    if (incoming.isReasoning !== undefined && incoming.isReasoning !== null) {
      if (canonical.isReasoning === null || canonical.isReasoning === undefined) {
        isReasoning = incoming.isReasoning;
        changedFields.push("isReasoning");
      } else if (canonical.isReasoning !== incoming.isReasoning) {
        conflicts.push({
          field: "isReasoning",
          canonicalValue: canonical.isReasoning,
          incomingValue: incoming.isReasoning,
          sourceId: incoming.sourceId,
          severity: "CRITICAL",
          reason: `Disagreement on reasoning status: canonical=${canonical.isReasoning}, incoming=${incoming.isReasoning}`,
        });

        if (isModelsDev) {
          isReasoning = incoming.isReasoning;
          changedFields.push("isReasoning");
        }
      }
    }

    // 10. Description: preserve canonical if present
    let description = canonical.description;
    if (!description && incoming.description) {
      description = incoming.description;
      changedFields.push("description");
    }

    const name = canonical.name;

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
      conflicts,
    };
  }
}
