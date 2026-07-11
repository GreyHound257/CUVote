import { z } from "zod";
import { Role, UserStatus } from "@prisma/client";

export const baseUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(255),
  email: z.string().email("Invalid email address"),
  role: z.nativeEnum(Role),
  departmentId: z.string().cuid().optional().nullable(),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE).optional(),
});

export const createUserSchema = baseUserSchema.refine((data) => {
  if (data.role === Role.DEPARTMENT_ADMIN && !data.departmentId) {
    return false;
  }
  return true;
}, {
  message: "Department is required for Department Administrators",
  path: ["departmentId"],
});

export const updateUserSchema = baseUserSchema.partial().extend({
  id: z.string().cuid("Invalid user ID"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
