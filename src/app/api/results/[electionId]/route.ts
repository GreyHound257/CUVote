import { logger } from "@/utils/logger";
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

    // Default to false, verify if Admin
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
      return NextResponse.json(
        { success: false, error: "Missing electionId" },
        { status: 400 }
      );
    }

    const data = await ResultService.getResults(electionId, isAdmin);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    logger.error("Get Results Error:", error);

    // If error is about not published, return 403 Forbidden
    if ((error instanceof Error ? error.message : "Internal Server Error") === "Results are not yet published for this election.") {
      return NextResponse.json(
        { success: false, error: (error instanceof Error ? error.message : "Internal Server Error") },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : "Internal Server Error") || "Failed to fetch results" },
      { status: 500 }
    );
  }
}
