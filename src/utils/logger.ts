type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function redactArgs(args: unknown[]): unknown[] {
  return args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      const redacted = { ...arg };
      const sensitiveKeys = ['password', 'token', 'secret', 'passwordHash', 'credentials'];
      for (const key of Object.keys(redacted)) {
        if (sensitiveKeys.includes(key.toLowerCase())) {
          (redacted as Record<string, unknown>)[key] = '[REDACTED]';
        }
      }
      return redacted;
    }
    return arg;
  });
}

function getCorrelationId() {
  return "system";
}

function log(level: LogLevel, message: string, args: unknown[]) {
  if (process.env.NODE_ENV === 'test') return;

  const correlationId = getCorrelationId();
  const timestamp = new Date().toISOString();

  const logEntry = {
    timestamp,
    level,
    correlationId,
    message,
    args: redactArgs(args),
  };

  if (process.env.NODE_ENV === 'production') {
    // Structured JSON logging for production
    const logString = JSON.stringify(logEntry);
    if (level === 'error') {
      console.error(logString);
    } else if (level === 'warn') {
      console.warn(logString);
    } else {
      console.log(logString);
    }
  } else {
    // Human-readable logging for development
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${correlationId}]`;
    if (level === 'error') {
      console.error(prefix, message, ...redactArgs(args));
    } else if (level === 'warn') {
      console.warn(prefix, message, ...redactArgs(args));
    } else {
      console.log(prefix, message, ...redactArgs(args));
    }
  }
}

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    log('info', message, args);
  },
  warn: (message: string, ...args: unknown[]) => {
    log('warn', message, args);
  },
  error: (message: string, ...args: unknown[]) => {
    log('error', message, args);
    // Asynchronously track error via monitoring foundation without blocking
    if (message !== "Tracked Error") { // prevent infinite loop
      setTimeout(() => {
        import("@/lib/monitoring").then(({ trackError }) => {
            trackError(args[0] ?? message, { originalMessage: message, additionalArgs: args.slice(1) });
        }).catch(err => {
            // Silently swallow to avoid recursive loops if monitoring fails
            console.error("Failed to load monitoring dynamically", err);
        });
      }, 0);
    }
  },
};
