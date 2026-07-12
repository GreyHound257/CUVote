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
    const promises = this.providers.map(provider => provider.send(payload));

    // Use allSettled to ensure all providers attempt sending even if one fails
    const results = await Promise.allSettled(promises);

    results.forEach((result, idx) => {
      if (result.status === "rejected") {
        logger.error(`Provider ${idx} failed to send notification:`, result.reason);
      }
    });
  }
}

// Export a singleton instance for easy usage throughout the app
export const notificationService = new NotificationService();
