import { z } from "zod";

// 1. Define your enums locally using Zod instead of importing from Prisma
const RoleEnum = z.enum(["SUPER_ADMIN", "DEPARTMENT_ADMIN", "STUDENT"]);
const UserStatusEnum = z.enum(["ACTIVE", "SUSPENDED", "DELETED"]);

export const baseUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(255),
  email: z.string().email("Invalid email address"),
  role: RoleEnum, // 2. Use the local Zod enum
  departmentId: z.string().cuid().optional().nullable(),
  status: UserStatusEnum.default("ACTIVE").optional(), // 3. Default to the string "ACTIVE"
});

export const createUserSchema = baseUserSchema.refine((data) => {
  // 4. Use the string literal "DEPARTMENT_ADMIN" for the comparison
  if (data.role === "DEPARTMENT_ADMIN" && !data.departmentId) {
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
