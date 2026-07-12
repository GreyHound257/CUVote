export const logger = {
  info: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'test') console.log(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'test') console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'test') console.error(`[ERROR] ${message}`, ...args);
  },
};
