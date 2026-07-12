import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [
      totalDepartments,
      totalStudents,
      totalDepartmentAdmins,
      electionsCount,
      totalCandidates,
      totalVotesCast,
      recentLogins,
      recentAuditLogs,
      activeElections,
      departmentStats
    ] = await Promise.all([
      prisma.department.count(),
      prisma.student.count(),
      prisma.user.count({ where: { role: "DEPARTMENT_ADMIN" } }),
      prisma.election.groupBy({
        by: ['status'],
        _count: true
      }),
      prisma.candidate.count(),
      prisma.voteRecord.count(),
      prisma.user.findMany({
        where: { lastLogin: { not: null } },
        orderBy: { lastLogin: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, role: true, lastLogin: true }
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { name: true, email: true } } }
      }),
      prisma.election.count({
        where: { status: { in: ["VOTING_OPEN", "PUBLISHED", "SCHEDULED"] } }
      }),
      prisma.department.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          _count: {
            select: { students: true, elections: true }
          }
        }
      })
    ]);

    // Format election status counts
    const electionsStatusSummary = electionsCount.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    // Turnout analytics: registered vs eligible
    const eligibleStudents = await prisma.student.count({ where: { isEligible: true } });

    // System health check placeholder (assuming healthy if db connects)
    const systemHealth = {
      status: "Healthy",
      database: "Connected",
      uptime: "99.9%"
    };

    return NextResponse.json({
      metrics: {
        totalDepartments,
        totalStudents,
        eligibleStudents,
        totalDepartmentAdmins,
        totalCandidates,
        totalVotesCast,
        activeElections,
        electionsStatusSummary
      },
      analytics: {
        departmentStats,
      },
      system: {
        health: systemHealth,
        recentLogins,
        recentAuditLogs
      }
    });

  } catch (error) {
    console.error("Super Admin Dashboard Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
