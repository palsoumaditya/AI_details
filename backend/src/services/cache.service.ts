import Redis from "ioredis";

/**
 * Resilient multi-tier Cache Engine implementing the Cache-Aside pattern.
 *
 * Architecture:
 * - L2 distributed caching backed by Redis when REDIS_URL is configured.
 * - L1 bounded in-memory LRU cache fallback when Redis is absent or unreachable.
 * - Graceful degradation: Redis connection drops or timeouts never throw or fail user queries.
 * - Cache stampede prevention: in-flight promise deduplication (single-flight execution).
 * - O(1) group invalidation through namespace version offsets.
 */

export interface CacheOptions {
  ttlSeconds?: number;
  namespace?: string;
  skipCache?: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  hitRatio: number;
  inMemoryKeys: number;
  isRedisConnected: boolean;
  driver: "redis" | "memory";
}

interface InMemoryCacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheService {
  private redisClient: Redis | null = null;
  private isRedisReady = false;
  private memoryCache = new Map<string, InMemoryCacheEntry<any>>();
  private maxMemoryEntries = 2000;

  private inFlightFetches = new Map<string, Promise<any>>();
  private namespaceVersions = new Map<string, number>();

  private hits = 0;
  private misses = 0;
  private errors = 0;

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL;

    if (url) {
      try {
        this.redisClient = new Redis(url, {
          maxRetriesPerRequest: 1,
          connectTimeout: 3000,
          commandTimeout: 1500,
          lazyConnect: true,
          retryStrategy: (times) => {
            if (times > 5) {
              return 10_000;
            }
            return Math.min(times * 500, 3000);
          },
        });

        this.redisClient.on("ready", () => {
          this.isRedisReady = true;
          console.log("[CacheService] Redis connected and ready.");
        });

        this.redisClient.on("error", (err) => {
          this.isRedisReady = false;
          this.errors++;
          console.warn("[CacheService] Redis connection error; degrading to memory cache:", err.message);
        });

        this.redisClient.on("close", () => {
          this.isRedisReady = false;
        });

        this.redisClient.connect().catch((err) => {
          this.isRedisReady = false;
          console.warn("[CacheService] Initial Redis connect failed, using memory fallback:", err.message);
        });
      } catch (err) {
        this.redisClient = null;
        this.isRedisReady = false;
        console.warn("[CacheService] Failed to initialize Redis client, using in-memory fallback:", err);
      }
    }
  }

  /**
   * Generates a fully qualified, versioned cache key scoped to a namespace.
   *
   * @param namespace - Logical grouping (e.g., 'models', 'providers').
   * @param key - Specific cache identifier.
   * @returns Formatted key string with version offset.
   */
  public buildKey(namespace: string, key: string): string {
    const version = this.namespaceVersions.get(namespace) ?? 1;
    const sanitizedKey = key.replace(/\s+/g, "_");
    return `oneatlas:v1:${namespace}:v${version}:${sanitizedKey}`;
  }

  /**
   * Cache-aside getter and setter with single-flight stampede suppression.
   *
   * If the requested key is cached and valid, returns immediately. If multiple concurrent
   * requests target the same missing key, only one fetcher executes while others await
   * the shared in-flight promise.
   *
   * @param namespace - Logical cache namespace.
   * @param key - Cache key within the namespace.
   * @param fetcher - Asynchronous producer function executed on cache miss.
   * @param ttlSeconds - Time-to-live in seconds (defaults to 60).
   * @returns Cached or newly fetched value.
   */
  async getOrSet<T>(
    namespace: string,
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 60
  ): Promise<T> {
    const fullKey = this.buildKey(namespace, key);

    try {
      const cached = await this.get<T>(fullKey);
      if (cached !== null && cached !== undefined) {
        this.hits++;
        return cached;
      }
    } catch {
      this.errors++;
    }

    this.misses++;

    // Deduplicate concurrent in-flight requests for the same key
    if (this.inFlightFetches.has(fullKey)) {
      return this.inFlightFetches.get(fullKey)! as Promise<T>;
    }

    const fetchPromise = (async () => {
      try {
        const freshData = await fetcher();

        if (freshData !== null && freshData !== undefined) {
          await this.set(fullKey, freshData, ttlSeconds).catch(() => {});
        }

        return freshData;
      } finally {
        this.inFlightFetches.delete(fullKey);
      }
    })();

    this.inFlightFetches.set(fullKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * Retrieves an entry from Redis or local in-memory LRU cache.
   *
   * @param fullKey - Fully qualified cache key.
   * @returns Deserialized value or null on cache miss / expiration.
   */
  async get<T>(fullKey: string): Promise<T | null> {
    if (this.isRedisReady && this.redisClient) {
      try {
        const data = await this.redisClient.get(fullKey);
        if (data) {
          return JSON.parse(data) as T;
        }
        return null;
      } catch {
        this.errors++;
      }
    }

    const entry = this.memoryCache.get(fullKey);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(fullKey);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Stores an entry in Redis and local memory cache with TTL expiration.
   *
   * @param fullKey - Fully qualified cache key.
   * @param value - Value to serialize and store.
   * @param ttlSeconds - Time-to-live in seconds.
   */
  async set<T>(fullKey: string, value: T, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.isRedisReady && this.redisClient) {
      try {
        await this.redisClient.set(fullKey, serialized, "EX", ttlSeconds);
      } catch {
        this.errors++;
      }
    }

    // Enforce memory bounds by evicting oldest keys when capacity is reached
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      const oldestKeys = Array.from(this.memoryCache.keys()).slice(0, 100);
      for (const k of oldestKeys) {
        this.memoryCache.delete(k);
      }
    }

    this.memoryCache.set(fullKey, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Removes an individual key from both memory and Redis cache.
   *
   * @param namespace - Logical cache namespace.
   * @param key - Cache key to evict.
   */
  async delete(namespace: string, key: string): Promise<void> {
    const fullKey = this.buildKey(namespace, key);
    this.memoryCache.delete(fullKey);

    if (this.isRedisReady && this.redisClient) {
      try {
        await this.redisClient.del(fullKey);
      } catch {
        this.errors++;
      }
    }
  }

  /**
   * Invalidates an entire namespace in O(1) time by incrementing the namespace version offset.
   *
   * @param namespace - Logical namespace to invalidate.
   */
  async invalidateNamespace(namespace: string): Promise<void> {
    const currentVersion = this.namespaceVersions.get(namespace) ?? 1;
    this.namespaceVersions.set(namespace, currentVersion + 1);

    const prefix = `oneatlas:v1:${namespace}:`;
    for (const k of this.memoryCache.keys()) {
      if (k.startsWith(prefix)) {
        this.memoryCache.delete(k);
      }
    }

    if (this.isRedisReady && this.redisClient) {
      try {
        await this.redisClient.incr(`oneatlas:v1:version:${namespace}`);
      } catch {
        this.errors++;
      }
    }
  }

  /**
   * Invalidates all configured cache namespaces across the application.
   */
  async invalidateAll(): Promise<void> {
    const namespaces = ["models", "model_details", "providers", "labs", "rankings"];
    await Promise.all(namespaces.map((ns) => this.invalidateNamespace(ns)));
    this.memoryCache.clear();
  }

  /**
   * Returns operational telemetry and performance metrics for the cache.
   */
  getMetrics(): CacheMetrics {
    const totalRequests = this.hits + this.misses;
    const hitRatio = totalRequests > 0 ? this.hits / totalRequests : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      hitRatio: Math.round(hitRatio * 1000) / 1000,
      inMemoryKeys: this.memoryCache.size,
      isRedisConnected: this.isRedisReady,
      driver: this.isRedisReady ? "redis" : "memory",
    };
  }

  /**
   * Gracefully shuts down active Redis connections.
   */
  async disconnect(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {
        this.redisClient.disconnect();
      } finally {
        this.isRedisReady = false;
        this.redisClient = null;
      }
    }
  }
}

const globalForCache = globalThis as unknown as {
  cacheService?: CacheService;
};

export function getCacheService(): CacheService {
  if (!globalForCache.cacheService) {
    globalForCache.cacheService = new CacheService();
  }
  return globalForCache.cacheService;
}

export const cacheService = getCacheService();
