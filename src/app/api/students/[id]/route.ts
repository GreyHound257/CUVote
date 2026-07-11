import { NextRequest, NextResponse } from "next/server";
import { StudentService } from "@/services/studentService";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEPARTMENT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify student exists and department access
    const student = await prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (session.user.role === "DEPARTMENT_ADMIN") {
      if (student.departmentId !== session.user.departmentId) {
         return NextResponse.json({ error: "You do not have permission to modify this student" }, { status: 403 });
      }
      if (body.departmentId && body.departmentId !== session.user.departmentId) {
         return NextResponse.json({ error: "You cannot move a student to another department" }, { status: 403 });
      }
    }

    // If only toggling eligibility
    if (Object.keys(body).length === 1 && "isEligible" in body) {
      const updated = await StudentService.toggleEligibility(
        id,
        body.isEligible,
        session.user.id as string,
        req.headers.get("x-forwarded-for") || undefined
      );
      return NextResponse.json(updated);
    }

    // Otherwise standard update
    const updated = await StudentService.updateStudent(id, body);
    return NextResponse.json(updated);

  } catch (error: unknown) {
    console.error(`PATCH /api/students/[id] error:`, error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
