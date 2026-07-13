import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ResultService } from "@/services/resultService";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ electionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const { electionId } = await params;

    if (!electionId) {
      return new NextResponse("Missing electionId", { status: 400 });
    }

    const data = await ResultService.getResults(electionId, {
      role: session.user.role,
      departmentId: session.user.departmentId,
    });

    const rows = [
      ["Election", "Position", "Candidate", "Votes", "Percentage", "Is Tie"],
    ];

    for (const position of data.positions) {
      for (const candidate of position.candidates) {
        rows.push([
          `"${data.title.replace(/"/g, '""')}"`,
          `"${position.title.replace(/"/g, '""')}"`,
          `"${candidate.name.replace(/"/g, '""')}"`,
          candidate.voteCount.toString(),
          candidate.percentage.toString() + "%",
          candidate.isTie ? "Yes" : "No",
        ]);
      }
    }

    const csvContent = rows.map((e) => e.join(",")).join("\n");

    const headers = new Headers();
    headers.set("Content-Type", "text/csv");
    headers.set(
      "Content-Disposition",
      `attachment; filename="election_${electionId}_results.csv"`
    );

    return new NextResponse(csvContent, { status: 200, headers });
  } catch (error: unknown) {
    logger.error("Export Results Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    if (
      message.includes("not yet published") ||
      message.includes("only after") ||
      message.includes("Forbidden") ||
      message.includes("only available")
    ) {
      return new NextResponse(message, { status: 403 });
    }
    return new NextResponse(message || "Failed to fetch results", { status: 500 });
  }
}
