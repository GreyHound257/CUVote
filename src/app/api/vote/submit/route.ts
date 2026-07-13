import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VotingService } from "@/services/votingService";
import { z } from "zod";

const submitVoteSchema = z.object({
  electionId: z.string().min(1, "Election ID is required"),
  votes: z.array(
    z.object({
      positionId: z.string().min(1, "Position ID is required"),
      candidateId: z.string().min(1, "Candidate ID is required"),
    })
  ).min(1, "At least one vote is required"),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = submitVoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { electionId, votes } = parsed.data;

    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    });

    if (!student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("remote-addr") || undefined;

    await VotingService.submitVote(electionId, student.id, votes, ipAddress);

    return NextResponse.json({ success: true, message: "Vote submitted successfully" });
  } catch (error: unknown) {
    logger.error("Error in submit vote API:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const isDuplicateVote = message.includes("already voted");
    const status = isDuplicateVote ? 409 : 400;
    return NextResponse.json(
      { error: message || "Failed to submit vote" },
      { status }
    );
  }
}
