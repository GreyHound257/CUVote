import { z } from "zod";

const matricNoSchema = z
  .string()
  .trim()
  .min(5, "Matriculation number is too short")
  .max(20, "Matriculation number is too long")
  .toUpperCase();

const emailSchema = z
  .string()
  .trim()
  .email("Invalid email format")
  .toLowerCase()
  .refine(
    (email) => email.endsWith("@stu.cu.edu.ng"),
    "Email must be a valid @stu.cu.edu.ng address"
  );

export const createStudentSchema = z.object({
  matricNo: matricNoSchema,
  fullName: z.string().trim().min(3, "Full name is required"),
  email: emailSchema,
  level: z.coerce.number().int().positive("Level must be a positive integer"),
  departmentId: z.string().trim().min(1, "Department is required"),
});

export const updateStudentSchema = createStudentSchema.partial().extend({
  isEligible: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "GRADUATED"]).optional(),
});

export const studentImportRowSchema = z.object({
  matricNo: matricNoSchema,
  fullName: z.string().trim().min(3, "Full name is required"),
  email: emailSchema,
  level: z.coerce.number().int().positive("Level must be a positive integer"),
  departmentCode: z.string().trim().toUpperCase(),
});
