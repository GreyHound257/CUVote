import { z } from "zod";
import { STUDENT_LEVELS } from "@/lib/electionEligibility";

export const positionSchema = z.object({
  title: z.string().min(1, "Position title is required"),
  description: z.string().optional(),
  minCandidates: z.number().int().min(1),
  maxCandidates: z.number().int().min(1),
});

export const createElectionSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  departmentId: z.string().min(1, "Department is required"),
  academicSessionId: z.string().min(1, "Academic session is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  /** Empty = all levels. Otherwise only selected levels. */
  eligibilityLevels: z
    .array(z.number().int())
    .refine(
      (levels) => levels.every((l) => (STUDENT_LEVELS as readonly number[]).includes(l)),
      "Invalid student level"
    ),
  positions: z.array(positionSchema).min(1, "At least one position is required"),
  /** Optional: also save this structure as a reusable template */
  saveAsTemplateName: z
    .string()
    .max(80)
    .optional(),
});

export type CreateElectionInput = z.infer<typeof createElectionSchema>;

export const updateElectionStatusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "SCHEDULED",
    "PUBLISHED",
    "VOTING_OPEN",
    "VOTING_CLOSED",
    "RESULTS_GENERATED",
    "PUBLISHED_RESULTS",
    "ARCHIVED",
  ]),
});

export const electionTemplateSchema = z.object({
  name: z.string().min(2, "Template name is required").max(80),
  description: z.string().optional(),
  departmentId: z.string().optional().nullable(),
  eligibilityLevels: z.array(z.number().int()).default([]),
  positions: z.array(positionSchema).min(1, "At least one position is required"),
});

export type ElectionTemplateInput = z.infer<typeof electionTemplateSchema>;
