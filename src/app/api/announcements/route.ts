import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { AnnouncementService } from "@/services/announcementService";
import { createAnnouncementSchema } from "@/validation/announcement";
import { successResponse, errorResponse } from "@/utils/api";
import { logger } from "@/utils/logger";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const manage = searchParams.get("manage") === "true";
    const status = searchParams.get("status") as
      | "DRAFT"
      | "PUBLISHED"
      | "ARCHIVED"
      | null;

    let departmentId = session.user.departmentId ?? null;
    if (!departmentId && session.user.role === Role.STUDENT) {
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
        select: { departmentId: true },
      });
      departmentId = student?.departmentId ?? null;
    }

    if (manage) {
      if (session.user.role === Role.STUDENT) {
        return errorResponse("Forbidden", 403);
      }

      const data = await AnnouncementService.listForAdmin({
        role: session.user.role as Role,
        departmentId,
        status: status ?? undefined,
      });
      return successResponse(data);
    }

    const data = await AnnouncementService.listForViewer({
      role: session.user.role as Role,
      departmentId,
    });
    return successResponse(data);
  } catch (error) {
    logger.error("GET /api/announcements", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);
    if (session.user.role === Role.STUDENT) return errorResponse("Forbidden", 403);

    const body = await req.json();
    const parsed = createAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    let departmentId = parsed.data.departmentId ?? null;
    if (session.user.role === Role.DEPARTMENT_ADMIN) {
      departmentId = session.user.departmentId ?? departmentId;
      if (parsed.data.audience === "DEPARTMENT" && !departmentId) {
        return errorResponse("Your account has no department assigned.", 400);
      }
    }

    const announcement = await AnnouncementService.create(
      {
        ...parsed.data,
        departmentId,
        status: parsed.data.status ?? "DRAFT",
      },
      session.user.id,
      session.user.role as Role
    );

    return successResponse(announcement, 201);
  } catch (error) {
    logger.error("POST /api/announcements", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      400
    );
  }
}
