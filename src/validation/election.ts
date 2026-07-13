import { z } from "zod";

export const positionSchema = z.object({
  title: z.string().min(1, "Position title is required"),
  description: z.string().optional(),
  minCandidates: z.number().int().min(1).default(1),
  maxCandidates: z.number().int().min(1).default(1),
});

export const createElectionSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  departmentId: z.string().min(1, "Department is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  positions: z.array(positionSchema).min(1, "At least one position is required"),
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
