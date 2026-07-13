import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { studentImportRowSchema, createStudentSchema } from "@/validation/student";

export type GetStudentsParams = {
  page?: number;
  limit?: number;
  departmentId?: string;
  level?: number;
  isEligible?: boolean;
  search?: string;
  allowedDepartmentId?: string; // Enforces department admin scope
};

export class StudentService {
  /**
   * Fetches students with pagination, search, and filtering.
   */
  static async getStudents(params: GetStudentsParams) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentWhereInput = {};

    if (params.allowedDepartmentId) {
      where.departmentId = params.allowedDepartmentId;
    } else if (params.departmentId) {
      where.departmentId = params.departmentId;
    }

    if (params.level !== undefined) {
      where.level = params.level;
    }

    if (params.isEligible !== undefined) {
      where.isEligible = params.isEligible;
    }

    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: "insensitive" } },
        { matricNo: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.student.count({ where }),
    ]);

    return {
      data: students,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Ensure a STUDENT User exists for this email and return its id.
   * Password stays null so the student can complete /onboarding.
   */
  static async ensureStudentUser(params: {
    email: string;
    fullName: string;
    departmentId: string;
  }): Promise<string> {
    const email = params.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.role !== "STUDENT") {
        throw new Error(
          `Email ${email} belongs to a ${existingUser.role} account and cannot be linked as a student.`
        );
      }

      const alreadyLinked = await prisma.student.findUnique({
        where: { userId: existingUser.id },
        select: { id: true },
      });
      if (alreadyLinked) {
        throw new Error(`User account for ${email} is already linked to another student profile.`);
      }

      // Keep department in sync when possible
      if (existingUser.departmentId !== params.departmentId) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { departmentId: params.departmentId, name: existingUser.name || params.fullName },
        });
      }

      return existingUser.id;
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: params.fullName,
        role: "STUDENT",
        departmentId: params.departmentId,
        status: "ACTIVE",
      },
    });

    return user.id;
  }

  /**
   * Creates a single student record and provisions a linked login account.
   */
  static async createStudent(data: Prisma.StudentUncheckedCreateInput) {
    const validData = createStudentSchema.parse(data);

    // Ensure email or matric number are strictly unique
    const existing = await prisma.student.findFirst({
      where: {
        OR: [{ email: validData.email }, { matricNo: validData.matricNo }],
      },
    });

    if (existing) {
      throw new Error("A student with this email or matriculation number already exists.");
    }

    const userId = await this.ensureStudentUser({
      email: validData.email,
      fullName: validData.fullName,
      departmentId: validData.departmentId,
    });

    return await prisma.student.create({
      data: {
        ...validData,
        email: validData.email.toLowerCase(),
        userId,
        status: "ACTIVE",
        isEligible: true,
      },
      include: {
        user: { select: { id: true, email: true, passwordHash: true } },
      },
    });
  }

  /**
   * Updates a student record.
   */
  static async updateStudent(id: string, data: Prisma.StudentUpdateInput) {
    // If email or matricNo is being changed, check for uniqueness among OTHER students
    if (data.email || data.matricNo) {
      const orConditions: Prisma.StudentWhereInput[] = [];
      if (data.email) orConditions.push({ email: data.email as string });
      if (data.matricNo) orConditions.push({ matricNo: data.matricNo as string });

      const existing = await prisma.student.findFirst({
        where: {
          id: { not: id },
          OR: orConditions,
        },
      });

      if (existing) {
        throw new Error("A student with this email or matriculation number already exists.");
      }
    }

    return await prisma.student.update({
      where: { id },
      data,
    });
  }

  /**
   * Toggles student voting eligibility and logs the action.
   */
  static async toggleEligibility(studentId: string, isEligible: boolean, adminUserId: string, ipAddress?: string) {
    return await prisma.$transaction(async (tx) => {
      const student = await tx.student.update({
        where: { id: studentId },
        data: { isEligible },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "UPDATE_STUDENT_ELIGIBILITY",
          entity: "Student",
          entityId: studentId,
          details: `Eligibility changed to ${isEligible} by Admin`,
          ipAddress,
        },
      });

      return student;
    });
  }

  /**
   * Creates linked User accounts for students that were imported before auto-provisioning.
   */
  static async provisionMissingUsers(allowedDepartmentId?: string) {
    const where: Prisma.StudentWhereInput = { userId: null };
    if (allowedDepartmentId) {
      where.departmentId = allowedDepartmentId;
    }

    const unlinked = await prisma.student.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        matricNo: true,
        departmentId: true,
      },
    });

    let linked = 0;
    const errors: string[] = [];

    for (const student of unlinked) {
      try {
        const userId = await this.ensureStudentUser({
          email: student.email,
          fullName: student.fullName,
          departmentId: student.departmentId,
        });
        await prisma.student.update({
          where: { id: student.id },
          data: { userId },
        });
        linked++;
      } catch (err: unknown) {
        errors.push(
          `${student.matricNo}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return { linked, total: unlinked.length, errors };
  }

  /**
   * Bulk imports students from CSV text.
   */
  static async importFromCsv(csvText: string, allowedDepartmentId?: string) {
    // Parse CSV
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Pre-fetch all departments to map departmentCode to departmentId
    const departments = await prisma.department.findMany({
      select: { id: true, code: true },
    });
    const deptMap = new Map<string, string>();
    departments.forEach((d) => deptMap.set(d.code.toUpperCase(), d.id));

    for (const [index, row] of records.entries()) {
      const typedRow = row as Record<string, unknown>;
      try {
        const parsed = studentImportRowSchema.parse(typedRow);

        const departmentId = deptMap.get(parsed.departmentCode);
        if (!departmentId) {
          throw new Error(`Department code ${parsed.departmentCode} not found.`);
        }

        // If Department Admin, enforce they can only import into their own department
        if (allowedDepartmentId && allowedDepartmentId !== departmentId) {
           throw new Error(`Cannot import student into department ${parsed.departmentCode} as you don't have access to it.`);
        }

        // Check if student exists
        const existing = await prisma.student.findFirst({
          where: {
            OR: [{ email: parsed.email.toLowerCase() }, { matricNo: parsed.matricNo }],
          },
        });

        if (existing) {
          // Older imports may lack a linked login — provision without re-creating the student
          if (!existing.userId) {
            const userId = await this.ensureStudentUser({
              email: existing.email,
              fullName: existing.fullName,
              departmentId: existing.departmentId,
            });
            await prisma.student.update({
              where: { id: existing.id },
              data: { userId },
            });
            imported++;
            continue;
          }
          skipped++;
          continue;
        }

        const userId = await this.ensureStudentUser({
          email: parsed.email,
          fullName: parsed.fullName,
          departmentId,
        });

        await prisma.student.create({
          data: {
            matricNo: parsed.matricNo,
            fullName: parsed.fullName,
            email: parsed.email.toLowerCase(),
            level: parsed.level,
            departmentId,
            userId,
            status: "ACTIVE",
            isEligible: true,
          },
        });
        imported++;
      } catch (err: unknown) {
        skipped++;
        let errMsg = "Unknown error";
        if (err instanceof Error) {
            errMsg = "errors" in err ? (err as { errors?: { message?: string }[] }).errors?.[0]?.message || err.message : err.message;
        }
        errors.push(`Row ${index + 2} (${typedRow.matricNo || 'unknown'}): ${errMsg}`);
      }
    }

    return {
      imported,
      skipped,
      errors,
    };
  }
}
