import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== Role.STUDENT) {
      return NextResponse.json(
        { error: "Only students can view voting history. Please log in with a student account." },
        { status: 403 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    });

    if (!student) {
      return NextResponse.json(
        { error: "No student profile linked to your account. Contact your administrator." },
        { status: 404 }
      );
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
      },
      orderBy: { createdAt: "desc" }
    });

    const history = voteRecords.map((record) => ({
      election: record.election,
      votedAt: record.createdAt,
    }));

    return NextResponse.json({ data: history });
  } catch (error: unknown) {
    logger.error("Error in get voting history API:", error);
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : "Internal Server Error") || "Failed to fetch history" },
      { status: 500 }
    );
  }
}
