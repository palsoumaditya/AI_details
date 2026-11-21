-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('STARTED', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "sync_batches" (
    "id" TEXT NOT NULL,
    "triggerType" "SyncTriggerType" NOT NULL DEFAULT 'MANUAL',
    "status" "BatchStatus" NOT NULL DEFAULT 'STARTED',
    "requestedSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_batches_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "sync_runs" ADD COLUMN "batchId" TEXT;
ALTER TABLE "sync_runs" ADD COLUMN "itemsUnresolved" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "sync_batches_status_idx" ON "sync_batches"("status");

-- CreateIndex
CREATE INDEX "sync_batches_startedAt_idx" ON "sync_batches"("startedAt" DESC);

-- CreateIndex
CREATE INDEX "sync_runs_batchId_idx" ON "sync_runs"("batchId");

-- AddForeignKey
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "sync_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
