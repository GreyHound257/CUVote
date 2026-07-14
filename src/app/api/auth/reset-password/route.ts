import { NextRequest } from "next/server";
import { resetPasswordSchema } from "@/validation/auth";
import { PasswordResetService } from "@/services/passwordResetService";
import { successResponse, errorResponse } from "@/utils/api";
import { logger } from "@/utils/logger";
import { enforceRateLimit, parseJsonBody, RequestBodyError } from "@/lib/request";

export async function POST(req: NextRequest) {
  try {
    const limited = enforceRateLimit(req, "AUTH_SENSITIVE");
    if (limited) return limited;

    const body = await parseJsonBody(req);
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const result = await PasswordResetService.resetPassword(
      parsed.data.token,
      parsed.data.password
    );
    return successResponse(result);
  } catch (error: unknown) {
    if (error instanceof RequestBodyError) {
      return errorResponse(error.message, 413);
    }
    logger.error("POST /api/auth/reset-password", error);
    const message =
      error instanceof Error ? error.message : "Unable to reset password.";
    return errorResponse(message, 400);
  }
}
