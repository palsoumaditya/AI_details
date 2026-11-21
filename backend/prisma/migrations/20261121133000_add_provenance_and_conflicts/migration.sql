-- CreateEnum
CREATE TYPE "ConflictSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ConflictStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED', 'NEEDS_REVIEW');

-- AlterTable
ALTER TABLE "model_provider_endpoints" ADD COLUMN     "inputModalities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "outputModalities" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "models" ALTER COLUMN "isReasoning" DROP NOT NULL,
ALTER COLUMN "isReasoning" DROP DEFAULT,
ALTER COLUMN "isOpenWeight" DROP NOT NULL,
ALTER COLUMN "isOpenWeight" DROP DEFAULT;

-- CreateTable
CREATE TABLE "field_provenance" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceExternalId" TEXT,
    "rawSourceRecordId" TEXT,
    "selectedValue" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_provenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_conflicts" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "severity" "ConflictSeverity" NOT NULL DEFAULT 'WARNING',
    "status" "ConflictStatus" NOT NULL DEFAULT 'OPEN',
    "sourceAId" TEXT NOT NULL,
    "sourceBId" TEXT NOT NULL,
    "rawRecordAId" TEXT,
    "rawRecordBId" TEXT,
    "observedValueA" JSONB NOT NULL,
    "observedValueB" JSONB NOT NULL,
    "selectedSourceId" TEXT,
    "resolutionNotes" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "field_provenance_entityType_entityId_idx" ON "field_provenance"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "field_provenance_sourceId_idx" ON "field_provenance"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "field_provenance_entityType_entityId_fieldKey_key" ON "field_provenance"("entityType", "entityId", "fieldKey");

-- CreateIndex
CREATE INDEX "data_conflicts_status_idx" ON "data_conflicts"("status");

-- CreateIndex
CREATE INDEX "data_conflicts_severity_idx" ON "data_conflicts"("severity");

-- CreateIndex
CREATE INDEX "data_conflicts_entityType_entityId_idx" ON "data_conflicts"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "data_conflicts_entityType_entityId_fieldKey_sourceAId_sourc_key" ON "data_conflicts"("entityType", "entityId", "fieldKey", "sourceAId", "sourceBId");

-- AddForeignKey
ALTER TABLE "field_provenance" ADD CONSTRAINT "field_provenance_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "external_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_provenance" ADD CONSTRAINT "field_provenance_rawSourceRecordId_fkey" FOREIGN KEY ("rawSourceRecordId") REFERENCES "raw_source_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_conflicts" ADD CONSTRAINT "data_conflicts_sourceAId_fkey" FOREIGN KEY ("sourceAId") REFERENCES "external_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_conflicts" ADD CONSTRAINT "data_conflicts_sourceBId_fkey" FOREIGN KEY ("sourceBId") REFERENCES "external_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_conflicts" ADD CONSTRAINT "data_conflicts_rawRecordAId_fkey" FOREIGN KEY ("rawRecordAId") REFERENCES "raw_source_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_conflicts" ADD CONSTRAINT "data_conflicts_rawRecordBId_fkey" FOREIGN KEY ("rawRecordBId") REFERENCES "raw_source_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
