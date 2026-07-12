import { logger } from "@/utils/logger";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDepartmentSchema } from "@/validation/department";
import { successResponse, errorResponse } from "@/utils/api";
import { Roles } from "@/constants";
import { auth } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as Prisma.EnumDepartmentStatusFilter | undefined;
    const whereCondition: Prisma.DepartmentWhereInput = {
      status: status ? status : { not: "DELETED" },
    };

    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where: whereCondition,
        select: { id: true, name: true, code: true, description: true, status: true, facultyId: true, createdAt: true, updatedAt: true },
        orderBy: { name: "asc" },
      }),
      prisma.department.count({ where: whereCondition }),
    ]);

    return successResponse(departments);
  } catch (error: unknown) {
    logger.error("GET Departments Error:", error);
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
    const parsed = createDepartmentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { name, code, description, status, facultyId } = parsed.data;

    // Check for duplicates
    const existing = await prisma.department.findFirst({
      where: {
        OR: [{ name: { equals: name, mode: "insensitive" } }, { code: { equals: code, mode: "insensitive" } }],
      },
    });

    if (existing) {
      return errorResponse("Department with this name or code already exists.", 409);
    }

    const newDepartment = await prisma.department.create({
      data: {
        name,
        code,
        description,
        status: status || "ACTIVE",
        facultyId,
      },
    });

    await logAuditAction(
      session.user.id,
      "DEPARTMENT_CREATED",
      `Created department ${newDepartment.name} (${newDepartment.code})`,
      req.headers.get("x-forwarded-for") || undefined
    );

    return successResponse(newDepartment, 201);
  } catch (error: unknown) {
    logger.error("POST Department Error:", error);
    return errorResponse("Internal server error", 500);
  }
}
