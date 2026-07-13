import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";

export const dynamic = 'force-dynamic';

export async function GET() {
  // Readiness indicates the application is fully ready to handle traffic (e.g., DB connected)
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ready",
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    logger.error("Readiness check failed", error);
    return NextResponse.json({
      status: "not_ready",
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
