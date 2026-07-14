import { prisma } from "@/lib/prisma";
import { ElectionStatus, Prisma, Role } from "@prisma/client";
import { CreateElectionInput } from "@/validation/election";
import { notificationService } from "@/services/notificationService";
import { logger } from "@/utils/logger";

export type GetElectionsParams = {
  page?: number;
  limit?: number;
  departmentId?: string;
  status?: string;
  search?: string;
};

export class ElectionService {
  static async getElections(params: GetElectionsParams) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ElectionWhereInput = {};

    if (params.departmentId) {
      where.departmentId = params.departmentId;
    }

    if (params.status) {
      // Handle status groups: UPCOMING, ACTIVE, COMPLETED
      if (params.status === "UPCOMING") {
        where.status = { in: ["DRAFT", "SCHEDULED", "PUBLISHED"] };
      } else if (params.status === "ACTIVE") {
        where.status = "VOTING_OPEN";
      } else if (params.status === "COMPLETED") {
        where.status = { in: ["VOTING_CLOSED", "RESULTS_GENERATED", "PUBLISHED_RESULTS", "ARCHIVED"] };
      } else {
        // Treat as individual status
        where.status = params.status as ElectionStatus;
      }
    }

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [elections, total] = await Promise.all([
      prisma.election.findMany({
        where,
        skip,
        take: limit,
        include: {
          department: { select: { id: true, name: true, code: true } },
          academicSession: { select: { id: true, name: true, isCurrent: true } },
          positions: true,
          _count: { select: { candidates: true, voteRecords: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.election.count({ where }),
    ]);

    return {
      data: elections,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getElectionById(id: string) {
    const election = await prisma.election.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true, code: true } },
        academicSession: { select: { id: true, name: true, isCurrent: true } },
        positions: {
          include: {
            candidates: {
              include: { student: { select: { id: true, fullName: true, matricNo: true } } },
            },
          },
        },
        _count: { select: { voteRecords: true } },
      },
    });

    if (!election) throw new Error("Election not found");
    return election;
  }

  static async createElection(data: CreateElectionInput, userId: string) {
    const startTime = data.startTime ? new Date(data.startTime) : null;
    const endTime = data.endTime ? new Date(data.endTime) : null;

    if (startTime && endTime && endTime <= startTime) {
      throw new Error("End time must be after start time");
    }

    const department = await prisma.department.findUnique({
      where: { id: data.departmentId },
      select: { id: true, status: true },
    });

    if (!department) {
      throw new Error("Selected department does not exist. Please choose a valid department.");
    }

    if (department.status === "DELETED") {
      throw new Error("Cannot create an election for a deleted department.");
    }

    const academicSession = await prisma.academicSession.findUnique({
      where: { id: data.academicSessionId },
      select: { id: true, status: true, name: true },
    });

    if (!academicSession) {
      throw new Error("Selected academic session does not exist.");
    }

    if (academicSession.status !== "ACTIVE") {
      throw new Error("Cannot create an election for an archived academic session.");
    }

    // Use nested create instead of interactive $transaction — Neon pooler
    // (PgBouncer) often fails interactive txs with P2028 under contention.
    const election = await prisma.election.create({
      data: {
        title: data.title,
        description: data.description,
        departmentId: data.departmentId,
        academicSessionId: data.academicSessionId,
        eligibilityLevels: data.eligibilityLevels ?? [],
        startTime,
        endTime,
        status: ElectionStatus.DRAFT,
        positions: {
          create: data.positions.map((position) => ({
            title: position.title,
            description: position.description,
            minCandidates: position.minCandidates,
            maxCandidates: position.maxCandidates,
          })),
        },
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        academicSession: { select: { id: true, name: true, isCurrent: true } },
        positions: true,
      },
    });

    if (data.saveAsTemplateName) {
      await prisma.electionTemplate.create({
        data: {
          name: data.saveAsTemplateName,
          description: data.description,
          departmentId: data.departmentId,
          createdById: userId,
          eligibilityLevels: data.eligibilityLevels ?? [],
          positionsJson: data.positions,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: "ELECTION_CREATED",
        entity: "Election",
        entityId: election.id,
        details: `Created election "${election.title}" for session ${academicSession.name} with ${data.positions.length} position(s)`,
      },
    });

    return election;
  }

  /**
   * Ballot preview for admins — same shape as student ballot, no vote eligibility checks.
   */
  static async getBallotPreview(electionId: string) {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        department: { select: { id: true, name: true, code: true } },
        academicSession: { select: { id: true, name: true } },
        positions: {
          include: {
            candidates: {
              where: { status: "APPROVED" },
              include: {
                student: { select: { fullName: true, matricNo: true, level: true } },
              },
            },
          },
        },
      },
    });

    if (!election) throw new Error("Election not found");

    return {
      election: {
        id: election.id,
        title: election.title,
        description: election.description,
        status: election.status,
        department: election.department,
        academicSession: election.academicSession,
        eligibilityLevels: election.eligibilityLevels,
      },
      positions: election.positions.map((p) => ({
        ...p,
        hasVoted: false,
      })),
    };
  }

  static async updateElectionStatus(
    id: string,
    status: ElectionStatus,
    userId: string,
    userRole: Role,
    userDepartmentId?: string | null
  ) {
    const election = await prisma.election.findUnique({ where: { id } });
    if (!election) throw new Error("Election not found");

    if (userRole === Role.DEPARTMENT_ADMIN && election.departmentId !== userDepartmentId) {
      throw new Error("Forbidden: Cannot manage elections outside your department");
    }

    const updated = await prisma.election.update({
      where: { id },
      data: { status },
      include: {
        department: { select: { id: true, name: true, code: true } },
        positions: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "ELECTION_STATUS_UPDATED",
        entity: "Election",
        entityId: id,
        details: `Election status changed to ${status}`,
      },
    });

    try {
      await this.notifyStatusChange(updated);
    } catch (error) {
      logger.error("Election status notification failed:", error);
    }

    return updated;
  }

  private static async notifyStatusChange(election: {
    id: string;
    title: string;
    status: ElectionStatus;
    departmentId: string;
  }) {
    const deptId = election.departmentId;
    const title = election.title;

    if (election.status === ElectionStatus.PUBLISHED) {
      await notificationService.notifyDepartmentUsers(deptId, {
        title: "Election published",
        message: `"${title}" is now published. Check the elections portal for details and dates.`,
        type: "ELECTION_PUBLISHED",
        priority: "MEDIUM",
      });
      return;
    }

    if (election.status === ElectionStatus.VOTING_OPEN) {
      await notificationService.notifyDepartmentUsers(
        deptId,
        {
          title: "Voting is open",
          message: `Voting has opened for "${title}". Cast your ballot before the deadline.`,
          type: "VOTING_OPEN",
          priority: "HIGH",
        },
        { includeStudents: true, includeAdmins: true }
      );
      return;
    }

    if (election.status === ElectionStatus.VOTING_CLOSED) {
      await notificationService.notifyDepartmentUsers(
        deptId,
        {
          title: "Voting closed",
          message: `Voting for "${title}" has closed. Results will be published by election officials.`,
          type: "VOTING_CLOSED",
          priority: "MEDIUM",
        },
        { includeStudents: true, includeAdmins: true }
      );
      return;
    }

    if (election.status === ElectionStatus.PUBLISHED_RESULTS) {
      await notificationService.notifyDepartmentUsers(deptId, {
        title: "Results published",
        message: `Results for "${title}" are now available.`,
        type: "RESULTS_PUBLISHED",
        priority: "HIGH",
      });
    }
  }

  static assertCanManage(
    userRole: Role,
    userDepartmentId: string | null | undefined,
    electionDepartmentId: string
  ) {
    if (userRole === Role.SUPER_ADMIN) return;
    if (userRole === Role.DEPARTMENT_ADMIN && userDepartmentId === electionDepartmentId) return;
    throw new Error("Forbidden: Insufficient permissions");
  }
}
