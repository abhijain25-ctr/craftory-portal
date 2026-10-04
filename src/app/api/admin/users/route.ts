import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied: Administrator role required' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      realName: true,
      role: true,
      createdAt: true,
      memberships: {
        where: { isActive: true },
        select: {
          id: true,
          alias: true,
          project: { select: { id: true, name: true, code: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied: Administrator role required' }, { status: 403 });
    }

    const body = await req.json();
    const { email, password, realName, role } = body;

    if (!email || !password || !realName) {
      return NextResponse.json({ error: 'Email, password, and real name are required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json({ error: 'A user with this email address already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const createdUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        realName: realName.trim(),
        passwordHash,
        role: role === 'ADMIN' ? 'ADMIN' : role === 'EMPLOYEE' ? 'EMPLOYEE' : 'CLIENT',
      },
      select: {
        id: true,
        email: true,
        realName: true,
        role: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        actorEmail: user.email,
        action: 'USER_CREATED',
        targetType: 'USER',
        targetId: createdUser.id,
        details: JSON.stringify({ email: createdUser.email, realName: createdUser.realName, role: createdUser.role }),
      },
    });

    return NextResponse.json({ user: createdUser }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
  }
}
