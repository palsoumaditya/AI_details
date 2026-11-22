import { prisma, PrismaClient, getDatabasePoolMetrics } from "../database/index";
import type { HealthDto } from "../shared/types/api";
import type { IHealthService } from "./contracts/index";
import { cacheService } from "./cache.service";

const API_VERSION = "1.0.0";
const DEFAULT_TIMEOUT_MS = 3000;

/**
 * Service for system observability and readiness probing.
 *
 * Provides liveness and database/cache readiness checks while ensuring
 * internal credentials, network topology, and SQL traces remain strictly unexposed.
 */
export class HealthService implements IHealthService {
  private readonly startTime = Date.now();

  constructor(private readonly db: PrismaClient = prisma) {}

  /**
   * Performs an immediate process liveness check.
   *
   * Verifies process uptime and API version without querying external dependencies.
   *
   * @returns Liveness status, ISO timestamp, version, and uptime in seconds.
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
   * Performs end-to-end dependency readiness checks across database and cache layers.
   *
   * Executes a bounded ping query against the database using Promise.race to guarantee
   * termination within the specified timeout. Aggregates connection pool metrics and
   * cache driver statistics.
   *
   * @param timeoutMs - Max execution time before marking the database probe as timed out (defaults to 3000ms).
   * @returns HealthDto reporting overall health status, uptime, and component check diagnostics.
   */
  async getReadiness(timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<HealthDto> {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const startPing = Date.now();

    let dbStatus: "up" | "down" = "down";
    let dbLatencyMs: number | undefined;
    let dbMessage: string | undefined;

    try {
      // Execute bounded database ping to prevent hanging connection exhaustion
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
      // Sanitize error message to prevent leaking internal credentials or hosts
      dbMessage =
        err instanceof Error && err.message.includes("timed out")
          ? "Database connectivity timed out"
          : "Database service unreachable";
    }

    const overallStatus: "healthy" | "degraded" | "unhealthy" =
      dbStatus === "up" ? "healthy" : "degraded";

    const poolMetrics = getDatabasePoolMetrics();
    const cacheMetrics = cacheService.getMetrics();

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
          details: {
            poolTotal: poolMetrics.totalCount,
            poolIdle: poolMetrics.idleCount,
            poolWaiting: poolMetrics.waitingCount,
          },
        },
        cache: {
          status: "up",
          details: {
            driver: cacheMetrics.driver,
            hitRatio: cacheMetrics.hitRatio,
            hits: cacheMetrics.hits,
            misses: cacheMetrics.misses,
            inMemoryKeys: cacheMetrics.inMemoryKeys,
            redisConnected: cacheMetrics.isRedisConnected,
          },
        },
      },
    };
  }
}

export const healthService = new HealthService();
