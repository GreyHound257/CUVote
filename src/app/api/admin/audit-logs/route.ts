import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/utils/api";
import { Roles } from "@/constants";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role === Roles.STUDENT) {
      return errorResponse("Forbidden", 403);
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const actionFilter = searchParams.get("action") || "";
    const outcomeFilter = searchParams.get("outcome") || "";

    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { details: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
      ];
    }

    if (actionFilter) {
        whereClause.action = actionFilter;
    }

    if (outcomeFilter) {
        whereClause.outcome = outcomeFilter;
    }

    if (session.user.role === Roles.DEPARTMENT_ADMIN) {
      const deptId = session.user.departmentId;
      if (!deptId) return errorResponse("Department ID missing for admin", 400);

      // Fetch users in this department
      const usersInDept = await prisma.user.findMany({
        where: { departmentId: deptId },
        select: { id: true },
      });
      const userIds = usersInDept.map(u => u.id);

      whereClause.userId = { in: userIds };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                }
            }
        }
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    // Sanitize output for activity feed
    const sanitizedLogs = logs.map(log => ({
        id: log.id,
        action: log.action,
        details: log.details,
        entity: log.entity,
        entityId: log.entityId,
        outcome: log.outcome,
        createdAt: log.createdAt,
        user: log.user ? { name: log.user.name, email: log.user.email } : null
        // Omitted ipAddress and userAgent for secure administrative display
    }));

    return successResponse({
      data: sanitizedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Audit Logs GET Error:", error);
    return errorResponse("Internal server error", 500);
  }
}
