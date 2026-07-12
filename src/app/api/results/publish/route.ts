import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ResultService } from "@/services/resultService";
import { Roles } from "@/constants";

export async function PATCH(req: Request) {
  try {
    const session = await auth();

    if (
      !session ||
      (session.user.role !== Roles.SUPER_ADMIN &&
        session.user.role !== Roles.DEPARTMENT_ADMIN)
    ) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { electionId } = body;

    if (!electionId) {
      return NextResponse.json({ success: false, error: "Missing electionId" }, { status: 400 });
    }

    const result = await ResultService.publishResults(electionId, session.user.id);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Publish Results Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to publish results" },
      { status: 500 }
    );
  }
}
