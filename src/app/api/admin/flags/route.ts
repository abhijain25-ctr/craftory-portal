import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { mockStore } from '@/lib/mock-store';

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

    try {
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
    } catch (dbErr) {
      // Fallback to mockStore
      let flags = mockStore.flags.filter((f) => {
        if (status && status !== 'ALL' && f.status !== status) return false;
        if (category && category !== 'ALL' && f.category !== category) return false;
        if (severity && severity !== 'ALL' && f.severity !== severity) return false;
        return true;
      });

      const formatted = flags.map((f) => {
        const msg = mockStore.messages.find((m) => m.id === f.messageId);
        const conv = msg ? mockStore.conversations.find((c) => c.id === msg.conversationId) : null;
        const proj = conv ? mockStore.projects.find((p) => p.id === conv.projectId) : null;
        const mem = msg ? mockStore.memberships.find((m) => m.id === msg.senderMembershipId) : null;
        const usr = mem ? mockStore.users.find((u) => u.id === mem.userId) : null;

        return {
          ...f,
          message: msg
            ? {
                ...msg,
                conversation: conv ? { ...conv, project: proj } : null,
                senderMembership: mem ? { ...mem, user: usr } : null,
              }
            : null,
        };
      });

      return NextResponse.json({ flags: formatted });
    }
  } catch (error: any) {
    console.error('Error fetching flagged messages:', error);
    return NextResponse.json({ error: 'Failed to retrieve review queue' }, { status: 500 });
  }
}
