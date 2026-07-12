import { logger } from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import { StudentService } from "@/services/studentService";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEPARTMENT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { csvText } = await req.json();

    if (!csvText || typeof csvText !== "string") {
      return NextResponse.json({ error: "Valid CSV text is required." }, { status: 400 });
    }

    const allowedDepartmentId = session.user.role === "DEPARTMENT_ADMIN" ? session.user.departmentId : undefined;

    const result = await StudentService.importFromCsv(csvText, allowedDepartmentId ?? undefined);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    logger.error("POST /api/students/import error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
