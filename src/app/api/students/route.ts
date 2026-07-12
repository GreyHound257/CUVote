import { logger } from "@/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import { StudentService } from "@/services/studentService";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEPARTMENT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || undefined;
    const departmentId = searchParams.get("departmentId") || undefined;
    const levelStr = searchParams.get("level");
    const level = levelStr ? parseInt(levelStr, 10) : undefined;
    const isEligibleStr = searchParams.get("isEligible");
    const isEligible = isEligibleStr === "true" ? true : isEligibleStr === "false" ? false : undefined;

    // Enforce role-based scope
    const allowedDepartmentId = session.user.role === "DEPARTMENT_ADMIN" ? session.user.departmentId : undefined;

    const result = await StudentService.getStudents({
      page,
      limit,
      search,
      departmentId,
      level,
      isEligible,
      allowedDepartmentId: allowedDepartmentId ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error("GET /api/students error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEPARTMENT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    if (session.user.role === "DEPARTMENT_ADMIN") {
      if (body.departmentId !== session.user.departmentId) {
        return NextResponse.json({ error: "You can only create students in your own department" }, { status: 403 });
      }
    }

    const student = await StudentService.createStudent(body);
    return NextResponse.json(student, { status: 201 });
  } catch (error: unknown) {
    logger.error("POST /api/students error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
