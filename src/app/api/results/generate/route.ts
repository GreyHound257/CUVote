import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ResultService } from "@/services/resultService";
import { Roles } from "@/constants";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (
      !session?.user ||
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

    const result = await ResultService.generateResults(electionId, session.user.id, {
      role: session.user.role,
      departmentId: session.user.departmentId,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error("Generate Results Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status =
      message.includes("only after") ||
      message.includes("Forbidden") ||
      message.includes("Unauthorized") ||
      message.includes("Cannot generate")
        ? 403
        : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
