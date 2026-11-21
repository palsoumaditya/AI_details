-- AlterEnum
ALTER TYPE "ProviderType" ADD VALUE 'UNKNOWN';

-- CreateTable
CREATE TABLE "provider_source_mappings" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalProviderId" TEXT NOT NULL,
    "externalSlug" TEXT,
    "payloadHash" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_source_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_source_mappings_providerId_idx" ON "provider_source_mappings"("providerId");

-- CreateIndex
CREATE INDEX "provider_source_mappings_sourceId_idx" ON "provider_source_mappings"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_source_mappings_sourceId_externalProviderId_key" ON "provider_source_mappings"("sourceId", "externalProviderId");

-- AddForeignKey
ALTER TABLE "provider_source_mappings" ADD CONSTRAINT "provider_source_mappings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_source_mappings" ADD CONSTRAINT "provider_source_mappings_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "external_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
