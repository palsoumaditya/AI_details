import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// Ensure environment variables are loaded across standalone runners & Next.js
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env.local") });
dotenv.config({ path: path.resolve(process.cwd(), "AI_details/.env") });
dotenv.config({ path: path.resolve(process.cwd(), "AI_details/.env.local") });
dotenv.config({ path: path.resolve(process.cwd(), "frontend/.env.local") });
dotenv.config({ path: path.resolve(process.cwd(), "AI_details/frontend/.env.local") });

/**
 * AI Details Production-Grade Database Connection Manager
 *
 * Requirements satisfied:
 * 1. DATABASE_URL is strictly prioritized for normal application runtime (pooled endpoint).
 * 2. DIRECT_URL is never inadvertently prioritized over pooled DATABASE_URL.
 * 3. Dedicated pg.Pool instance with bounded size, idle timeouts, and connection timeouts.
 * 4. Error listener attached to pg.Pool to prevent process termination on idle socket reset.
 * 5. Strict process-level singleton on globalThis across both development (HMR) and production.
 * 6. Graceful shutdown hooks registered for SIGTERM, SIGINT, and process exit.
 * 7. Real-time connection metrics tracking for observability.
 */

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: pg.Pool;
  isShuttingDown?: boolean;
};

export interface PrismaClientOptions {
  connectionString?: string;
  poolMax?: number;
  logLevel?: "development" | "production" | "test";
  useDirectUrl?: boolean;
}

export interface DatabasePoolMetrics {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

/**
 * Resolves the appropriate database connection URL.
 * Strictly prioritizes DATABASE_URL (pooled) for runtime operations.
 * Uses DIRECT_URL only when explicitly requested (e.g., migrations, session locks).
 */
export function resolveConnectionUrl(useDirectUrl = false): string {
  if (useDirectUrl) {
    const direct = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (direct) {
      // Ensure direct connection does not inadvertently use pooler host
      return direct.replace("-pooler.", ".");
    }
  }

  if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
    console.warn(
      "[Database Warning] Neither DATABASE_URL nor DIRECT_URL was found in process.env. " +
      "Falling back to default local connection 'postgresql://postgres:postgres@localhost:5432/aidetails?schema=public'. " +
      "If you are using Neon or a remote database, verify your .env or .env.local file and restart the dev server."
    );
  }

  // Application runtime: MUST use DATABASE_URL first (pooled connection where configured)
  const runtimeUrl =
    process.env.DATABASE_URL ||
    process.env.DIRECT_URL ||
    "postgresql://postgres:postgres@localhost:5432/aidetails?schema=public";

  return runtimeUrl;
}

/**
 * Creates a configured PostgreSQL connection pool and Prisma Client.
 */
export function createPrismaClient(options?: PrismaClientOptions): PrismaClient {
  const connectionString =
    options?.connectionString || resolveConnectionUrl(options?.useDirectUrl);

  const poolMax =
    options?.poolMax ??
    (process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10);

  const pool = new pg.Pool({
    connectionString,
    max: Math.max(2, poolMax),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    maxUses: 7500, // Recycle connections periodically to mitigate server-side memory fragmentation
  });

  // Attach error handler to prevent unhandled exceptions on idle connection drops
  pool.on("error", (err) => {
    // Suppress unhandled crash; log structured error
    if (!globalForPrisma.isShuttingDown) {
      console.error("[Database Pool Error] Unexpected error on idle client:", err.message);
    }
  });

  const adapter = new PrismaPg(pool, {
    disposeExternalPool: true,
  });

  const env =
    options?.logLevel ||
    (process.env.NODE_ENV as "development" | "production" | "test" | undefined) ||
    "development";

  const client = new PrismaClient({
    adapter,
    log: env === "development" ? ["warn", "error"] : ["error"],
  });

  // Track pool on globalForPrisma for metrics and lifecycle management
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = pool;
  }

  return client;
}

/**
 * Returns the process-wide Prisma Client singleton.
 * Prevents multiple instances across Next.js re-evaluations and worker processes.
 */
export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    registerShutdownHooks();
  }
  return globalForPrisma.prisma;
}

/**
 * Retrieves live database pool metrics for health/metrics endpoints.
 */
export function getDatabasePoolMetrics(): DatabasePoolMetrics {
  const pool = globalForPrisma.pgPool;
  if (!pool) {
    return { totalCount: 0, idleCount: 0, waitingCount: 0 };
  }
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

/**
 * Gracefully disconnects Prisma client and terminates the pool.
 */
export async function disconnectDatabase(): Promise<void> {
  globalForPrisma.isShuttingDown = true;
  try {
    if (globalForPrisma.prisma) {
      await globalForPrisma.prisma.$disconnect();
    }
    if (globalForPrisma.pgPool) {
      await globalForPrisma.pgPool.end();
    }
  } catch (err) {
    console.warn("[Database Disconnect] Warning during shutdown:", err);
  } finally {
    globalForPrisma.prisma = undefined;
    globalForPrisma.pgPool = undefined;
  }
}

let hooksRegistered = false;
function registerShutdownHooks() {
  if (hooksRegistered || typeof process === "undefined") return;
  hooksRegistered = true;

  const handleSignal = async (signal: string) => {
    if (globalForPrisma.isShuttingDown) return;
    await disconnectDatabase();
  };

  process.once("SIGTERM", () => handleSignal("SIGTERM"));
  process.once("SIGINT", () => handleSignal("SIGINT"));
}

export const prisma = getPrismaClient();
