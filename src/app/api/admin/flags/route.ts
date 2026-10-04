import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied: Administrator role required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');

    const whereClause: any = {};
    if (status && status !== 'ALL') whereClause.status = status;
    if (category && category !== 'ALL') whereClause.category = category;
    if (severity && severity !== 'ALL') whereClause.severity = severity;

    const flags = await prisma.flaggedMessage.findMany({
      where: whereClause,
      include: {
        message: {
          include: {
            conversation: {
              include: {
                project: { select: { id: true, name: true, code: true } },
              },
            },
            senderMembership: {
              include: {
                user: { select: { id: true, realName: true, email: true, role: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ flags });
  } catch (error: any) {
    console.error('Error fetching flagged messages:', error);
    return NextResponse.json({ error: 'Failed to retrieve review queue' }, { status: 500 });
  }
}
