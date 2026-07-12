import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VotingService } from "@/services/votingService";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get("electionId");

    if (!electionId) {
      return NextResponse.json({ error: "Missing electionId parameter" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    });

    if (!student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    const ballot = await VotingService.getBallot(electionId, student.id, student.departmentId);

    return NextResponse.json({ data: ballot });
  } catch (error: any) {
    console.error("Error in get ballot API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch ballot" },
      { status: 500 }
    );
  }
}
