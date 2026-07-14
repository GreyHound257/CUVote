import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { ActivityService } from "@/services/activityService";
import { successResponse, errorResponse } from "@/utils/api";
import { logger } from "@/utils/logger";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "40", 10);

    let departmentId = session.user.departmentId ?? null;
    if (!departmentId && session.user.role === Role.STUDENT) {
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
        select: { departmentId: true },
      });
      departmentId = student?.departmentId ?? null;
    }

    const feed = await ActivityService.getFeed(
      {
        id: session.user.id,
        role: session.user.role as Role,
        departmentId,
      },
      limit
    );

    return successResponse(feed);
  } catch (error) {
    logger.error("GET /api/activity", error);
    return errorResponse("Internal server error", 500);
  }
}
