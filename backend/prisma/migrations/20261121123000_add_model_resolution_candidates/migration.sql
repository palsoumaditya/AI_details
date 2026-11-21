-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVIEW', 'STALE');

-- CreateTable
CREATE TABLE "model_resolution_candidates" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalModelId" TEXT NOT NULL,
    "candidateModelId" TEXT NOT NULL,
    "matchingStrategy" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_resolution_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "model_resolution_candidates_status_idx" ON "model_resolution_candidates"("status");

-- CreateIndex
CREATE INDEX "model_resolution_candidates_sourceId_idx" ON "model_resolution_candidates"("sourceId");

-- CreateIndex
CREATE INDEX "model_resolution_candidates_candidateModelId_idx" ON "model_resolution_candidates"("candidateModelId");

-- CreateIndex
CREATE UNIQUE INDEX "model_resolution_candidates_sourceId_externalModelId_candid_key" ON "model_resolution_candidates"("sourceId", "externalModelId", "candidateModelId");

-- AddForeignKey
ALTER TABLE "model_resolution_candidates" ADD CONSTRAINT "model_resolution_candidates_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "external_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_resolution_candidates" ADD CONSTRAINT "model_resolution_candidates_candidateModelId_fkey" FOREIGN KEY ("candidateModelId") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;
