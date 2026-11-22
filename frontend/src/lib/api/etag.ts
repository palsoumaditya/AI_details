import { NextResponse } from "next/server";

/**
 * Computes a fast, collision-resistant weak ETag using 64-bit Murmur/FNV hashing.
 * 100% Edge-compatible with zero native dependencies.
 */
export function generateETag(payload: unknown): string {
  const str = typeof payload === "string" ? payload : JSON.stringify(payload);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  return `W/"${hash}"`;
}

/**
 * Checks if client's If-None-Match matches the computed ETag.
 * If matched, returns HTTP 304 Not Modified.
 */
export function handleETagCheck(
  ifNoneMatchHeader: string | null,
  etag: string,
  cacheControl = "public, s-maxage=60, stale-while-revalidate=300"
): NextResponse | null {
  if (!ifNoneMatchHeader) return null;

  // Handles W/"hash" or "hash" or multiple comma-separated ETags
  const matches = ifNoneMatchHeader
    .split(",")
    .map((tag) => tag.trim());

  if (matches.includes(etag) || matches.includes(etag.replace(/^W\//, ""))) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": cacheControl,
      },
    });
  }

  return null;
}
