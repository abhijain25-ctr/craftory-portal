import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { sanitizeProjectForParticipant } from '@/lib/privacy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'ADMIN') {
    // Admin gets full project view with memberships & real identities
    const projects = await prisma.project.findMany({
      include: {
        conversations: { select: { id: true, title: true } },
        memberships: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, realName: true, email: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ projects });
  }

  // Client or Employee: strictly ONLY assigned active projects (Requirement 02 & 08)
  const memberships = await prisma.projectMembership.findMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    include: {
      project: {
        include: {
          conversations: { select: { id: true, title: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const sanitizedProjects = memberships.map((m) => ({
    ...sanitizeProjectForParticipant(m),
    conversationId: m.project.conversations[0]?.id || null,
  }));

  return NextResponse.json({ projects: sanitizedProjects });
}
