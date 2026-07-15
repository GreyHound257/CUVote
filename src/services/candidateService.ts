import { prisma } from "@/lib/prisma";
import { CandidateStatus, ElectionStatus, Prisma, Role } from "@prisma/client";
import { notificationService } from "@/services/notificationService";

export class CandidateService {
  /**
   * Create a new candidate nomination
   */
  static async createCandidate(data: {
    studentId: string;
    electionId: string;
    positionId: string;
    userId: string;
    slogan?: string;
    manifesto?: string;
    visionStatement?: string;
    photoUrl?: string;
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
        slogan: data.slogan?.trim() || null,
        manifesto: data.manifesto?.trim() || null,
        visionStatement: data.visionStatement?.trim() || null,
        photoUrl: data.photoUrl?.trim() || null,
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
      manifesto?: string | null;
      slogan?: string | null;
      visionStatement?: string | null;
      photoUrl?: string | null;
    }
  ) {
    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate) throw new Error("Candidate not found");

    const oldStatus = candidate.status;

    const data: Prisma.CandidateUpdateInput = {};
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.manifesto !== undefined) data.manifesto = updates.manifesto || null;
    if (updates.slogan !== undefined) data.slogan = updates.slogan || null;
    if (updates.visionStatement !== undefined) {
      data.visionStatement = updates.visionStatement || null;
    }
    if (updates.photoUrl !== undefined) {
      data.photoUrl = updates.photoUrl || null;
    }

    const updated = await prisma.candidate.update({
      where: { id },
      data,
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

      if (
        updates.status === CandidateStatus.APPROVED ||
        updates.status === CandidateStatus.REJECTED
      ) {
        const withStudent = await prisma.candidate.findUnique({
          where: { id },
          include: {
            student: { select: { userId: true, fullName: true } },
            election: { select: { title: true } },
            position: { select: { title: true } },
          },
        });

        if (withStudent?.student.userId) {
          const approved = updates.status === CandidateStatus.APPROVED;
          await notificationService.dispatch({
            userId: withStudent.student.userId,
            title: approved ? "Nomination approved" : "Nomination rejected",
            message: approved
              ? `Your nomination for ${withStudent.position.title} in "${withStudent.election.title}" was approved.`
              : `Your nomination for ${withStudent.position.title} in "${withStudent.election.title}" was not approved.`,
            type: approved ? "CANDIDATE_APPROVED" : "CANDIDATE_REJECTED",
            priority: "HIGH",
          });
        }
      }
    }

    // Log detail updates if applicable
    const detailKeys = ["manifesto", "slogan", "visionStatement", "photoUrl"] as const;
    if (detailKeys.some((k) => updates[k] !== undefined)) {
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
   * Public/admin profile fetch.
   * Students may only view APPROVED profiles.
   */
  static async getCandidateById(id: string, viewerRole?: Role | string) {
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            matricNo: true,
            level: true,
            departmentId: true,
            department: { select: { id: true, name: true, code: true } },
          },
        },
        election: {
          select: {
            id: true,
            title: true,
            status: true,
            departmentId: true,
            academicSession: { select: { id: true, name: true } },
          },
        },
        position: {
          select: { id: true, title: true, description: true },
        },
      },
    });

    if (!candidate) throw new Error("Candidate not found");

    if (
      viewerRole === Role.STUDENT &&
      candidate.status !== CandidateStatus.APPROVED
    ) {
      throw new Error("This candidate profile is not publicly available.");
    }

    return candidate;
  }

  /**
   * Retrieve candidates with filtering and pagination
   */
  static async getCandidates(filters: {
    electionId?: string;
    positionId?: string;
    status?: CandidateStatus;
    search?: string;
    academicSessionId?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, search, academicSessionId, ...exactFilters } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.CandidateWhereInput = { ...exactFilters };

    // Apply Academic Session filter via the election relation
    // Apply Academic Session filter via the election relation
    if (academicSessionId) {
      where.election = {
        is: {
          academicSessionId: academicSessionId,
        },
      };
    }

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