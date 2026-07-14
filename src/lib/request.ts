import { NextResponse } from "next/server";
import {
  buildRateLimitKey,
  checkRateLimit,
  RATE_LIMITS,
  type RateLimitBucket,
} from "@/lib/rateLimit";
import { rateLimitedResponse } from "@/utils/api";

export class RequestBodyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestBodyError";
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Returns a 429 response when the limit is exceeded, otherwise null.
 */
export function enforceRateLimit(
  req: Request,
  bucket: RateLimitBucket,
  suffix?: string
): NextResponse | null {
  const ip = getClientIp(req);
  const key = buildRateLimitKey(bucket, [ip, suffix ?? ""]);
  const result = checkRateLimit(key, RATE_LIMITS[bucket]);

  if (!result.allowed) {
    return rateLimitedResponse(result.retryAfterSec);
  }

  return null;
}

export async function parseJsonBody<T = unknown>(
  req: Request,
  maxBytes = 512_000
): Promise<T> {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const length = Number.parseInt(contentLength, 10);
    if (!Number.isNaN(length) && length > maxBytes) {
      throw new RequestBodyError("Request body is too large.");
    }
  }

  const text = await req.text();
  if (text.length > maxBytes) {
    throw new RequestBodyError("Request body is too large.");
  }

  if (!text.trim()) {
    throw new RequestBodyError("Request body is required.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new RequestBodyError("Invalid JSON payload.");
  }
}
