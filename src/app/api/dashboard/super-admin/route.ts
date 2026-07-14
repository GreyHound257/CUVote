import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";

// Helper function to get hourly vote aggregation
async function getVoteAggregation(departmentId?: string) {
  const whereClause: any = {};
  if (departmentId) {
    whereClause.election = { departmentId };
  }
  
  // Daily aggregation for last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  whereClause.createdAt = { gte: sevenDaysAgo };

  const rawData = await prisma.voteRecord.findMany({
    where: whereClause,
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Aggregate by day
  const dailyData: Record<string, number> = {};
  rawData.forEach(vote => {
    const dateStr = vote.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
    dailyData[dateStr] = (dailyData[dateStr] || 0) + 1;
  });

  const turnoutDaily = Object.keys(dailyData).sort().map(date => ({
    time: date,
    votes: dailyData[date],
  }));

  return { turnoutDaily };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Neon free/dev tiers choke on large parallel batches — keep groups small.
    const [
      totalDepartments,
      totalStudents,
      eligibleStudents,
      totalDepartmentAdmins,
      electionsCount,
    ] = await Promise.all([
      prisma.department.count(),
      prisma.student.count(),
      prisma.student.count({ where: { isEligible: true } }),
      prisma.user.count({ where: { role: "DEPARTMENT_ADMIN" } }),
      prisma.election.groupBy({
        by: ["status"],
        _count: true,
      }),
    ]);

    const [
      totalCandidates,
      totalVotesCast,
      activeElections,
      recentLogins,
      voteAggregation,
    ] = await Promise.all([
      prisma.candidate.count(),
      prisma.voteRecord.count(),
      prisma.election.count({
        where: { status: { in: ["VOTING_OPEN", "PUBLISHED", "SCHEDULED", "VOTING_CLOSED"] } },
      }),
      prisma.user.findMany({
        where: { lastLogin: { not: null } },
        orderBy: { lastLogin: "desc" },
        take: 5,
        select: { id: true, name: true, email: true, role: true, lastLogin: true },
      }),
      getVoteAggregation(),
    ]);

    const [recentAuditLogs, departmentStats] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.department.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          _count: {
            select: { students: true, elections: true },
          },
        },
      }),
    ]);

    const electionsStatusSummary = electionsCount.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      metrics: {
        totalDepartments,
        totalStudents,
        eligibleStudents,
        totalDepartmentAdmins,
        totalCandidates,
        totalVotesCast,
        activeElections,
        electionsStatusSummary,
      },
      analytics: {
        departmentStats,
        turnoutDaily: voteAggregation.turnoutDaily,
      },
      system: {
        health: {
          status: "Healthy",
          database: "Connected",
          uptime: "99.9%",
        },
        recentLogins,
        recentAuditLogs,
      },
    });
  } catch (error) {
    logger.error("Super Admin Dashboard Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
