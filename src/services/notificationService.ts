import { logger } from "@/utils/logger";
import { prisma } from "@/lib/prisma";

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<void>;
}

export class InAppNotificationProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    await prisma.notification.create({
      data: {
        userId: payload.userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        priority: payload.priority,
      },
    });
  }
}

/**
 * Placeholder for Email Provider Integration
 * To be implemented in a future phase.
 */
export class EmailProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    logger.info(`[EmailProvider] Sending email to User ${payload.userId}: ${payload.title}`);
  }
}

/**
 * Placeholder for SMS Provider Integration
 * To be implemented in a future phase.
 */
export class SMSProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    logger.info(`[SMSProvider] Sending SMS to User ${payload.userId}: ${payload.title}`);
  }
}

/**
 * Placeholder for Push Provider Integration
 * To be implemented in a future phase.
 */
export class PushProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    logger.info(`[PushProvider] Sending push notification to User ${payload.userId}: ${payload.title}`);
  }
}

export class NotificationService {
  private providers: NotificationProvider[] = [];

  constructor() {
    // Register the primary in-app provider by default
    this.registerProvider(new InAppNotificationProvider());

    // Future providers can be conditionally registered based on user preferences or system config
    // this.registerProvider(new EmailProvider());
    // this.registerProvider(new SMSProvider());
    // this.registerProvider(new PushProvider());
  }

  registerProvider(provider: NotificationProvider) {
    this.providers.push(provider);
  }

  async dispatch(payload: NotificationPayload): Promise<void> {
    const promises = this.providers.map((provider) => provider.send(payload));

    // Use allSettled to ensure all providers attempt sending even if one fails
    const results = await Promise.allSettled(promises);

    results.forEach((result, idx) => {
      if (result.status === "rejected") {
        logger.error(`Provider ${idx} failed to send notification:`, result.reason);
      }
    });
  }

  /**
   * Efficient bulk in-app insert; other providers receive one sample + count log.
   */
  async dispatchMany(
    userIds: string[],
    payload: Omit<NotificationPayload, "userId">
  ): Promise<void> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) return;

    try {
      await prisma.notification.createMany({
        data: uniqueIds.map((userId) => ({
          userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          priority: payload.priority,
        })),
      });
    } catch (error) {
      logger.error("dispatchMany in-app failed:", error);
    }

    // Stub channel providers once (avoid N emails/SMS in this phase)
    logger.info(
      `[NotificationService] Bulk notify ${uniqueIds.length} users: ${payload.type} — ${payload.title}`
    );
  }

  async notifyDepartmentUsers(
    departmentId: string,
    payload: Omit<NotificationPayload, "userId">,
    options?: { includeStudents?: boolean; includeAdmins?: boolean; includeSuperAdmins?: boolean }
  ): Promise<void> {
    const includeStudents = options?.includeStudents !== false;
    const includeAdmins = options?.includeAdmins !== false;
    const includeSuperAdmins = options?.includeSuperAdmins !== false;
    const ids = new Set<string>();

    if (includeStudents) {
      const students = await prisma.student.findMany({
        where: { departmentId, userId: { not: null } },
        select: { userId: true },
      });
      for (const s of students) {
        if (s.userId) ids.add(s.userId);
      }
    }

    if (includeAdmins) {
      const admins = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          departmentId,
          role: "DEPARTMENT_ADMIN",
        },
        select: { id: true },
      });
      for (const a of admins) ids.add(a.id);
    }

    if (includeSuperAdmins) {
      const supers = await prisma.user.findMany({
        where: { status: "ACTIVE", role: "SUPER_ADMIN" },
        select: { id: true },
      });
      for (const s of supers) ids.add(s.id);
    }

    await this.dispatchMany([...ids], payload);
  }
}

// Export a singleton instance for easy usage throughout the app
export const notificationService = new NotificationService();
