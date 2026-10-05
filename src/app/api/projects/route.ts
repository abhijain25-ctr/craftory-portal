import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { sanitizeProjectForParticipant } from '@/lib/privacy';
import { mockStore } from '@/lib/mock-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Admin Handler
  if (user.role === 'ADMIN') {
    try {
      const rawProjects = await prisma.project.findMany({
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

      const projects = rawProjects.map((p) => ({
        ...p,
        conversationId: p.conversations[0]?.id || null,
      }));

      return NextResponse.json({ projects });
    } catch (err) {
      // Fallback to mockStore
      const projects = mockStore.projects.map((p) => {
        const conv = mockStore.conversations.find((c) => c.projectId === p.id);
        const mems = mockStore.memberships
          .filter((m) => m.projectId === p.id && m.isActive)
          .map((m) => {
            const u = mockStore.users.find((usr) => usr.id === m.userId);
            return {
              ...m,
              user: u ? { id: u.id, realName: u.realName, email: u.email, role: u.role } : null,
            };
          });

        return {
          ...p,
          conversationId: conv?.id || null,
          conversations: conv ? [{ id: conv.id, title: conv.title }] : [],
          memberships: mems,
        };
      });

      return NextResponse.json({ projects });
    }
  }

  // 2. Client or Employee Handler
  try {
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
  } catch (err) {
    // Fallback to mockStore
    const userMemberships = mockStore.memberships.filter(
      (m) => (m.userId === user.id || m.userId === mockStore.users.find(u => u.email.toLowerCase() === user.email.toLowerCase())?.id) && m.isActive
    );

    const sanitizedProjects = userMemberships.map((m) => {
      const proj = mockStore.projects.find((p) => p.id === m.projectId);
      const conv = mockStore.conversations.find((c) => c.projectId === m.projectId);

      return {
        id: proj?.id || m.projectId,
        name: proj?.name || 'Assigned Project',
        code: proj?.code || 'PRJ-100',
        description: proj?.description || '',
        status: proj?.status || 'ACTIVE',
        myAlias: m.alias,
        myRole: m.role,
        assignedAt: m.createdAt,
        conversationId: conv?.id || null,
      };
    });

    return NextResponse.json({ projects: sanitizedProjects });
  }
}
