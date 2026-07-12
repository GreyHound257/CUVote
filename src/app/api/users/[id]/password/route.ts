import { logger } from "@/utils/logger";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/validation/auth";
import { successResponse, errorResponse } from "@/utils/api";
import { Roles } from "@/constants";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) return errorResponse("Unauthorized", 401);

    const isSuperAdmin = session.user.role === Roles.SUPER_ADMIN;
    const isSelf = session.user.id === id;

    if (!isSuperAdmin && !isSelf) {
      return errorResponse("Forbidden.", 403);
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return errorResponse("User not found", 404);

    const body = await req.json();

    // If it's a super admin resetting another user's password, we might skip old password check.
    // But for the scope of this implementation, we'll enforce the standard change password flow for self,
    // and provide a reset flag for super admins.

    const isReset = isSuperAdmin && !isSelf && body.forceReset;

    if (isReset) {
       // Validate new password only
       if (!body.newPassword || body.newPassword.length < 8) {
           return errorResponse("New password must be at least 8 characters.", 400);
       }
       const passwordHash = await bcrypt.hash(body.newPassword, 12);
       await prisma.user.update({ where: { id }, data: { passwordHash } });

       await logAuditAction(
          session.user.id,
          "PASSWORD_RESET",
          `Admin reset password for user ${user.email}`,
          req.headers.get("x-forwarded-for") || undefined
       );

       return successResponse({ message: "Password reset successfully" });
    }

    // Standard change password flow (requires current password)
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    if (!user.passwordHash) {
       return errorResponse("User has no password set.", 400);
    }

    const passwordsMatch = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!passwordsMatch) {
       return errorResponse("Incorrect current password.", 400);
    }

    const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({ where: { id }, data: { passwordHash: newPasswordHash } });

    await logAuditAction(
        session.user.id,
        "PASSWORD_CHANGED",
        `User ${user.email} changed their password`,
        req.headers.get("x-forwarded-for") || undefined
    );

    return successResponse({ message: "Password changed successfully" });
  } catch (error: unknown) {
    logger.error("Change Password Error:", error);
    return errorResponse("Internal server error", 500);
  }
}
