import { logger } from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import { StudentService } from "@/services/studentService";
import { auth } from "@/lib/auth";
import { enforceRateLimit, parseJsonBody, RequestBodyError } from "@/lib/request";

export async function POST(req: NextRequest) {
  try {
    const limited = enforceRateLimit(req, "ADMIN_WRITE");
    if (limited) return limited;

    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEPARTMENT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await parseJsonBody<{ csvText?: string }>(req, 2_000_000);
    const { csvText } = body;

    if (!csvText || typeof csvText !== "string") {
      return NextResponse.json({ error: "Valid CSV text is required." }, { status: 400 });
    }

    const allowedDepartmentId = session.user.role === "DEPARTMENT_ADMIN" ? session.user.departmentId : undefined;

    const result = await StudentService.importFromCsv(csvText, allowedDepartmentId ?? undefined);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    logger.error("POST /api/students/import error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
