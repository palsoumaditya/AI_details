import { PrismaClient, SyncTriggerType, BatchStatus, SyncStatus, Prisma } from "@oneatlas/database";
import type { SourceSyncResult, BatchSyncResult } from "../contracts/types";

export class BatchService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Creates a parent SyncBatch record.
   */
  async createBatch(
    requestedSources: string[],
    triggerType: SyncTriggerType = "MANUAL"
  ) {
    return this.prisma.syncBatch.create({
      data: {
        triggerType,
        status: "STARTED",
        requestedSources,
        startedAt: new Date(),
      },
    });
  }

  /**
   * Finalizes the parent SyncBatch record with final status and aggregate summary.
   */
  async finalizeBatch(
    batchId: string,
    result: BatchSyncResult
  ) {
    return this.prisma.syncBatch.update({
      where: { id: batchId },
      data: {
        status: result.status as BatchStatus,
        completedAt: result.completedAt,
        summary: result as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Creates a source-level SyncRun linked to the parent batch.
   */
  async createSourceRun(
    batchId: string | null,
    sourceId: string,
    triggerType: SyncTriggerType = "MANUAL"
  ) {
    return this.prisma.syncRun.create({
      data: {
        batchId: batchId || null,
        sourceId,
        triggerType,
        status: "STARTED",
        startedAt: new Date(),
      },
    });
  }

  /**
   * Finalizes a source-level SyncRun with counters and status.
   */
  async finalizeSourceRun(
    runId: string,
    result: SourceSyncResult
  ) {
    return this.prisma.syncRun.update({
      where: { id: runId },
      data: {
        status: result.status as SyncStatus,
        completedAt: new Date(),
        itemsProcessed: result.modelsProcessed + result.providersProcessed + result.endpointsProcessed,
        itemsInserted: result.modelsInserted + result.providersInserted + result.endpointsInserted,
        itemsUpdated: result.modelsUpdated + result.providersUpdated + result.endpointsUpdated,
        itemsUnchanged: result.modelsUnchanged + result.providersUnchanged + result.endpointsUnchanged,
        itemsFailed: result.itemsFailed,
        itemsSkipped: result.itemsSkipped,
        itemsUnresolved: result.endpointsUnresolved,
        errorSummary: result.errors.length > 0 ? result.errors[0] : null,
        errorDetails: result.errors.length > 0 ? (result.errors as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  }
}
