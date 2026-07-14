import { describe, it, expect } from "vitest";
import { isLevelEligible } from "../src/lib/electionEligibility";

describe("electionEligibility", () => {
  it("allows all levels when eligibilityLevels is empty", () => {
    expect(isLevelEligible([], 100)).toBe(true);
    expect(isLevelEligible(null, 500)).toBe(true);
    expect(isLevelEligible(undefined, 200)).toBe(true);
  });

  it("allows only configured levels", () => {
    expect(isLevelEligible([100, 200], 100)).toBe(true);
    expect(isLevelEligible([100, 200], 200)).toBe(true);
    expect(isLevelEligible([100, 200], 300)).toBe(false);
  });
});
