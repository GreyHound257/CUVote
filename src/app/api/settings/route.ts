import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { Roles } from "@/constants";
import { successResponse, errorResponse } from "@/utils/api";
import { SystemSettingsService } from "@/services/systemSettingsService";
import { updateSystemSettingsSchema } from "@/validation/systemSettings";
import { logger } from "@/utils/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    // Any authenticated admin can read (live results UI needs it)
    if (
      session.user.role !== Roles.SUPER_ADMIN &&
      session.user.role !== Roles.DEPARTMENT_ADMIN
    ) {
      return errorResponse("Forbidden", 403);
    }

    const data = await SystemSettingsService.getSettings();
    return successResponse(data);
  } catch (error: unknown) {
    logger.error("GET /api/settings", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Roles.SUPER_ADMIN) {
      return errorResponse("Forbidden. Super Admin access required.", 403);
    }

    const body = await req.json();
    const parsed = updateSystemSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const data = await SystemSettingsService.updateSettings(parsed.data, session.user.id);
    return successResponse(data);
  } catch (error: unknown) {
    logger.error("PATCH /api/settings", error);
    return errorResponse("Internal server error", 500);
  }
}
