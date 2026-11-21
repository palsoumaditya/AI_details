-- AlterTable
ALTER TABLE "model_provider_endpoints" ADD COLUMN     "capabilities" JSONB;

-- AlterTable
ALTER TABLE "models" ADD COLUMN     "family" TEXT,
ADD COLUMN     "knowledgeCutoff" TEXT;

-- AlterTable
ALTER TABLE "sync_runs" ADD COLUMN     "itemsFailed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "itemsUnchanged" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "endpoint_source_mappings" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalEndpointId" TEXT NOT NULL,
    "payloadHash" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "endpoint_source_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "endpoint_source_mappings_endpointId_idx" ON "endpoint_source_mappings"("endpointId");

-- CreateIndex
CREATE INDEX "endpoint_source_mappings_sourceId_idx" ON "endpoint_source_mappings"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "endpoint_source_mappings_sourceId_externalEndpointId_key" ON "endpoint_source_mappings"("sourceId", "externalEndpointId");

-- CreateIndex
CREATE INDEX "models_family_idx" ON "models"("family");

-- AddForeignKey
ALTER TABLE "endpoint_source_mappings" ADD CONSTRAINT "endpoint_source_mappings_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "model_provider_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endpoint_source_mappings" ADD CONSTRAINT "endpoint_source_mappings_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "external_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
