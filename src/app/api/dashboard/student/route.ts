import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: {
        department: { select: { id: true, name: true, code: true } }
      }
    });

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const [
      eligibleElections,
      upcomingElections,
      votingHistory,
      publishedResults
    ] = await Promise.all([
      prisma.election.findMany({
        where: {
          departmentId: student.departmentId,
          status: "VOTING_OPEN"
        },
        orderBy: { endTime: 'asc' },
        select: { id: true, title: true, status: true, startTime: true, endTime: true, departmentId: true }
      }),
      prisma.election.findMany({
        where: {
          departmentId: student.departmentId,
          status: { in: ["SCHEDULED", "PUBLISHED"] }
        },
        orderBy: { startTime: 'asc' },
        select: { id: true, title: true, status: true, startTime: true, endTime: true, departmentId: true }
      }),
      prisma.voteRecord.findMany({
        where: { studentId: student.id },
        include: {
          election: { select: { id: true, title: true, status: true } },
          position: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.election.findMany({
        where: {
          departmentId: student.departmentId,
          status: "PUBLISHED_RESULTS"
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, startTime: true, endTime: true, departmentId: true }
      })
    ]);

    // Determine voting status for eligible elections
    const eligibleElectionsWithStatus = await Promise.all(
      eligibleElections.map(async (election) => {
        const voteCount = await prisma.voteRecord.count({
          where: {
            studentId: student.id,
            electionId: election.id
          }
        });
        return {
          ...election,
          hasVoted: voteCount > 0
        };
      })
    );

    return NextResponse.json({
      profile: {
        id: student.id,
        fullName: student.fullName,
        matricNo: student.matricNo,
        level: student.level,
        isEligible: student.isEligible,
        status: student.status,
        department: student.department
      },
      elections: {
        eligible: eligibleElectionsWithStatus,
        upcoming: upcomingElections,
        publishedResults
      },
      history: votingHistory
    });

  } catch (error) {
    console.error("Student Dashboard Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
