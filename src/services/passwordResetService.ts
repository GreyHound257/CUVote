import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { env } from "@/env";
import { logAuditAction } from "@/lib/audit";

const RESET_PREFIX = "pwd-reset:";
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

function identifierForEmail(email: string) {
  return `${RESET_PREFIX}${email.toLowerCase()}`;
}

export class PasswordResetService {
  /**
   * Creates a single-use reset token for an existing active user.
   * Always safe to call — does not reveal whether the email exists.
   */
  static async requestReset(email: string) {
    const normalized = email.toLowerCase().trim();
    const genericMessage =
      "If an account exists for that email, password reset instructions have been sent.";

    const user = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true, name: true, status: true, passwordHash: true },
    });

    // No user, suspended, or never onboarded (no password yet — use /onboarding instead)
    if (!user || user.status !== "ACTIVE" || !user.passwordHash || !user.email) {
      return { message: genericMessage };
    }

    const identifier = identifierForEmail(user.email);
    await prisma.verificationToken.deleteMany({ where: { identifier } });

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expires = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.verificationToken.create({
      data: {
        identifier,
        token: tokenHash,
        expires,
      },
    });

    const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || env.NEXTAUTH_URL;
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

    // Email is future-ready — log delivery for ops / local testing
    logger.info(
      `[PasswordReset] Reset link for ${user.email} (expires ${expires.toISOString()}): ${resetUrl}`
    );

    await logAuditAction(
      user.id,
      "PASSWORD_RESET_REQUESTED",
      `Password reset requested for ${user.email}`,
      null
    );

    return {
      message: genericMessage,
      // Only expose the link in development so local testing works without SMTP
      ...(env.NODE_ENV === "development" ? { devResetUrl: resetUrl } : {}),
    };
  }

  static async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = hashToken(rawToken);

    const record = await prisma.verificationToken.findUnique({
      where: { token: tokenHash },
    });

    if (!record || !record.identifier.startsWith(RESET_PREFIX)) {
      throw new Error("Invalid or expired reset link.");
    }

    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token: tokenHash } }).catch(() => {});
      throw new Error("This reset link has expired. Please request a new one.");
    }

    const email = record.identifier.slice(RESET_PREFIX.length);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.status !== "ACTIVE") {
      throw new Error("Invalid or expired reset link.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.verificationToken.delete({ where: { token: tokenHash } }),
    ]);

    await logAuditAction(
      user.id,
      "PASSWORD_RESET_COMPLETED",
      `Password reset completed for ${user.email}`,
      null
    );

    return { success: true, message: "Password updated. You can sign in now." };
  }
}
