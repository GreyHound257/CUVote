import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export type ActivityItem = {
  id: string;
  kind: "AUDIT" | "ANNOUNCEMENT";
  title: string;
  summary: string;
  createdAt: Date;
  actorName?: string | null;
  entity?: string | null;
  entityId?: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  ELECTION_STATUS_UPDATED: "Election status updated",
  RESULTS_PUBLISHED: "Results published",
  CANDIDATE_STATUS_UPDATED: "Candidate status updated",
  CANDIDATE_DETAILS_UPDATED: "Candidate profile updated",
  ANNOUNCEMENT_CREATED: "Announcement created",
  ANNOUNCEMENT_PUBLISHED: "Announcement published",
  ANNOUNCEMENT_UPDATED: "Announcement updated",
  VOTE_CAST: "Vote cast",
  RESULTS_GENERATED: "Results generated",
};

export class ActivityService {
  static async getFeed(viewer: {
    id: string;
    role: Role | string;
    departmentId?: string | null;
  }, limit = 40): Promise<ActivityItem[]> {
    const take = Math.min(Math.max(limit, 1), 100);

    if (viewer.role === Role.STUDENT) {
      const announcements = await prisma.announcement.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { audience: "EVERYONE" },
            { audience: "STUDENTS" },
            {
              audience: "DEPARTMENT",
              departmentId: viewer.departmentId ?? undefined,
            },
          ],
        },
        include: {
          createdBy: { select: { name: true } },
        },
        orderBy: { publishedAt: "desc" },
        take,
      });

      return announcements.map((a) => ({
        id: `ann-${a.id}`,
        kind: "ANNOUNCEMENT" as const,
        title: a.title,
        summary: a.body.length > 180 ? `${a.body.slice(0, 177)}...` : a.body,
        createdAt: a.publishedAt ?? a.createdAt,
        actorName: a.createdBy.name,
        entity: "Announcement",
        entityId: a.id,
      }));
    }

    const departmentFilter =
      viewer.role === Role.DEPARTMENT_ADMIN && viewer.departmentId
        ? {
            OR: [
              { user: { departmentId: viewer.departmentId } },
              { details: { contains: viewer.departmentId, mode: "insensitive" as const } },
            ],
          }
        : {};

    const [logs, announcements] = await Promise.all([
      prisma.auditLog.findMany({
        where: departmentFilter,
        include: {
          user: { select: { name: true, email: true, role: true, departmentId: true } },
        },
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.announcement.findMany({
        where: {
          status: { in: ["PUBLISHED", "ARCHIVED"] },
          ...(viewer.role === Role.DEPARTMENT_ADMIN && viewer.departmentId
            ? {
                OR: [
                  { departmentId: viewer.departmentId },
                  { audience: { in: ["EVERYONE", "ADMINS", "STUDENTS"] } },
                ],
              }
            : {}),
        },
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: Math.ceil(take / 2),
      }),
    ]);

    const items: ActivityItem[] = [
      ...logs.map((log) => ({
        id: `audit-${log.id}`,
        kind: "AUDIT" as const,
        title: ACTION_LABELS[log.action] ?? log.action.replaceAll("_", " "),
        summary: log.details || "System activity recorded.",
        createdAt: log.createdAt,
        actorName: log.user?.name ?? log.user?.email ?? "System",
        entity: log.entity,
        entityId: log.entityId,
      })),
      ...announcements.map((a) => ({
        id: `ann-${a.id}`,
        kind: "ANNOUNCEMENT" as const,
        title: a.title,
        summary: a.body.length > 180 ? `${a.body.slice(0, 177)}...` : a.body,
        createdAt: a.publishedAt ?? a.createdAt,
        actorName: a.createdBy.name,
        entity: "Announcement",
        entityId: a.id,
      })),
    ];

    return items
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, take);
  }
}
