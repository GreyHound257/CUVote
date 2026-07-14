import { prisma } from "@/lib/prisma";
import {
  AnnouncementAudience,
  AnnouncementStatus,
  Prisma,
  Role,
} from "@prisma/client";
import { notificationService } from "@/services/notificationService";

export type AnnouncementInput = {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  departmentId?: string | null;
  status?: AnnouncementStatus;
};

export class AnnouncementService {
  static async listForViewer(viewer: {
    role: Role | string;
    departmentId?: string | null;
    includeDrafts?: boolean;
  }) {
    const where: Prisma.AnnouncementWhereInput = {};

    if (viewer.includeDrafts && viewer.role !== Role.STUDENT) {
      // admins managing: see all in scope
      if (viewer.role === Role.DEPARTMENT_ADMIN) {
        where.OR = [
          { audience: AnnouncementAudience.EVERYONE },
          { audience: AnnouncementAudience.STUDENTS },
          { audience: AnnouncementAudience.ADMINS },
          {
            audience: AnnouncementAudience.DEPARTMENT,
            departmentId: viewer.departmentId ?? undefined,
          },
          { createdBy: { departmentId: viewer.departmentId ?? undefined } },
        ];
      }
    } else {
      where.status = AnnouncementStatus.PUBLISHED;
      where.OR = [
        { audience: AnnouncementAudience.EVERYONE },
        ...(viewer.role === Role.STUDENT
          ? [
              { audience: AnnouncementAudience.STUDENTS },
              {
                audience: AnnouncementAudience.DEPARTMENT,
                departmentId: viewer.departmentId ?? undefined,
              },
            ]
          : [
              { audience: AnnouncementAudience.ADMINS },
              { audience: AnnouncementAudience.STUDENTS },
              {
                audience: AnnouncementAudience.DEPARTMENT,
                ...(viewer.role === Role.DEPARTMENT_ADMIN
                  ? { departmentId: viewer.departmentId ?? undefined }
                  : {}),
              },
            ]),
      ];
    }

    return prisma.announcement.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
  }

  static async listForAdmin(filters: {
    role: Role;
    departmentId?: string | null;
    status?: AnnouncementStatus;
  }) {
    const where: Prisma.AnnouncementWhereInput = {};

    if (filters.status) where.status = filters.status;

    if (filters.role === Role.DEPARTMENT_ADMIN) {
      where.AND = [
        {
          OR: [
            { departmentId: filters.departmentId ?? undefined },
            { createdBy: { departmentId: filters.departmentId ?? undefined } },
            { audience: { in: [AnnouncementAudience.EVERYONE, AnnouncementAudience.STUDENTS] } },
          ],
        },
      ];
    }

    return prisma.announcement.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async create(data: AnnouncementInput, createdById: string, creatorRole: Role) {
    if (data.audience === AnnouncementAudience.DEPARTMENT && !data.departmentId) {
      throw new Error("Department is required for department-scoped announcements.");
    }

    if (
      creatorRole === Role.DEPARTMENT_ADMIN &&
      data.audience === AnnouncementAudience.EVERYONE
    ) {
      throw new Error("Department admins cannot publish university-wide announcements.");
    }

    if (
      creatorRole === Role.DEPARTMENT_ADMIN &&
      data.audience === AnnouncementAudience.ADMINS
    ) {
      throw new Error("Department admins cannot target all admins.");
    }

    const publishNow = data.status === AnnouncementStatus.PUBLISHED;

    const announcement = await prisma.announcement.create({
      data: {
        title: data.title.trim(),
        body: data.body.trim(),
        audience: data.audience,
        departmentId: data.departmentId || null,
        status: data.status ?? AnnouncementStatus.DRAFT,
        createdById,
        publishedAt: publishNow ? new Date() : null,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: createdById,
        action: "ANNOUNCEMENT_CREATED",
        entity: "Announcement",
        entityId: announcement.id,
        details: `Created announcement "${announcement.title}" (${announcement.status})`,
      },
    });

    if (publishNow) {
      await this.notifyAudience(announcement);
    }

    return announcement;
  }

  static async update(
    id: string,
    data: Partial<AnnouncementInput>,
    actorId: string,
    actorRole: Role,
    actorDepartmentId?: string | null
  ) {
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new Error("Announcement not found");

    if (
      actorRole === Role.DEPARTMENT_ADMIN &&
      existing.departmentId &&
      existing.departmentId !== actorDepartmentId
    ) {
      throw new Error("Forbidden: Cannot manage announcements outside your department");
    }

    const nextStatus = data.status ?? existing.status;
    const becomingPublished =
      nextStatus === AnnouncementStatus.PUBLISHED &&
      existing.status !== AnnouncementStatus.PUBLISHED;

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.body !== undefined && { body: data.body.trim() }),
        ...(data.audience !== undefined && { audience: data.audience }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId || null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(becomingPublished && { publishedAt: new Date() }),
        ...(nextStatus === AnnouncementStatus.DRAFT && { publishedAt: null }),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: becomingPublished ? "ANNOUNCEMENT_PUBLISHED" : "ANNOUNCEMENT_UPDATED",
        entity: "Announcement",
        entityId: id,
        details: `Updated announcement "${updated.title}" (${updated.status})`,
      },
    });

    if (becomingPublished) {
      await this.notifyAudience(updated);
    }

    return updated;
  }

  static async archive(id: string, actorId: string, actorRole: Role, actorDepartmentId?: string | null) {
    return this.update(
      id,
      { status: AnnouncementStatus.ARCHIVED },
      actorId,
      actorRole,
      actorDepartmentId
    );
  }

  private static async notifyAudience(announcement: {
    id: string;
    title: string;
    body: string;
    audience: AnnouncementAudience;
    departmentId: string | null;
  }) {
    const preview =
      announcement.body.length > 160
        ? `${announcement.body.slice(0, 157)}...`
        : announcement.body;

    const userIds = await this.resolveAudienceUserIds(
      announcement.audience,
      announcement.departmentId
    );

    await notificationService.dispatchMany(userIds, {
      title: announcement.title,
      message: preview,
      type: "ANNOUNCEMENT",
      priority: "MEDIUM",
    });
  }

  private static async resolveAudienceUserIds(
    audience: AnnouncementAudience,
    departmentId: string | null
  ): Promise<string[]> {
    if (audience === AnnouncementAudience.EVERYONE) {
      const users = await prisma.user.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }

    if (audience === AnnouncementAudience.STUDENTS) {
      const users = await prisma.user.findMany({
        where: { status: "ACTIVE", role: Role.STUDENT },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }

    if (audience === AnnouncementAudience.ADMINS) {
      const users = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          role: { in: [Role.SUPER_ADMIN, Role.DEPARTMENT_ADMIN] },
        },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }

    if (audience === AnnouncementAudience.DEPARTMENT && departmentId) {
      const [students, admins] = await Promise.all([
        prisma.student.findMany({
          where: { departmentId, userId: { not: null } },
          select: { userId: true },
        }),
        prisma.user.findMany({
          where: {
            status: "ACTIVE",
            role: Role.DEPARTMENT_ADMIN,
            departmentId,
          },
          select: { id: true },
        }),
      ]);
      const ids = new Set<string>();
      for (const s of students) {
        if (s.userId) ids.add(s.userId);
      }
      for (const a of admins) ids.add(a.id);
      return [...ids];
    }

    return [];
  }
}
