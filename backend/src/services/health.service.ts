import { prisma, PrismaClient } from "../database/index";
import type { HealthDto } from "../shared/types/api";
import type { IHealthService } from "./contracts/index";

const API_VERSION = "1.0.0";
const DEFAULT_TIMEOUT_MS = 3000;

/**
 * System Health Service (Phase 4A)
 *
 * Provides safe liveness and database readiness checks without leaking credentials,
 * internal hosts, or SQL queries.
 */
export class HealthService implements IHealthService {
  private readonly startTime = Date.now();

  constructor(private readonly db: PrismaClient = prisma) {}

  /**
   * Basic process liveness check (Fast in-memory verification)
   */
  async getLiveness(): Promise<{
    status: "ok";
    timestamp: string;
    version: string;
    uptimeSeconds: number;
  }> {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Database connectivity & readiness check with bounded timeout
   */
  async getReadiness(timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<HealthDto> {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const startPing = Date.now();

    let dbStatus: "up" | "down" = "down";
    let dbLatencyMs: number | undefined;
    let dbMessage: string | undefined;

    try {
      // Bounded probe using Promise.race to guarantee no hanging requests
      const probePromise = this.db.$queryRaw`SELECT 1 as ping`;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Database check timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      );

      await Promise.race([probePromise, timeoutPromise]);
      dbLatencyMs = Date.now() - startPing;
      dbStatus = "up";
    } catch (err: unknown) {
      dbLatencyMs = Date.now() - startPing;
      dbStatus = "down";
      // Sanitize error message to ensure no connection strings or credentials leak
      dbMessage =
        err instanceof Error && err.message.includes("timed out")
          ? "Database connectivity timed out"
          : "Database service unreachable";
    }

    const overallStatus: "healthy" | "degraded" | "unhealthy" =
      dbStatus === "up" ? "healthy" : "degraded";

    return {
      status: overallStatus,
      version: API_VERSION,
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      checks: {
        api: {
          status: "up",
        },
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
          message: dbMessage,
        },
      },
    };
  }
}

export const healthService = new HealthService();
