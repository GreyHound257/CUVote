import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { onboardSchema } from "@/validation/onboard";
import { successResponse, errorResponse } from "@/utils/api";
import bcrypt from "bcryptjs";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = onboardSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return errorResponse("User not found.", 404);
    }

    if (user.passwordHash) {
       return errorResponse("User has already set a password. Please use the login page.", 400);
    }

    if (user.status !== "ACTIVE") {
       return errorResponse("User account is not active.", 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    await logAuditAction(
      user.id,
      "USER_ONBOARDED",
      `User ${user.email} set their initial password`,
      req.headers.get("x-forwarded-for") || undefined
    );

    return successResponse({ message: "Password set successfully" }, 200);
  } catch (error: unknown) {
    console.error("Onboard Error:", error);
    return errorResponse("Internal server error", 500);
  }
}
