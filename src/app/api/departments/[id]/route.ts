import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateDepartmentSchema } from "@/validation/department";
import { successResponse, errorResponse } from "@/utils/api";
import { Roles } from "@/constants";
import { auth } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        faculty: true,
      },
    });

    if (!department) return errorResponse("Department not found", 404);

    return successResponse(department);
  } catch (error: unknown) {
    console.error("GET Department by ID Error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Roles.SUPER_ADMIN) {
      return errorResponse("Forbidden. Super Admin access required.", 403);
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateDepartmentSchema.safeParse({ ...body, id });

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { name, code, description, status, facultyId } = parsed.data;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return errorResponse("Department not found", 404);

    // Check duplicates if changing name or code
    if ((name && name !== existing.name) || (code && code !== existing.code)) {
      const duplicate = await prisma.department.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(name ? [{ name: { equals: name, mode: "insensitive" as const } }] : []),
            ...(code ? [{ code: { equals: code, mode: "insensitive" as const } }] : []),
          ],
        },
      });

      if (duplicate) {
        return errorResponse("Another department with this name or code already exists.", 409);
      }
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(facultyId !== undefined && { facultyId }),
      },
    });

    await logAuditAction(
      session.user.id,
      "DEPARTMENT_UPDATED",
      `Updated department ${updated.name} (${updated.code})`,
      req.headers.get("x-forwarded-for") || undefined
    );

    return successResponse(updated);
  } catch (error: unknown) {
    console.error("PUT Department Error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Roles.SUPER_ADMIN) {
      return errorResponse("Forbidden. Super Admin access required.", 403);
    }

    const { id } = await params;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return errorResponse("Department not found", 404);

    // TODO: When students and elections exist, check for linked records here.
    // If linked records exist, we might want to return an error suggesting DEACTIVATION instead.
    // For now, implement soft delete.
    const deleted = await prisma.department.update({
      where: { id },
      data: { status: "DELETED" },
    });

    await logAuditAction(
      session.user.id,
      "DEPARTMENT_DELETED",
      `Soft deleted department ${deleted.name} (${deleted.code})`,
      req.headers.get("x-forwarded-for") || undefined
    );

    return successResponse({ message: "Department deleted successfully" });
  } catch (error: unknown) {
    console.error("DELETE Department Error:", error);
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
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (!["activate", "deactivate", "restore"].includes(action || "")) {
      return errorResponse("Invalid action", 400);
    }

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return errorResponse("Department not found", 404);

    let newStatus = existing.status;
    let auditAction = "";

    if (action === "activate") {
      newStatus = "ACTIVE";
      auditAction = "DEPARTMENT_ACTIVATED";
    } else if (action === "deactivate") {
      newStatus = "INACTIVE";
      auditAction = "DEPARTMENT_DEACTIVATED";
    } else if (action === "restore") {
      newStatus = "ACTIVE";
      auditAction = "DEPARTMENT_RESTORED";
    }

    const updated = await prisma.department.update({
      where: { id },
      data: { status: newStatus },
    });

    await logAuditAction(
      session.user.id,
      auditAction,
      `Action '${action}' applied to department ${updated.name} (${updated.code})`,
      req.headers.get("x-forwarded-for") || undefined
    );

    return successResponse(updated);
  } catch (error: unknown) {
    console.error("PATCH Department Error:", error);
    return errorResponse("Internal server error", 500);
  }
}
