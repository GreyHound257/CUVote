import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VotingService } from "@/services/votingService";
import { Role } from "@prisma/client";
import { logger } from "@/utils/logger";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== Role.STUDENT) {
      return NextResponse.json(
        { error: "Only students can access the voting dashboard. Please log in with a student account." },
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

    const elections = await VotingService.getActiveElections(student.id, student.departmentId);

    return NextResponse.json({ data: elections });
  } catch (error: unknown) {
    logger.error("Error in get elections API:", error);
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : "Internal Server Error") || "Failed to fetch elections" },
      { status: 500 }
    );
  }
}
