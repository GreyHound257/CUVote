import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { Roles } from "@/constants";
import { successResponse, errorResponse } from "@/utils/api";
import { AcademicSessionService } from "@/services/academicSessionService";
import { academicSessionSchema } from "@/validation/academicSession";
import { logger } from "@/utils/logger";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    // Admins need sessions for election forms; Super Admin manages them.
    if (
      session.user.role !== Roles.SUPER_ADMIN &&
      session.user.role !== Roles.DEPARTMENT_ADMIN
    ) {
      return errorResponse("Forbidden", 403);
    }

    const includeArchived =
      req.nextUrl.searchParams.get("includeArchived") === "true" &&
      session.user.role === Roles.SUPER_ADMIN;

    const data = await AcademicSessionService.list(includeArchived);
    return successResponse(data);
  } catch (error: unknown) {
    logger.error("GET /api/academic-sessions", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Roles.SUPER_ADMIN) {
      return errorResponse("Forbidden. Super Admin access required.", 403);
    }

    const body = await req.json();
    const parsed = academicSessionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const created = await AcademicSessionService.create(parsed.data, session.user.id);
    return successResponse(created, 201);
  } catch (error: unknown) {
    logger.error("POST /api/academic-sessions", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.includes("Unique constraint") || message.includes("Unique constraint failed")) {
      return errorResponse("An academic session with this name already exists.", 409);
    }
    return errorResponse(message, 500);
  }
}
