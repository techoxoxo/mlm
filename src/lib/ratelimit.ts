import { headers } from "next/headers";
import { connection } from "./redis";

/**
 * Fixed-window rate limiter backed by Redis. Returns false when the caller has
 * exceeded `limit` actions within `windowSec`. Fails OPEN (allows) if Redis is
 * unreachable, so a cache blip never locks everyone out.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; retryAfter: number }> {
  try {
    const redisKey = `rl:${key}`;
    const n = await connection.incr(redisKey);
    if (n === 1) await connection.expire(redisKey, windowSec);
    if (n > limit) {
      const ttl = await connection.ttl(redisKey);
      return { ok: false, retryAfter: ttl > 0 ? ttl : windowSec };
    }
    return { ok: true, retryAfter: 0 };
  } catch {
    return { ok: true, retryAfter: 0 };
  }
}

/** Best-effort client IP from proxy headers. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
