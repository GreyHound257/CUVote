import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ResultService } from "@/services/resultService";
import { enforceRateLimit } from "@/lib/request";

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ electionId: string }> }
) {
  try {
    const limited = enforceRateLimit(req, "EXPORT");
    if (limited) return limited;

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

    const metadata = [
      escapeCsv(`Election: ${data.title}`),
      escapeCsv(`Department: ${data.department.name} (${data.department.code})`),
      escapeCsv(`Status: ${data.status}`),
      escapeCsv(`Turnout: ${data.totalTurnout} / ${data.eligibleVoters} (${data.turnoutRate}%)`),
      escapeCsv(`Generated: ${new Date().toISOString()}`),
      escapeCsv(`Exported By: ${session.user.email ?? "Unknown"}`),
    ].join(",");

    const rows = [
      ["Position", "Candidate", "Votes", "Percentage", "Winner", "Tie"],
    ];

    for (const position of data.positions) {
      for (const candidate of position.candidates) {
        rows.push([
          position.title,
          candidate.name,
          candidate.voteCount.toString(),
          `${candidate.percentage}%`,
          candidate.isWinner ? "Yes" : "No",
          candidate.isTie ? "Yes" : "No",
        ]);
      }
    }

    const csvContent = [
      metadata,
      "",
      rows[0].map(escapeCsv).join(","),
      ...rows.slice(1).map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const headers = new Headers();
    headers.set("Content-Type", "text/csv; charset=utf-8");
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
      message.includes("only available") ||
      message.includes("currently disabled")
    ) {
      return new NextResponse(message, { status: 403 });
    }
    return new NextResponse(message || "Failed to fetch results", { status: 500 });
  }
}
