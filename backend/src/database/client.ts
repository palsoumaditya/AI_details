import path from "node:path";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// Ensure environment variables are loaded across standalone runners & Next.js
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

/**
 * OneAtlas Prisma Client Singleton
 *
 * Implements:
 * 1. Prisma ORM 7 Driver Adapter pattern with @prisma/adapter-pg.
 * 2. Next.js Hot Module Replacement (HMR) connection deduplication.
 * 3. Configurable connection pooling and query timeouts.
 * 4. Safe serverless lifecycle management.
 */

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export interface PrismaClientOptions {
  connectionString?: string;
  poolMax?: number;
  logLevel?: "development" | "production" | "test";
}

export function createPrismaClient(options?: PrismaClientOptions): PrismaClient {
  const connectionString =
    options?.connectionString ||
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/oneatlas?schema=public";

  const adapter = new PrismaPg({
    connectionString,
    max: options?.poolMax ?? parseInt(process.env.DB_POOL_MAX ?? "10", 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  const env =
    options?.logLevel ||
    (process.env.NODE_ENV as "development" | "production" | "test" | undefined) ||
    "development";

  return new PrismaClient({
    adapter,
    log: env === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = getPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
