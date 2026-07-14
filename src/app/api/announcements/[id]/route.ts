import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { AnnouncementService } from "@/services/announcementService";
import { updateAnnouncementSchema } from "@/validation/announcement";
import { successResponse, errorResponse } from "@/utils/api";
import { logger } from "@/utils/logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);
    if (session.user.role === Role.STUDENT) return errorResponse("Forbidden", 403);

    const { id } = await params;
    const body = await req.json();
    const parsed = updateAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const updated = await AnnouncementService.update(
      id,
      parsed.data,
      session.user.id,
      session.user.role as Role,
      session.user.departmentId
    );

    return successResponse(updated);
  } catch (error) {
    logger.error("PATCH /api/announcements/[id]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      400
    );
  }
}
