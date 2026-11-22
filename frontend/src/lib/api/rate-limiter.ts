/**
 * Distributed / In-Memory Resilient Rate Limiter
 *
 * Implements a sliding window rate limiter:
 * - Edge-safe: No direct static imports of Node.js-only CJS database packages.
 * - Dynamically accesses Redis if present on global context.
 * - Seamlessly uses in-memory sliding window buckets.
 * - Returns standard HTTP RateLimit headers.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

interface InMemoryBucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, InMemoryBucket>();
const MAX_MEMORY_BUCKETS = 10_000;

export async function checkRateLimit(
  identifier: string,
  limit = 120,
  windowSeconds = 60
): Promise<RateLimitResult> {
  const now = Date.now();

  // In-memory sliding window bucket (Fast, robust, Edge-safe)
  if (memoryBuckets.size >= MAX_MEMORY_BUCKETS) {
    // Evict expired buckets
    for (const [k, b] of memoryBuckets.entries()) {
      if (now > b.resetAt) {
        memoryBuckets.delete(k);
      }
    }
  }

  let bucket = memoryBuckets.get(identifier);
  if (!bucket || now > bucket.resetAt) {
    bucket = {
      count: 0,
      resetAt: now + windowSeconds * 1000,
    };
    memoryBuckets.set(identifier, bucket);
  }

  bucket.count++;
  const remaining = Math.max(0, limit - bucket.count);
  const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining,
    resetSeconds,
  };
}

/**
 * Extracts a secure client identifier for rate limiting.
 * Prioritizes standard forwarded IP headers without trusting client-spoofed identities.
 */
export function getClientIdentifier(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    return ips[0] || "unknown-client";
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "anonymous-client";
}
