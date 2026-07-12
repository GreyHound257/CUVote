import { prisma } from "@/lib/prisma";
import { CandidateStatus, ElectionStatus } from "@prisma/client";

export class CandidateService {
  /**
   * Create a new candidate nomination
   */
  static async createCandidate(data: {
    studentId: string;
    electionId: string;
    positionId: string;
    userId: string;
  }) {
    // Validate student and election department
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    });
    if (!student) throw new Error("Student not found");

    const election = await prisma.election.findUnique({
      where: { id: data.electionId },
    });
    if (!election) throw new Error("Election not found");

    if (student.departmentId !== election.departmentId) {
      throw new Error("Student must belong to the exact same Department as the Election");
    }

    if (election.status === ElectionStatus.ARCHIVED) {
      throw new Error("Cannot nominate candidates for an archived election");
    }

    // Check if student is already a candidate in this election
    const existing = await prisma.candidate.findUnique({
      where: {
        studentId_electionId: {
          studentId: data.studentId,
          electionId: data.electionId,
        },
      },
    });

    if (existing) {
      throw new Error("Student is already contesting a position in this election");
    }

    // Create candidate
    const candidate = await prisma.candidate.create({
      data: {
        studentId: data.studentId,
        electionId: data.electionId,
        positionId: data.positionId,
        status: CandidateStatus.PENDING_REVIEW,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: "CANDIDATE_CREATED",
        entity: "Candidate",
        entityId: candidate.id,
        details: `Nominated student ${data.studentId} for position ${data.positionId} in election ${data.electionId}`,
      },
    });

    return candidate;
  }

  /**
   * Update a candidate's status or details
   */
  static async updateCandidate(
    id: string,
    userId: string,
    updates: {
      status?: CandidateStatus;
      manifesto?: string;
      slogan?: string;
      photoUrl?: string;
    }
  ) {
    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate) throw new Error("Candidate not found");

    const oldStatus = candidate.status;

    const updated = await prisma.candidate.update({
      where: { id },
      data: updates,
    });

    // Log status change if applicable
    if (updates.status && updates.status !== oldStatus) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "CANDIDATE_STATUS_UPDATED",
          entity: "Candidate",
          entityId: updated.id,
          details: `Candidate status changed from ${oldStatus} to ${updates.status}`,
        },
      });
    }

    // Log detail updates if applicable
    if (updates.manifesto || updates.slogan || updates.photoUrl) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "CANDIDATE_DETAILS_UPDATED",
          entity: "Candidate",
          entityId: updated.id,
          details: `Updated candidate details: ${Object.keys(updates).join(", ")}`,
        },
      });
    }

    return updated;
  }

  /**
   * Retrieve candidates with filtering and pagination
   */
  static async getCandidates(filters: {
    electionId?: string;
    positionId?: string;
    status?: CandidateStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, search, ...exactFilters } = filters;
    const skip = (page - 1) * limit;

    const where: any = { ...exactFilters };

    if (search) {
      where.student = {
        fullName: {
          contains: search,
          mode: "insensitive",
        },
      };
    }

    const [total, candidates] = await Promise.all([
      prisma.candidate.count({ where }),
      prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: true,
          election: true,
          position: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { total, page, limit, data: candidates };
  }
}
