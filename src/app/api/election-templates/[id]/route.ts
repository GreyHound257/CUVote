import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { ElectionTemplateService } from "@/services/electionTemplateService";
import { successResponse, errorResponse } from "@/utils/api";
import { logger } from "@/utils/logger";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);
    if (session.user.role === Role.STUDENT) return errorResponse("Forbidden", 403);

    const { id } = await params;
    const template = await ElectionTemplateService.getById(id);

    if (
      session.user.role === Role.DEPARTMENT_ADMIN &&
      template.departmentId &&
      template.departmentId !== session.user.departmentId
    ) {
      return errorResponse("Forbidden", 403);
    }

    return successResponse(template);
  } catch (error: unknown) {
    logger.error("GET /api/election-templates/[id]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      404
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);
    if (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.DEPARTMENT_ADMIN) {
      return errorResponse("Forbidden", 403);
    }

    const { id } = await params;
    const template = await ElectionTemplateService.getById(id);

    if (
      session.user.role === Role.DEPARTMENT_ADMIN &&
      template.departmentId !== session.user.departmentId
    ) {
      return errorResponse("Forbidden", 403);
    }

    await ElectionTemplateService.delete(id);
    return successResponse({ deleted: true });
  } catch (error: unknown) {
    logger.error("DELETE /api/election-templates/[id]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      400
    );
  }
}
