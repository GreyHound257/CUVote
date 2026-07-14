/** Shared CUVote election helpers (levels, eligibility). */

export const STUDENT_LEVELS = [100, 200, 300, 400, 500] as const;

export type StudentLevel = (typeof STUDENT_LEVELS)[number];

/**
 * Empty or missing eligibilityLevels = all levels may vote.
 */
export function isLevelEligible(
  eligibilityLevels: number[] | null | undefined,
  studentLevel: number
): boolean {
  if (!eligibilityLevels || eligibilityLevels.length === 0) return true;
  return eligibilityLevels.includes(studentLevel);
}
