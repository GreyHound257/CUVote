import { logger } from "@/utils/logger";
import { z } from "zod";

const envSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
    AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
    PORT: z.coerce.number().default(3000),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production" && data.AUTH_SECRET.length < 32) {
      ctx.addIssue({
        code: "custom",
        message: "AUTH_SECRET must be at least 32 characters in production",
        path: ["AUTH_SECRET"],
      });
    }
  });

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  logger.error("❌ Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
