import { logger } from "@/utils/logger";

/**
 * Monitoring Foundation
 *
 * This module provides interfaces for tracking metrics and errors.
 * In the future, this can be easily integrated with DataDog, Sentry, New Relic, etc.,
 * without changing the application code that calls these functions.
 */

export function trackMetric(name: string, value: number, tags?: Record<string, string | number | boolean>) {
  // Currently logs to stdout. Future: send to metrics provider.
  logger.info(`Metric: ${name}`, { value, tags });
}

export function trackError(error: unknown, context?: Record<string, unknown>) {
  // Currently logs to stdout via logger. Future: send to error tracking provider (e.g., Sentry).
  logger.error("Tracked Error", { error, context });
}
