import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { setupWizardSchema } from "@/validation/auth";
import { successResponse, errorResponse } from "@/utils/api";
import bcrypt from "bcryptjs";
import { logAuditAction } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    // Check if a super admin already exists
    const superAdminExists = await prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN },
    });

    if (superAdminExists) {
      return errorResponse("Setup wizard is locked. A Super Administrator already exists.", 403);
    }

    const body = await req.json();
    const parsed = setupWizardSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { name, email, password } = parsed.data;

    const passwordHash = await bcrypt.hash(password, 12);

    const superAdmin = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: Role.SUPER_ADMIN,
        status: "ACTIVE",
      },
    });

    await logAuditAction(
      superAdmin.id,
      "SYSTEM_BOOTSTRAP",
      "Initial Super Administrator created via setup wizard",
      req.headers.get("x-forwarded-for") || undefined
    );

    return successResponse({ message: "Super Administrator created successfully" }, 201);
  } catch (error: unknown) {
    console.error("Setup Wizard Error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function GET() {
    try {
        const superAdminExists = await prisma.user.findFirst({
            where: { role: Role.SUPER_ADMIN },
        });

        return successResponse({ isSetupComplete: !!superAdminExists });
    } catch (error: unknown) {
        console.error("Setup Check Error:", error);
        return errorResponse("Internal server error", 500);
    }
}
