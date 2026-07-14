import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  resetRateLimitStore,
  RATE_LIMITS,
  buildRateLimitKey,
} from "../src/lib/rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("allows requests within the configured window", () => {
    const config = { windowMs: 60_000, maxRequests: 3 };
    const key = "test:ip";

    expect(checkRateLimit(key, config, 0).allowed).toBe(true);
    expect(checkRateLimit(key, config, 1000).allowed).toBe(true);
    expect(checkRateLimit(key, config, 2000).allowed).toBe(true);
  });

  it("blocks requests once the limit is exceeded", () => {
    const config = { windowMs: 60_000, maxRequests: 2 };
    const key = "test:block";

    checkRateLimit(key, config, 0);
    checkRateLimit(key, config, 1000);

    const blocked = checkRateLimit(key, config, 2000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets the window after expiry", () => {
    const config = { windowMs: 1000, maxRequests: 1 };
    const key = "test:reset";

    checkRateLimit(key, config, 0);
    const blocked = checkRateLimit(key, config, 500);
    expect(blocked.allowed).toBe(false);

    const allowed = checkRateLimit(key, config, 1500);
    expect(allowed.allowed).toBe(true);
  });

  it("builds stable bucket keys", () => {
    expect(buildRateLimitKey("VOTE_SUBMIT", ["1.2.3.4", "user:abc"])).toBe(
      "VOTE_SUBMIT:1.2.3.4:user:abc"
    );
  });

  it("exposes production limit presets", () => {
    expect(RATE_LIMITS.VOTE_SUBMIT.maxRequests).toBe(3);
    expect(RATE_LIMITS.AUTH_SENSITIVE.maxRequests).toBe(5);
  });
});
