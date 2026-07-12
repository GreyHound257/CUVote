import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ResultService } from "@/services/resultService";
import { Roles } from "@/constants";
import { z } from "zod";

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
    const schema = z.object({ electionId: z.string().min(1) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid electionId" }, { status: 400 });
    }
    const { electionId } = parsed.data;

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
