import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { ElectionTemplateService } from "@/services/electionTemplateService";
import { electionTemplateSchema } from "@/validation/election";
import { successResponse, errorResponse } from "@/utils/api";
import { logger } from "@/utils/logger";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);
    if (session.user.role === Role.STUDENT) return errorResponse("Forbidden", 403);

    const departmentId = req.nextUrl.searchParams.get("departmentId");
    const isSuperAdmin = session.user.role === Role.SUPER_ADMIN;

    const data = await ElectionTemplateService.list({
      departmentId:
        departmentId ||
        (session.user.role === Role.DEPARTMENT_ADMIN
          ? session.user.departmentId
          : null),
      isSuperAdmin,
    });

    return successResponse(data);
  } catch (error: unknown) {
    logger.error("GET /api/election-templates", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);
    if (session.user.role === Role.STUDENT) return errorResponse("Forbidden", 403);

    const body = await req.json();
    const parsed = electionTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    let departmentId = parsed.data.departmentId ?? null;
    if (session.user.role === Role.DEPARTMENT_ADMIN) {
      departmentId = session.user.departmentId ?? null;
    }

    const created = await ElectionTemplateService.create(
      { ...parsed.data, departmentId },
      session.user.id
    );

    return successResponse(created, 201);
  } catch (error: unknown) {
    logger.error("POST /api/election-templates", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}
