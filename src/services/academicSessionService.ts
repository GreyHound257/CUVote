import { prisma } from "@/lib/prisma";
import { AcademicSessionStatus, Prisma } from "@prisma/client";
import {
  AcademicSessionInput,
  UpdateAcademicSessionInput,
} from "@/validation/academicSession";

export class AcademicSessionService {
  static async list(includeArchived = false) {
    const where: Prisma.AcademicSessionWhereInput = includeArchived
      ? {}
      : { status: AcademicSessionStatus.ACTIVE };

    return prisma.academicSession.findMany({
      where,
      orderBy: [{ isCurrent: "desc" }, { name: "desc" }],
      include: {
        _count: { select: { elections: true } },
      },
    });
  }

  static async getCurrent() {
    return prisma.academicSession.findFirst({
      where: { isCurrent: true, status: AcademicSessionStatus.ACTIVE },
    });
  }

  static async create(data: AcademicSessionInput, userId: string) {
    if (data.isCurrent) {
      await prisma.academicSession.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
    }

    const session = await prisma.academicSession.create({
      data: {
        name: data.name,
        startsOn: data.startsOn ? new Date(data.startsOn) : null,
        endsOn: data.endsOn ? new Date(data.endsOn) : null,
        isCurrent: data.isCurrent ?? false,
        status: data.status ?? AcademicSessionStatus.ACTIVE,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "ACADEMIC_SESSION_CREATED",
        entity: "AcademicSession",
        entityId: session.id,
        details: `Created academic session ${session.name}`,
      },
    });

    return session;
  }

  static async update(id: string, data: UpdateAcademicSessionInput, userId: string) {
    const existing = await prisma.academicSession.findUnique({ where: { id } });
    if (!existing) throw new Error("Academic session not found");

    if (data.isCurrent === true) {
      await prisma.academicSession.updateMany({
        where: { isCurrent: true, id: { not: id } },
        data: { isCurrent: false },
      });
    }

    const session = await prisma.academicSession.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.startsOn !== undefined
          ? { startsOn: data.startsOn ? new Date(data.startsOn) : null }
          : {}),
        ...(data.endsOn !== undefined
          ? { endsOn: data.endsOn ? new Date(data.endsOn) : null }
          : {}),
        ...(data.isCurrent !== undefined ? { isCurrent: data.isCurrent } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "ACADEMIC_SESSION_UPDATED",
        entity: "AcademicSession",
        entityId: session.id,
        details: `Updated academic session ${session.name}`,
      },
    });

    return session;
  }

  static async setCurrent(id: string, userId: string) {
    const existing = await prisma.academicSession.findUnique({ where: { id } });
    if (!existing) throw new Error("Academic session not found");
    if (existing.status === AcademicSessionStatus.ARCHIVED) {
      throw new Error("Cannot set an archived session as current.");
    }

    await prisma.academicSession.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });

    const session = await prisma.academicSession.update({
      where: { id },
      data: { isCurrent: true, status: AcademicSessionStatus.ACTIVE },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "ACADEMIC_SESSION_SET_CURRENT",
        entity: "AcademicSession",
        entityId: session.id,
        details: `Set ${session.name} as the current academic session`,
      },
    });

    return session;
  }

  static async archive(id: string, userId: string) {
    const session = await prisma.academicSession.update({
      where: { id },
      data: { status: AcademicSessionStatus.ARCHIVED, isCurrent: false },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "ACADEMIC_SESSION_ARCHIVED",
        entity: "AcademicSession",
        entityId: session.id,
        details: `Archived academic session ${session.name}`,
      },
    });

    return session;
  }
}
