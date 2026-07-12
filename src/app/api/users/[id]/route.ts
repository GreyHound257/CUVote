import { logger } from "@/utils/logger";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/validation/user";
import { successResponse, errorResponse } from "@/utils/api";
import { Roles } from "@/constants";
import { auth } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    // Allow super admin to view anyone, and users to view themselves
    const { id } = await params;

    if (!session?.user) return errorResponse("Unauthorized", 401);
    if (session.user.role !== Roles.SUPER_ADMIN && session.user.id !== id) {
       return errorResponse("Forbidden.", 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          departmentId: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          department: {
            select: { name: true }
          }
      }
    });

    if (!user) return errorResponse("User not found", 404);

    return successResponse(user);
  } catch (error: unknown) {
    logger.error("GET User by ID Error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) return errorResponse("Unauthorized", 401);

    // Only super admin can edit roles/departments, but users can edit their own basic info
    const isSuperAdmin = session.user.role === Roles.SUPER_ADMIN;
    const isSelf = session.user.id === id;

    if (!isSuperAdmin && !isSelf) {
      return errorResponse("Forbidden.", 403);
    }

    const body = await req.json();
    const parsed = updateUserSchema.safeParse({ ...body, id });

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    let { name, email, role, departmentId, status } = parsed.data;

    // Strip protected fields if not super admin
    if (!isSuperAdmin) {
       role = undefined;
       departmentId = undefined;
       status = undefined;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return errorResponse("User not found", 404);

    // Super admins cannot change another super admin's role
    if (isSuperAdmin && !isSelf && existing.role === Roles.SUPER_ADMIN && role && role !== Roles.SUPER_ADMIN) {
       return errorResponse("Cannot downgrade another Super Administrator.", 403);
    }

    // Check duplicates if changing email
    if (email && email.toLowerCase() !== existing.email?.toLowerCase()) {
      const duplicate = await prisma.user.findFirst({
        where: { id: { not: id }, email: email.toLowerCase() },
      });

      if (duplicate) {
        return errorResponse("Another user with this email already exists.", 409);
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email: email.toLowerCase() }),
        ...(role && { role }),
        ...(departmentId !== undefined && { departmentId }),
        ...(status && { status }),
      },
      select: { id: true, email: true, name: true, role: true }
    });

    await logAuditAction(
      session.user.id,
      isSelf ? "PROFILE_UPDATED" : "USER_UPDATED",
      `Updated user ${updated.email}`,
      req.headers.get("x-forwarded-for") || undefined
    );

    return successResponse(updated);
  } catch (error: unknown) {
    logger.error("PUT User Error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Roles.SUPER_ADMIN) {
      return errorResponse("Forbidden. Super Admin access required.", 403);
    }

    const { id } = await params;

    // Prevent self-suspension/deletion
    if (session.user.id === id) {
       return errorResponse("You cannot modify your own account status here.", 403);
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (!["activate", "suspend", "delete"].includes(action || "")) {
      return errorResponse("Invalid action", 400);
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return errorResponse("User not found", 404);

    if (existing.role === Roles.SUPER_ADMIN) {
       return errorResponse("Cannot modify status of another Super Administrator.", 403);
    }

    let newStatus = existing.status;
    let auditAction = "";

    if (action === "activate") {
      newStatus = "ACTIVE";
      auditAction = "USER_ACTIVATED";
    } else if (action === "suspend") {
      newStatus = "SUSPENDED";
      auditAction = "USER_SUSPENDED";
    } else if (action === "delete") {
      newStatus = "DELETED";
      auditAction = "USER_DELETED";
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: { email: true }
    });

    await logAuditAction(
      session.user.id,
      auditAction,
      `Action '${action}' applied to user ${updated.email}`,
      req.headers.get("x-forwarded-for") || undefined
    );

    return successResponse(updated);
  } catch (error: unknown) {
    logger.error("PATCH User Error:", error);
    return errorResponse("Internal server error", 500);
  }
}
