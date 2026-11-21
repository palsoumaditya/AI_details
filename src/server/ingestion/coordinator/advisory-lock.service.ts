import { Client } from "pg";
import { LockConflictError } from "./error-handler";
import type { IngestionLogger } from "../contracts/types";

/**
 * Stable 64-bit BigInt identifier for OneAtlas global catalog synchronization.
 * Hash of "oneatlas_global_catalog_ingestion_lock"
 */
const GLOBAL_INGESTION_LOCK_ID = "4294967297"; // 64-bit advisory lock key

export interface LockHandle {
  lockId: string;
  release(): Promise<void>;
}

/**
 * PostgreSQL Session-Level Advisory Locking Service.
 *
 * Requirements:
 * - Uses dedicated unpooled direct PostgreSQL connection to guarantee session affinity.
 * - Fails closed if direct connection cannot be established.
 * - Uses pg_try_advisory_lock to prevent blocking or indefinite queueing.
 * - Guarantees clean release in finally block or automatically upon session disconnect.
 */
export class AdvisoryLockService {
  private readonly connectionString: string;

  constructor(customConnectionString?: string) {
    const connStr =
      customConnectionString ||
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL;

    if (!connStr) {
      throw new Error("Missing direct PostgreSQL connection string for advisory locking.");
    }
    // Ensure direct unpooled PostgreSQL connection for session-level advisory locks
    this.connectionString = connStr.replace("-pooler.", ".");
  }

  /**
   * Attempts to acquire the global ingestion advisory lock.
   * Throws LockConflictError if another session holds the lock.
   */
  async acquireGlobalLock(logger?: IngestionLogger): Promise<LockHandle> {
    const client = new Client({
      connectionString: this.connectionString,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
    } catch (connErr) {
      logger?.error("Failed to connect to direct database session for lock acquisition", {
        error: String(connErr),
      });
      throw new Error(
        `Failed to establish direct PostgreSQL session for advisory lock: ${connErr instanceof Error ? connErr.message : String(connErr)}`
      );
    }

    try {
      // Session-level 64-bit advisory lock
      const res = await client.query<{ locked: boolean }>(
        "SELECT pg_try_advisory_lock($1::bigint) as locked;",
        [GLOBAL_INGESTION_LOCK_ID]
      );

      const isLocked = Boolean(res.rows[0]?.locked);

      if (!isLocked) {
        // Disconnect immediately if lock not acquired
        await client.end().catch(() => {});
        logger?.warn("Global ingestion advisory lock is currently held by another process.");
        throw new LockConflictError();
      }

      logger?.info("Acquired global PostgreSQL advisory lock for catalog synchronization", {
        lockId: GLOBAL_INGESTION_LOCK_ID,
      });

      let isReleased = false;

      return {
        lockId: GLOBAL_INGESTION_LOCK_ID,
        release: async () => {
          if (isReleased) return;
          isReleased = true;
          try {
            await client.query("SELECT pg_advisory_unlock($1::bigint);", [
              GLOBAL_INGESTION_LOCK_ID,
            ]);
            logger?.info("Released global PostgreSQL advisory lock", {
              lockId: GLOBAL_INGESTION_LOCK_ID,
            });
          } catch (unlockErr) {
            logger?.warn("Error during explicit advisory lock unlock", {
              error: String(unlockErr),
            });
          } finally {
            await client.end().catch(() => {});
          }
        },
      };
    } catch (err) {
      await client.end().catch(() => {});
      throw err;
    }
  }
}
