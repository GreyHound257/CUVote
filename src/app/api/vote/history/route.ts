import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    });

    if (!student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    // Get unique elections the student has voted in
    const voteRecords = await prisma.voteRecord.findMany({
      where: { studentId: student.id },
      include: {
        election: {
          select: {
            id: true,
            title: true,
            endTime: true,
          }
        },
        position: {
          select: {
            title: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Group by election
    const historyMap = new Map();
    for (const record of voteRecords) {
      if (!historyMap.has(record.election.id)) {
        historyMap.set(record.election.id, {
          election: record.election,
          votedAt: record.createdAt, // most recent vote record for this election
          positionsVoted: [],
        });
      }
      historyMap.get(record.election.id).positionsVoted.push(record.position.title);
    }

    const history = Array.from(historyMap.values());

    return NextResponse.json({ data: history });
  } catch (error: any) {
    console.error("Error in get voting history API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch history" },
      { status: 500 }
    );
  }
}
