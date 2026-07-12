import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "DEPARTMENT_ADMIN" || !session.user.departmentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const departmentId = session.user.departmentId;

    const [
      department,
      totalStudents,
      eligibleStudents,
      electionsCount,
      candidatesAwaitingApproval,
      recentActivity,
      activeElections
    ] = await Promise.all([
      prisma.department.findUnique({
        where: { id: departmentId },
        select: { id: true, name: true, code: true, status: true }
      }),
      prisma.student.count({ where: { departmentId } }),
      prisma.student.count({ where: { departmentId, isEligible: true } }),
      prisma.election.groupBy({
        by: ['status'],
        where: { departmentId },
        _count: true
      }),
      prisma.candidate.findMany({
        where: {
          election: { departmentId },
          status: "PENDING_REVIEW"
        },
        include: {
          student: { select: { fullName: true, matricNo: true } },
          position: { select: { title: true } },
          election: { select: { title: true } }
        },
        take: 5
      }),
      prisma.auditLog.findMany({
        where: {
          user: { departmentId }
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { name: true, email: true } } }
      }),
      prisma.election.findMany({
        where: {
          departmentId,
          status: { in: ["VOTING_OPEN", "PUBLISHED", "SCHEDULED"] }
        },
        orderBy: { startTime: 'asc' },
        take: 5,
        select: { id: true, title: true, status: true, startTime: true, endTime: true, departmentId: true }
      })
    ]);

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Format election status counts
    const electionsStatusSummary = electionsCount.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      department,
      metrics: {
        totalStudents,
        eligibleStudents,
        electionsStatusSummary
      },
      elections: {
        active: activeElections,
        awaitingApproval: candidatesAwaitingApproval
      },
      activity: recentActivity
    });

  } catch (error) {
    console.error("Department Admin Dashboard Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
