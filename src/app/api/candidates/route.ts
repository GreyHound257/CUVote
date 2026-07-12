import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CandidateService } from "@/services/candidateService";
import { CandidateStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || undefined;
    const electionId = searchParams.get("electionId") || undefined;
    const positionId = searchParams.get("positionId") || undefined;
    const status = (searchParams.get("status") as CandidateStatus) || undefined;

    const filters: any = { page, limit, search, electionId, positionId, status };

    const userRole = session.user.role;

    // RBAC Enforcements
    if (userRole === Role.STUDENT) {
      // Students can ONLY view APPROVED candidates for live/published elections.
      filters.status = CandidateStatus.APPROVED;

      if (!electionId) {
        return NextResponse.json({ error: "Election ID is required for students" }, { status: 400 });
      }

      const election = await prisma.election.findUnique({ where: { id: electionId } });
      if (!election || !["PUBLISHED", "VOTING_OPEN", "VOTING_CLOSED", "RESULTS_GENERATED", "PUBLISHED_RESULTS", "ARCHIVED"].includes(election.status)) {
        return NextResponse.json({ error: "Cannot view candidates for this election state" }, { status: 403 });
      }
      // Assuming a student can only view their department's election (or if they are eligible).
      // Basic check: match departmentId
      if (session.user.departmentId && election.departmentId !== session.user.departmentId) {
         return NextResponse.json({ error: "Forbidden: Department mismatch" }, { status: 403 });
      }
    } else if (userRole === Role.DEPARTMENT_ADMIN) {
      // Dept Admins can ONLY view candidates where the related Election's departmentId matches their own.
      // We will fetch and filter by electionId later, or if an electionId is provided, check it.
      if (electionId) {
        const election = await prisma.election.findUnique({ where: { id: electionId } });
        if (election?.departmentId !== session.user.departmentId) {
          return NextResponse.json({ error: "Forbidden: Cannot access candidates from other departments" }, { status: 403 });
        }
      } else {
        // If no electionId, we need to enforce that fetched candidates belong to their department.
        // For simplicity, we can fetch all and then filter, but ideally CandidateService should support filtering by departmentId.
        // We will fetch their department elections and use IN clause in Prisma, but since we didn't add it in CandidateService,
        // we will let CandidateService fetch them and we can filter post-fetch for this iteration.
        // Note: Production scale would push this into the query.
      }
    }

    const result = await CandidateService.getCandidates(filters);

    // Post-query filtering for Department Admins if electionId wasn't specified
    if (userRole === Role.DEPARTMENT_ADMIN && !electionId) {
      result.data = result.data.filter((c: any) => c.election.departmentId === session.user.departmentId);
      result.total = result.data.length;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role === Role.STUDENT) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    if (!data.studentId || !data.electionId || !data.positionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Authorization: Dept Admin must own the election
    if (session.user.role === Role.DEPARTMENT_ADMIN) {
      const election = await prisma.election.findUnique({ where: { id: data.electionId } });
      if (election?.departmentId !== session.user.departmentId) {
        return NextResponse.json({ error: "Forbidden: Cannot manage candidates for this election" }, { status: 403 });
      }
    }

    const candidate = await CandidateService.createCandidate({
      ...data,
      userId: session.user.id,
    });

    return NextResponse.json(candidate, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
