import { z } from "zod";

export const academicSessionSchema = z.object({
  name: z
    .string()
    .min(4, "Session name is required (e.g. 2026/2027)")
    .max(32)
    .regex(/^\d{4}\/\d{4}$/, "Use format YYYY/YYYY (e.g. 2026/2027)"),
  startsOn: z.string().optional().nullable(),
  endsOn: z.string().optional().nullable(),
  isCurrent: z.boolean().optional().default(false),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional().default("ACTIVE"),
});

export const updateAcademicSessionSchema = academicSessionSchema.partial().extend({
  name: z
    .string()
    .min(4)
    .max(32)
    .regex(/^\d{4}\/\d{4}$/, "Use format YYYY/YYYY (e.g. 2026/2027)")
    .optional(),
});

export type AcademicSessionInput = z.infer<typeof academicSessionSchema>;
export type UpdateAcademicSessionInput = z.infer<typeof updateAcademicSessionSchema>;
