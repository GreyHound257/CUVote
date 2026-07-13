import { prisma } from "@/lib/prisma";
import { ElectionStatus, Prisma, Role } from "@prisma/client";
import { CreateElectionInput } from "@/validation/election";

export class ElectionService {
  static async getElections(filters: {
    departmentId?: string;
    status?: ElectionStatus;
    search?: string;
  }) {
    const where: Prisma.ElectionWhereInput = {};

    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return prisma.election.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        positions: true,
        _count: { select: { candidates: true, voteRecords: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getElectionById(id: string) {
    const election = await prisma.election.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true, code: true } },
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

    // Use nested create instead of interactive $transaction — Neon pooler
    // (PgBouncer) often fails interactive txs with P2028 under contention.
    const election = await prisma.election.create({
      data: {
        title: data.title,
        description: data.description,
        departmentId: data.departmentId,
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
        positions: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "ELECTION_CREATED",
        entity: "Election",
        entityId: election.id,
        details: `Created election "${election.title}" with ${data.positions.length} position(s)`,
      },
    });

    return election;
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

    return updated;
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
