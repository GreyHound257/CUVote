import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(255),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Code must be at least 2 characters")
    .max(10, "Code cannot exceed 10 characters")
    .regex(/^[A-Z0-9]+$/, "Code must contain only alphanumeric characters"),
  description: z.string().trim().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE").optional(),
  facultyId: z.string().cuid("Invalid faculty ID").optional().nullable(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial().extend({
  id: z.string().cuid("Invalid department ID"),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
