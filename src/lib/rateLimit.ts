export type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

export const RATE_LIMITS = {
  /** Password reset and onboarding endpoints */
  AUTH_SENSITIVE: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
  /** Ballot submission — strict to deter abuse */
  VOTE_SUBMIT: { windowMs: 60 * 1000, maxRequests: 3 },
  /** Admin mutations (generate/publish results, bulk import) */
  ADMIN_WRITE: { windowMs: 60 * 1000, maxRequests: 60 },
  /** CSV / report exports */
  EXPORT: { windowMs: 60 * 1000, maxRequests: 10 },
  /** One-time setup wizard */
  SETUP: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

type WindowRecord = {
  count: number;
  resetAt: number;
};

const store = new Map<string, WindowRecord>();

function nowMs() {
  return Date.now();
}

/**
 * Sliding-window rate limiter (in-memory).
 * Suitable for single-instance deployments; swap store for Redis in multi-instance prod.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  currentTime = nowMs()
): RateLimitResult {
  const existing = store.get(key);

  if (!existing || currentTime >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: currentTime + config.windowMs });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      retryAfterSec: 0,
    };
  }

  if (existing.count >= config.maxRequests) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((existing.resetAt - currentTime) / 1000)
    );
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    retryAfterSec: 0,
  };
}

export function buildRateLimitKey(bucket: RateLimitBucket, parts: string[]) {
  return [bucket, ...parts.filter(Boolean)].join(":");
}

/** Test-only: clears in-memory counters between test cases */
export function resetRateLimitStore() {
  store.clear();
}
