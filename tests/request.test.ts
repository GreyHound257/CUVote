import { describe, it, expect } from "vitest";
import { getClientIp } from "../src/lib/request";

describe("request helpers", () => {
  it("extracts the first forwarded IP", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip then unknown", () => {
    const withRealIp = new Request("http://localhost", {
      headers: { "x-real-ip": "198.51.100.2" },
    });
    expect(getClientIp(withRealIp)).toBe("198.51.100.2");

    const bare = new Request("http://localhost");
    expect(getClientIp(bare)).toBe("unknown");
  });
});
