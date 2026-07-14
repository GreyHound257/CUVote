import { z } from "zod";

export const candidateProfileSchema = z.object({
  slogan: z.string().max(160).optional().nullable(),
  manifesto: z.string().max(8000).optional().nullable(),
  visionStatement: z.string().max(4000).optional().nullable(),
  photoUrl: z
    .union([z.string().url("Photo must be a valid URL"), z.literal("")])
    .optional()
    .nullable(),
});

export const nominateCandidateSchema = z.object({
  studentId: z.string().min(1),
  electionId: z.string().min(1),
  positionId: z.string().min(1),
  slogan: z.string().max(160).optional(),
  manifesto: z.string().max(8000).optional(),
  visionStatement: z.string().max(4000).optional(),
  photoUrl: z.union([z.string().url(), z.literal("")]).optional(),
});

export const updateCandidateSchema = candidateProfileSchema.extend({
  status: z
    .enum([
      "DRAFT",
      "PENDING_REVIEW",
      "APPROVED",
      "REJECTED",
      "WITHDRAWN",
      "DISQUALIFIED",
    ])
    .optional(),
});

export type NominateCandidateInput = z.infer<typeof nominateCandidateSchema>;
export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;
