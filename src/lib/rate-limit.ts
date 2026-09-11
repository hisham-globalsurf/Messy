import "server-only";

interface Bucket {
  count: number;
  resetAt: number;
}

// In-memory, per-process. Good enough to blunt naive credential-stuffing against
// a single-admin app; a multi-instance deployment would want a shared store
// (e.g. Redis) instead, since each instance tracks its own counters.
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Fixed-window limiter: `limit` attempts per `windowMs`, keyed by caller-supplied id. */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Clears a key's counter — call on a successful login so real users never get stuck. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Best-effort client identifier from proxy headers (Next.js dropped `NextRequest.ip` in v15). */
export function clientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
