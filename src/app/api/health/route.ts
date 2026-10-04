import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Perform database ping without leaking credentials or message content
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: 'HEALTHY',
        service: 'Craftory Studio Confidential Communication Portal',
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'UNHEALTHY',
        service: 'Craftory Studio Confidential Communication Portal',
        database: 'DISCONNECTED',
        error: 'Database connectivity probe failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
