import { PrismaClient, Prisma, FieldProvenance } from "@/generated/prisma/client";

export interface RecordProvenanceInput {
  entityType: "MODEL" | "ENDPOINT" | "PROVIDER";
  entityId: string;
  fieldKey: string;
  sourceId: string;
  sourceExternalId?: string | null;
  rawSourceRecordId?: string | null;
  selectedValue: unknown;
  confidence?: number | null;
}

export class ProvenanceService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Records or updates the selected provenance for a canonical entity field.
   * Ensures exactly one authoritative provenance record per (entityType, entityId, fieldKey).
   */
  async recordProvenance(
    input: RecordProvenanceInput,
    tx?: Prisma.TransactionClient
  ): Promise<FieldProvenance> {
    const db = tx || this.prisma;

    const selectedValue =
      input.selectedValue === undefined
        ? Prisma.JsonNull
        : (input.selectedValue as Prisma.InputJsonValue);

    return db.fieldProvenance.upsert({
      where: {
        entityType_entityId_fieldKey: {
          entityType: input.entityType,
          entityId: input.entityId,
          fieldKey: input.fieldKey,
        },
      },
      update: {
        sourceId: input.sourceId,
        sourceExternalId: input.sourceExternalId || null,
        rawSourceRecordId: input.rawSourceRecordId || null,
        selectedValue,
        confidence: input.confidence ?? null,
        selectedAt: new Date(),
      },
      create: {
        entityType: input.entityType,
        entityId: input.entityId,
        fieldKey: input.fieldKey,
        sourceId: input.sourceId,
        sourceExternalId: input.sourceExternalId || null,
        rawSourceRecordId: input.rawSourceRecordId || null,
        selectedValue,
        confidence: input.confidence ?? null,
        selectedAt: new Date(),
      },
    });
  }

  /**
   * Retrieves the provenance for a specific entity field.
   */
  async getFieldProvenance(
    entityType: "MODEL" | "ENDPOINT" | "PROVIDER",
    entityId: string,
    fieldKey: string
  ): Promise<(FieldProvenance & { source: { slug: string; name: string } }) | null> {
    return this.prisma.fieldProvenance.findUnique({
      where: {
        entityType_entityId_fieldKey: {
          entityType,
          entityId,
          fieldKey,
        },
      },
      include: {
        source: {
          select: { slug: true, name: true },
        },
      },
    });
  }

  /**
   * Retrieves all provenance records for a given entity.
   */
  async getEntityProvenance(
    entityType: "MODEL" | "ENDPOINT" | "PROVIDER",
    entityId: string
  ): Promise<Array<FieldProvenance & { source: { slug: string; name: string } }>> {
    return this.prisma.fieldProvenance.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        source: {
          select: { slug: true, name: true },
        },
      },
      orderBy: { fieldKey: "asc" },
    });
  }
}
