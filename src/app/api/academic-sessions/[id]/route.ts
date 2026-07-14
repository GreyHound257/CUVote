import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { Roles } from "@/constants";
import { successResponse, errorResponse } from "@/utils/api";
import { AcademicSessionService } from "@/services/academicSessionService";
import { updateAcademicSessionSchema } from "@/validation/academicSession";
import { logger } from "@/utils/logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Roles.SUPER_ADMIN) {
      return errorResponse("Forbidden. Super Admin access required.", 403);
    }

    const { id } = await params;
    const body = await req.json();

    if (body?.action === "setCurrent") {
      const updated = await AcademicSessionService.setCurrent(id, session.user.id);
      return successResponse(updated);
    }

    if (body?.action === "archive") {
      const updated = await AcademicSessionService.archive(id, session.user.id);
      return successResponse(updated);
    }

    const parsed = updateAcademicSessionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const updated = await AcademicSessionService.update(id, parsed.data, session.user.id);
    return successResponse(updated);
  } catch (error: unknown) {
    logger.error("PATCH /api/academic-sessions/[id]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : 500;
    return errorResponse(message, status);
  }
}
