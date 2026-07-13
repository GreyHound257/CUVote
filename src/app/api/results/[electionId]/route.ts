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
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { electionId } = await params;

    if (!electionId) {
      return NextResponse.json(
        { success: false, error: "Missing electionId" },
        { status: 400 }
      );
    }

    const data = await ResultService.getResults(electionId, {
      role: session.user.role,
      departmentId: session.user.departmentId,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    logger.error("Get Results Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";

    if (
      message.includes("not yet published") ||
      message.includes("only after") ||
      message.includes("Forbidden") ||
      message.includes("only available")
    ) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }

    return NextResponse.json(
      { success: false, error: message || "Failed to fetch results" },
      { status: 500 }
    );
  }
}
