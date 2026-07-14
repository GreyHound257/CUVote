import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CandidateService } from "@/services/candidateService";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { updateCandidateSchema } from "@/validation/candidate";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const candidate = await CandidateService.getCandidateById(id, session.user.role);

    if (
      session.user.role === Role.DEPARTMENT_ADMIN &&
      candidate.election.departmentId !== session.user.departmentId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      session.user.role === Role.STUDENT &&
      session.user.departmentId &&
      candidate.election.departmentId !== session.user.departmentId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: candidate });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message.includes("not found")
      ? 404
      : message.includes("not publicly")
        ? 403
        : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role === Role.STUDENT) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateCandidateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Authorization: Dept Admin must own the election
    if (session.user.role === Role.DEPARTMENT_ADMIN) {
      const candidate = await prisma.candidate.findUnique({
        where: { id },
        include: { election: true },
      });
      if (candidate?.election.departmentId !== session.user.departmentId) {
        return NextResponse.json(
          { error: "Forbidden: Cannot update candidate from another department" },
          { status: 403 }
        );
      }
    }

    const updated = await CandidateService.updateCandidate(id, session.user.id, {
      ...parsed.data,
      photoUrl:
        parsed.data.photoUrl === "" ? null : parsed.data.photoUrl ?? undefined,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 400 }
    );
  }
}
