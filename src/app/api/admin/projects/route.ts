import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { mockStore } from '@/lib/mock-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied: Administrator role required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, description } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Project name and project code are required' }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim();

    // 1. Try Prisma first
    try {
      const project = await prisma.project.create({
        data: {
          name,
          code: cleanCode,
          description: description || '',
          conversations: {
            create: {
              title: `${name} General Stream`,
            },
          },
        },
        include: {
          conversations: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorRole: user.role,
          actorEmail: user.email,
          action: 'PROJECT_CREATED',
          targetType: 'PROJECT',
          targetId: project.id,
          details: JSON.stringify({ name, code: project.code }),
        },
      });

      return NextResponse.json({ project }, { status: 201 });
    } catch (dbErr) {
      // Prisma offline / fallback to mockStore
    }

    // 2. Fallback to mockStore
    const newProjId = `proj-${Date.now()}`;
    const newConvId = `conv-${Date.now()}`;

    const newProject = {
      id: newProjId,
      name,
      code: cleanCode,
      description: description || '',
      status: 'ACTIVE',
      createdAt: new Date(),
    };
    mockStore.projects.push(newProject);

    const newConv = {
      id: newConvId,
      projectId: newProjId,
      title: `${name} General Stream`,
      createdAt: new Date(),
    };
    mockStore.conversations.push(newConv);

    mockStore.auditLogs.unshift({
      id: `log-${Date.now()}`,
      actorId: user.id,
      actorRole: user.role,
      actorEmail: user.email,
      action: 'PROJECT_CREATED',
      targetType: 'PROJECT',
      targetId: newProjId,
      details: JSON.stringify({ name, code: cleanCode }),
      createdAt: new Date(),
    });

    return NextResponse.json({
      project: {
        ...newProject,
        conversations: [newConv],
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
