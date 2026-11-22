-- CreateIndex: Models compound status and releaseDate for default catalog sort
CREATE INDEX IF NOT EXISTS "models_status_releaseDate_idx" ON "models"("status", "releaseDate" DESC);

-- CreateIndex: Models compound status and name for alphabetical sort
CREATE INDEX IF NOT EXISTS "models_status_name_idx" ON "models"("status", "name");

-- CreateIndex: Models compound status and contextWindow for window range filters
CREATE INDEX IF NOT EXISTS "models_status_contextWindow_idx" ON "models"("status", "contextWindow");

-- CreateIndex: Endpoints compound providerId, status, and lastSeenAt for provider details
CREATE INDEX IF NOT EXISTS "model_provider_endpoints_providerId_status_lastSeenAt_idx" ON "model_provider_endpoints"("providerId", "status", "lastSeenAt" DESC);

-- CreateIndex: Endpoints compound modelId and status for online endpoint filtering
CREATE INDEX IF NOT EXISTS "model_provider_endpoints_modelId_status_idx" ON "model_provider_endpoints"("modelId", "status");

-- CreateIndex: Benchmark results compound benchmarkId and modelId for deduplication
CREATE INDEX IF NOT EXISTS "benchmark_results_benchmarkId_modelId_idx" ON "benchmark_results"("benchmarkId", "modelId");
