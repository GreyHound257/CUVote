import { NextRequest } from "next/server";
import { forgotPasswordSchema } from "@/validation/auth";
import { PasswordResetService } from "@/services/passwordResetService";
import { successResponse, errorResponse } from "@/utils/api";
import { logger } from "@/utils/logger";
import { enforceRateLimit, parseJsonBody, RequestBodyError } from "@/lib/request";

export async function POST(req: NextRequest) {
  try {
    const limited = enforceRateLimit(req, "AUTH_SENSITIVE");
    if (limited) return limited;

    const body = await parseJsonBody(req);
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const emailLimited = enforceRateLimit(
      req,
      "AUTH_SENSITIVE",
      `email:${parsed.data.email.toLowerCase()}`
    );
    if (emailLimited) return emailLimited;

    const result = await PasswordResetService.requestReset(parsed.data.email);
    return successResponse(result);
  } catch (error: unknown) {
    if (error instanceof RequestBodyError) {
      return errorResponse(error.message, 413);
    }
    logger.error("POST /api/auth/forgot-password", error);
    return errorResponse("Unable to process password reset request.", 500);
  }
}
