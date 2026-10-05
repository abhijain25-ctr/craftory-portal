import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { mockStore } from '@/lib/mock-store';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied: Administrator role required' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, projectId, alias, role } = body;

    if (!userId || !projectId || !alias) {
      return NextResponse.json({ error: 'User ID, Project ID, and Alias are required' }, { status: 400 });
    }

    // 1. Try Prisma first
    try {
      const membership = await prisma.projectMembership.upsert({
        where: {
          userId_projectId: { userId, projectId },
        },
        update: {
          alias,
          role: role || 'CLIENT',
          isActive: true,
        },
        create: {
          userId,
          projectId,
          alias,
          role: role || 'CLIENT',
          isActive: true,
        },
        include: {
          user: { select: { id: true, realName: true, email: true } },
          project: { select: { id: true, name: true } },
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorRole: user.role,
          actorEmail: user.email,
          action: 'MEMBERSHIP_ASSIGNED',
          targetType: 'PROJECT_MEMBERSHIP',
          targetId: membership.id,
          details: JSON.stringify({
            userId,
            userRealName: membership.user.realName,
            projectId,
            projectName: membership.project.name,
            assignedAlias: alias,
          }),
        },
      });

      return NextResponse.json({ membership }, { status: 201 });
    } catch (dbErr) {
      // Prisma offline / fallback to mockStore
    }

    // 2. Fallback to mockStore
    let existingMem = mockStore.memberships.find((m) => m.userId === userId && m.projectId === projectId);
    if (existingMem) {
      existingMem.alias = alias;
      existingMem.role = role || 'CLIENT';
      existingMem.isActive = true;
    } else {
      existingMem = {
        id: `mem-${Date.now()}`,
        userId,
        projectId,
        alias,
        role: role || 'CLIENT',
        isActive: true,
        createdAt: new Date(),
      };
      mockStore.memberships.push(existingMem);
    }

    const targetUser = mockStore.users.find((u) => u.id === userId);
    const targetProject = mockStore.projects.find((p) => p.id === projectId);

    mockStore.auditLogs.unshift({
      id: `log-${Date.now()}`,
      actorId: user.id,
      actorRole: user.role,
      actorEmail: user.email,
      action: 'MEMBERSHIP_ASSIGNED',
      targetType: 'PROJECT_MEMBERSHIP',
      targetId: existingMem.id,
      details: JSON.stringify({
        userId,
        userRealName: targetUser?.realName || 'Unknown',
        projectId,
        projectName: targetProject?.name || 'Unknown',
        assignedAlias: alias,
      }),
      createdAt: new Date(),
    });

    return NextResponse.json({
      membership: {
        ...existingMem,
        user: targetUser ? { id: targetUser.id, realName: targetUser.realName, email: targetUser.email } : null,
        project: targetProject ? { id: targetProject.id, name: targetProject.name } : null,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error assigning membership:', error);
    return NextResponse.json({ error: 'Failed to assign project membership' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied: Administrator role required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const membershipId = searchParams.get('id');

    if (!membershipId) {
      return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 });
    }

    // 1. Try Prisma first
    try {
      const existing = await prisma.projectMembership.findUnique({
        where: { id: membershipId },
        include: {
          user: { select: { realName: true } },
          project: { select: { name: true } },
        },
      });

      if (existing) {
        const updated = await prisma.projectMembership.update({
          where: { id: membershipId },
          data: { isActive: false },
        });

        await prisma.auditLog.create({
          data: {
            actorId: user.id,
            actorRole: user.role,
            actorEmail: user.email,
            action: 'MEMBERSHIP_REVOKED',
            targetType: 'PROJECT_MEMBERSHIP',
            targetId: membershipId,
            details: JSON.stringify({
              userId: existing.userId,
              userRealName: existing.user.realName,
              projectId: existing.projectId,
              projectName: existing.project.name,
              revokedAlias: existing.alias,
            }),
          },
        });

        return NextResponse.json({ message: 'Membership access revoked successfully', membership: updated });
      }
    } catch (dbErr) {
      // Prisma offline / fallback to mockStore
    }

    // 2. Fallback to mockStore
    const existing = mockStore.memberships.find((m) => m.id === membershipId);
    if (!existing) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    existing.isActive = false;
    const targetUser = mockStore.users.find((u) => u.id === existing.userId);
    const targetProject = mockStore.projects.find((p) => p.id === existing.projectId);

    mockStore.auditLogs.unshift({
      id: `log-${Date.now()}`,
      actorId: user.id,
      actorRole: user.role,
      actorEmail: user.email,
      action: 'MEMBERSHIP_REVOKED',
      targetType: 'PROJECT_MEMBERSHIP',
      targetId: membershipId,
      details: JSON.stringify({
        userId: existing.userId,
        userRealName: targetUser?.realName || 'Unknown',
        projectId: existing.projectId,
        projectName: targetProject?.name || 'Unknown',
        revokedAlias: existing.alias,
      }),
      createdAt: new Date(),
    });

    return NextResponse.json({ message: 'Membership access revoked successfully', membership: existing });
  } catch (error: any) {
    console.error('Error revoking membership:', error);
    return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 });
  }
}
