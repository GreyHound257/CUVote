import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserSchema } from "@/validation/user";
import { successResponse, errorResponse } from "@/utils/api";
import { Roles } from "@/constants";
import { auth } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";
import { Prisma, Role } from "@prisma/client";
import { logger } from "@/utils/logger";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Roles.SUPER_ADMIN) {
      return errorResponse("Forbidden. Super Admin access required.", 403);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") as Role | undefined;

    const whereCondition: Prisma.UserWhereInput = {};

    if (role) {
      whereCondition.role = role;
    }

    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereCondition,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          departmentId: true,
          lastLogin: true,
          createdAt: true,
          department: {
            select: { name: true }
          }
        }
      }),
      prisma.user.count({ where: whereCondition }),
    ]);

    return successResponse(users);
  } catch (error: unknown) {
    logger.error("GET Users Error:", error);
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
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { name, email, role, departmentId, status } = parsed.data;

    // Check for duplicates
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existing) {
      return errorResponse("User with this email already exists.", 409);
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        role,
        departmentId,
        status: status || "ACTIVE",
      },
      select: { id: true, name: true, email: true, role: true }
    });

    // Link matching Student profile so voting/dashboard works
    if (role === Role.STUDENT) {
      const student = await prisma.student.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!student) {
        await prisma.user.delete({ where: { id: newUser.id } });
        return errorResponse(
          "No student profile found with this email. Import/create the student first, or use a matching student email.",
          400
        );
      }

      if (student.userId && student.userId !== newUser.id) {
        await prisma.user.delete({ where: { id: newUser.id } });
        return errorResponse(
          "This student is already linked to another user account.",
          409
        );
      }

      await prisma.student.update({
        where: { id: student.id },
        data: {
          userId: newUser.id,
          ...(departmentId ? {} : { }),
        },
      });

      // Ensure user's department matches the student
      if (student.departmentId !== departmentId) {
        await prisma.user.update({
          where: { id: newUser.id },
          data: { departmentId: student.departmentId },
        });
      }
    }

    await logAuditAction(
      session.user.id,
      "USER_CREATED",
      `Created user ${newUser.email} with role ${newUser.role}`,
      req.headers.get("x-forwarded-for") || undefined
    );

    return successResponse(newUser, 201);
  } catch (error: unknown) {
    logger.error("POST User Error:", error);
    return errorResponse("Internal server error", 500);
  }
}
