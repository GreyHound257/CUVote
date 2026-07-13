import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Liveness simply indicates the application server is up and responding to requests
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString()
  }, { status: 200 });
}
