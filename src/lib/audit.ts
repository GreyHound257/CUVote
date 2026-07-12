import { prisma } from "./prisma";

export async function logAuditAction(
  userId: string | null | undefined,
  action: string,
  details: string | null = null,
  ipAddress: string | null = null,
  entity: string | null = null,
  entityId: string | null = null,
  userAgent: string | null = null,
  outcome: string | null = null
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        details,
        ipAddress,
        entity,
        entityId,
        userAgent,
        outcome,
      },
    });
  } catch (error) {
    console.error("Failed to log audit action:", error);
    // We intentionally don't throw the error so that failing to log
    // doesn't bring down the main business transaction, but it is logged to standard error.
  }
}
