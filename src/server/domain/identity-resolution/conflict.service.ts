import {
  PrismaClient,
  Prisma,
  DataConflict,
  ConflictSeverity,
  ConflictStatus,
} from "@/generated/prisma/client";

export interface RecordConflictInput {
  entityType: "MODEL" | "ENDPOINT" | "PROVIDER";
  entityId: string;
  fieldKey: string;
  severity: ConflictSeverity;
  sourceAId: string;
  sourceBId: string;
  rawRecordAId?: string | null;
  rawRecordBId?: string | null;
  observedValueA: unknown;
  observedValueB: unknown;
  resolutionNotes?: string | null;
}

export interface ConflictFilter {
  status?: ConflictStatus;
  severity?: ConflictSeverity;
  entityType?: "MODEL" | "ENDPOINT" | "PROVIDER";
  entityId?: string;
  fieldKey?: string;
}

export class ConflictService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Persists or updates a data conflict.
   * Guarantees that identical unresolved conflicts do not duplicate on repeated synchronizations.
   */
  async recordConflict(
    input: RecordConflictInput,
    tx?: Prisma.TransactionClient
  ): Promise<DataConflict> {
    const db = tx || this.prisma;

    const valA =
      input.observedValueA === undefined
        ? Prisma.JsonNull
        : (input.observedValueA as Prisma.InputJsonValue);
    const valB =
      input.observedValueB === undefined
        ? Prisma.JsonNull
        : (input.observedValueB as Prisma.InputJsonValue);

    return db.dataConflict.upsert({
      where: {
        entityType_entityId_fieldKey_sourceAId_sourceBId: {
          entityType: input.entityType,
          entityId: input.entityId,
          fieldKey: input.fieldKey,
          sourceAId: input.sourceAId,
          sourceBId: input.sourceBId,
        },
      },
      update: {
        severity: input.severity,
        observedValueA: valA,
        observedValueB: valB,
        rawRecordAId: input.rawRecordAId || null,
        rawRecordBId: input.rawRecordBId || null,
        detectedAt: new Date(),
      },
      create: {
        entityType: input.entityType,
        entityId: input.entityId,
        fieldKey: input.fieldKey,
        severity: input.severity,
        status: "OPEN",
        sourceAId: input.sourceAId,
        sourceBId: input.sourceBId,
        rawRecordAId: input.rawRecordAId || null,
        rawRecordBId: input.rawRecordBId || null,
        observedValueA: valA,
        observedValueB: valB,
        resolutionNotes: input.resolutionNotes || null,
        detectedAt: new Date(),
      },
    });
  }

  /**
   * Lists conflicts matching filter criteria.
   */
  async listConflicts(
    filter: ConflictFilter = {}
  ): Promise<
    Array<
      DataConflict & {
        sourceA: { slug: string; name: string };
        sourceB: { slug: string; name: string };
      }
    >
  > {
    return this.prisma.dataConflict.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.severity ? { severity: filter.severity } : {}),
        ...(filter.entityType ? { entityType: filter.entityType } : {}),
        ...(filter.entityId ? { entityId: filter.entityId } : {}),
        ...(filter.fieldKey ? { fieldKey: filter.fieldKey } : {}),
      },
      include: {
        sourceA: { select: { slug: true, name: true } },
        sourceB: { select: { slug: true, name: true } },
      },
      orderBy: [
        { severity: "desc" },
        { detectedAt: "desc" },
      ],
    });
  }

  /**
   * Resolves a conflict with audit history.
   */
  async resolveConflict(
    conflictId: string,
    notes: string,
    selectedSourceId?: string
  ): Promise<DataConflict> {
    return this.prisma.dataConflict.update({
      where: { id: conflictId },
      data: {
        status: "RESOLVED",
        resolutionNotes: notes,
        selectedSourceId: selectedSourceId || null,
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Ignores a conflict (e.g. verified benign variance).
   */
  async ignoreConflict(conflictId: string, reason: string): Promise<DataConflict> {
    return this.prisma.dataConflict.update({
      where: { id: conflictId },
      data: {
        status: "IGNORED",
        resolutionNotes: reason,
        resolvedAt: new Date(),
      },
    });
  }
}
