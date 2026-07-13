import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { logger } from "@/utils/logger";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check Database connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      checks: {
        database: "ok"
      }
    }, { status: 200 });
  } catch (error) {
    logger.error("Health check failed", error);
    return NextResponse.json({
      status: "error",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      checks: {
        database: "failed"
      }
    }, { status: 503 });
  }
}
