import { NextRequest } from "next/server";
import { StudentService } from "@/services/studentService";
import { successResponse, errorResponse } from "@/utils/api";
import { Roles } from "@/constants";
import { auth } from "@/lib/auth";
import { logger } from "@/utils/logger";

/**
 * Provision login accounts for students that were imported without a linked User.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse("Unauthorized", 401);
    }

    if (
      session.user.role !== Roles.SUPER_ADMIN &&
      session.user.role !== Roles.DEPARTMENT_ADMIN
    ) {
      return errorResponse("Forbidden", 403);
    }

    const allowedDepartmentId =
      session.user.role === Roles.DEPARTMENT_ADMIN
        ? session.user.departmentId ?? undefined
        : undefined;

    if (session.user.role === Roles.DEPARTMENT_ADMIN && !allowedDepartmentId) {
      return errorResponse("Department admin is not assigned to a department.", 400);
    }

    const result = await StudentService.provisionMissingUsers(allowedDepartmentId);
    return successResponse(result);
  } catch (error: unknown) {
    logger.error("POST students/provision-accounts Error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}
