import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { mockStore } from '@/lib/mock-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied: Administrator role required' }, { status: 403 });
  }

  try {
    const rules = await prisma.moderationRule.findMany({
      orderBy: { category: 'asc' },
    });
    return NextResponse.json({ rules });
  } catch (err) {
    return NextResponse.json({ rules: mockStore.rules });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied: Administrator role required' }, { status: 403 });
    }

    const body = await req.json();
    const { ruleId, action, isActive } = body;

    // 1. Try Prisma first
    try {
      const existingRule = await prisma.moderationRule.findUnique({
        where: { id: ruleId },
      });

      if (existingRule) {
        if (existingRule.category === 'CONTACT_SHARING' && action === 'FLAG') {
          return NextResponse.json(
            { error: 'Contact-sharing violations must strictly be held before delivery as per privacy mandate.' },
            { status: 400 }
          );
        }

        const updated = await prisma.moderationRule.update({
          where: { id: ruleId },
          data: {
            action: action || existingRule.action,
            isActive: typeof isActive === 'boolean' ? isActive : existingRule.isActive,
          },
        });

        await prisma.auditLog.create({
          data: {
            actorId: user.id,
            actorRole: user.role,
            actorEmail: user.email,
            action: 'RULE_CONFIG_UPDATED',
            targetType: 'MODERATION_RULE',
            targetId: ruleId,
            details: JSON.stringify({
              ruleName: existingRule.name,
              previousAction: existingRule.action,
              newAction: updated.action,
              isActive: updated.isActive,
            }),
          },
        });

        return NextResponse.json({ rule: updated });
      }
    } catch (dbErr) {
      // Prisma offline / fallback to mockStore
    }

    // 2. Fallback to mockStore
    const existingRule = mockStore.rules.find((r) => r.id === ruleId);
    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    if (existingRule.category === 'CONTACT_SHARING' && action === 'FLAG') {
      return NextResponse.json(
        { error: 'Contact-sharing violations must strictly be held before delivery as per privacy mandate.' },
        { status: 400 }
      );
    }

    const previousAction = existingRule.action;
    if (action) existingRule.action = action;
    if (typeof isActive === 'boolean') existingRule.isActive = isActive;

    mockStore.auditLogs.unshift({
      id: `log-${Date.now()}`,
      actorId: user.id,
      actorRole: user.role,
      actorEmail: user.email,
      action: 'RULE_CONFIG_UPDATED',
      targetType: 'MODERATION_RULE',
      targetId: ruleId,
      details: JSON.stringify({
        ruleName: existingRule.name,
        previousAction,
        newAction: existingRule.action,
        isActive: existingRule.isActive,
      }),
      createdAt: new Date(),
    });

    return NextResponse.json({ rule: existingRule });
  } catch (error: any) {
    console.error('Error updating rule:', error);
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
  }
}
