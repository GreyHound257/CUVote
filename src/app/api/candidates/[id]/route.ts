import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CandidateService } from "@/services/candidateService";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role === Role.STUDENT) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();

    // Authorization: Dept Admin must own the election
    if (session.user.role === Role.DEPARTMENT_ADMIN) {
      const candidate = await prisma.candidate.findUnique({
        where: { id },
        include: { election: true },
      });
      if (candidate?.election.departmentId !== session.user.departmentId) {
        return NextResponse.json({ error: "Forbidden: Cannot update candidate from another department" }, { status: 403 });
      }
    }

    const updated = await CandidateService.updateCandidate(id, session.user.id, data);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Internal Server Error") }, { status: 400 });
  }
}
