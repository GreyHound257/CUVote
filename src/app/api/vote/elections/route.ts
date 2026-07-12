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

    // Ensure the user is a student and we have their student record
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    });

    if (!student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    const elections = await VotingService.getActiveElections(student.id, student.departmentId);

    return NextResponse.json({ data: elections });
  } catch (error: any) {
    console.error("Error in get elections API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch elections" },
      { status: 500 }
    );
  }
}
