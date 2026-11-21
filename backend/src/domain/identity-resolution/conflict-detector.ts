import type { Model } from "@oneatlas/database";
import type { ExternalModelInput, FieldConflict } from "./types";

export class ConflictDetector {
  /**
   * Detects metadata disagreements between an incoming source record and a canonical Model.
   */
  detectModelConflicts(canonical: Model, incoming: ExternalModelInput): FieldConflict[] {
    const conflicts: FieldConflict[] = [];

    // 1. Open-weight status conflict (CRITICAL)
    if (incoming.isOpenWeight !== undefined && incoming.isOpenWeight !== null) {
      if (canonical.isOpenWeight !== incoming.isOpenWeight) {
        conflicts.push({
          field: "isOpenWeight",
          canonicalValue: canonical.isOpenWeight,
          incomingValue: incoming.isOpenWeight,
          sourceId: incoming.sourceId,
          severity: "CRITICAL",
          reason: `Disagreement on open-weight status: canonical=${canonical.isOpenWeight}, incoming=${incoming.isOpenWeight}`,
        });
      }
    }

    // 2. Modalities mismatch (CRITICAL if input modalities are fundamentally divergent)
    if (incoming.inputModalities && incoming.inputModalities.length > 0) {
      const canonicalInputs = new Set(canonical.inputModalities);
      const incomingInputs = new Set(incoming.inputModalities);
      const hasVisionDiff =
        (canonicalInputs.has("image") && !incomingInputs.has("image")) ||
        (!canonicalInputs.has("image") && incomingInputs.has("image"));

      if (hasVisionDiff) {
        conflicts.push({
          field: "inputModalities",
          canonicalValue: canonical.inputModalities,
          incomingValue: incoming.inputModalities,
          sourceId: incoming.sourceId,
          severity: "CRITICAL",
          reason: "Multimodal input capability mismatch (vision/image support disagreement)",
        });
      }
    }

    // 3. Release date discrepancy
    if (incoming.releaseDate && canonical.releaseDate) {
      const diffMs = Math.abs(canonical.releaseDate.getTime() - incoming.releaseDate.getTime());
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > 60) {
        conflicts.push({
          field: "releaseDate",
          canonicalValue: canonical.releaseDate.toISOString().slice(0, 10),
          incomingValue: incoming.releaseDate.toISOString().slice(0, 10),
          sourceId: incoming.sourceId,
          severity: "CRITICAL",
          reason: `Release dates diverge by ${diffDays} days (>60 days)`,
        });
      } else if (diffDays > 7) {
        conflicts.push({
          field: "releaseDate",
          canonicalValue: canonical.releaseDate.toISOString().slice(0, 10),
          incomingValue: incoming.releaseDate.toISOString().slice(0, 10),
          sourceId: incoming.sourceId,
          severity: "WARNING",
          reason: `Release dates differ by ${diffDays} days`,
        });
      }
    }

    // 4. Context window discrepancy (WARNING)
    if (
      incoming.contextWindow &&
      canonical.contextWindow &&
      incoming.contextWindow !== canonical.contextWindow
    ) {
      conflicts.push({
        field: "contextWindow",
        canonicalValue: canonical.contextWindow,
        incomingValue: incoming.contextWindow,
        sourceId: incoming.sourceId,
        severity: "WARNING",
        reason: `Context window disagreement: canonical=${canonical.contextWindow}, incoming=${incoming.contextWindow}`,
      });
    }

    // 5. License conflict (WARNING)
    if (
      incoming.license &&
      canonical.license &&
      incoming.license.toLowerCase() !== canonical.license.toLowerCase()
    ) {
      conflicts.push({
        field: "license",
        canonicalValue: canonical.license,
        incomingValue: incoming.license,
        sourceId: incoming.sourceId,
        severity: "WARNING",
        reason: `License disagreement: canonical='${canonical.license}', incoming='${incoming.license}'`,
      });
    }

    // 6. Family conflict (INFO / WARNING)
    if (
      incoming.family &&
      canonical.family &&
      incoming.family.toLowerCase() !== canonical.family.toLowerCase()
    ) {
      conflicts.push({
        field: "family",
        canonicalValue: canonical.family,
        incomingValue: incoming.family,
        sourceId: incoming.sourceId,
        severity: "INFO",
        reason: `Family naming variation: canonical='${canonical.family}', incoming='${incoming.family}'`,
      });
    }

    // 7. Reasoning capability conflict (CRITICAL if reasoning differs)
    if (incoming.isReasoning !== undefined && incoming.isReasoning !== null) {
      if (canonical.isReasoning !== incoming.isReasoning) {
        conflicts.push({
          field: "isReasoning",
          canonicalValue: canonical.isReasoning,
          incomingValue: incoming.isReasoning,
          sourceId: incoming.sourceId,
          severity: "CRITICAL",
          reason: `Reasoning designation mismatch: canonical=${canonical.isReasoning}, incoming=${incoming.isReasoning}`,
        });
      }
    }

    return conflicts;
  }
}
