import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ElectionTemplateInput } from "@/validation/election";

export class ElectionTemplateService {
  static async list(filters: { departmentId?: string | null; isSuperAdmin: boolean }) {
    const where: Prisma.ElectionTemplateWhereInput = {};

    if (!filters.isSuperAdmin) {
      where.OR = [
        { departmentId: filters.departmentId ?? undefined },
        { departmentId: null },
      ];
    } else if (filters.departmentId) {
      where.OR = [{ departmentId: filters.departmentId }, { departmentId: null }];
    }

    return prisma.electionTemplate.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });
  }

  static async getById(id: string) {
    const template = await prisma.electionTemplate.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });
    if (!template) throw new Error("Template not found");
    return template;
  }

  static async create(data: ElectionTemplateInput, createdById: string) {
    return prisma.electionTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        departmentId: data.departmentId || null,
        createdById,
        eligibilityLevels: data.eligibilityLevels ?? [],
        positionsJson: data.positions,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });
  }

  static async delete(id: string) {
    await prisma.electionTemplate.delete({ where: { id } });
    return { success: true };
  }
}
