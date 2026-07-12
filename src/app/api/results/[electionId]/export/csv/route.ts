import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ResultService } from "@/services/resultService";
import { Roles } from "@/constants";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ electionId: string }> }
) {
  try {
    const session = await auth();

    let isAdmin = false;
    if (
      session &&
      (session.user.role === Roles.SUPER_ADMIN ||
        session.user.role === Roles.DEPARTMENT_ADMIN)
    ) {
      isAdmin = true;
    }

    const { electionId } = await params;

    if (!electionId) {
      return new NextResponse("Missing electionId", { status: 400 });
    }

    const data = await ResultService.getResults(electionId, isAdmin);

    // Convert data to CSV format
    const rows = [
      ["Election", "Position", "Candidate", "Votes", "Percentage", "Is Tie"],
    ];

    for (const position of data.positions) {
      for (const candidate of position.candidates) {
        // Enclose text fields in quotes to safely handle commas
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
  } catch (error: any) {
    console.error("Export Results Error:", error);
    if (error.message === "Results are not yet published for this election.") {
      return new NextResponse(error.message, { status: 403 });
    }
    return new NextResponse(error.message || "Failed to fetch results", {
      status: 500,
    });
  }
}
