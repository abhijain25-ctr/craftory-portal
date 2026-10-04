import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied: Administrator role required' }, { status: 403 });
  }

  const rules = await prisma.moderationRule.findMany({
    orderBy: { category: 'asc' },
  });

  return NextResponse.json({ rules });
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied: Administrator role required' }, { status: 403 });
    }

    const body = await req.json();
    const { ruleId, action, isActive } = body;

    const existingRule = await prisma.moderationRule.findUnique({
      where: { id: ruleId },
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Requirement 05: Contact sharing MUST be held before delivery
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
  } catch (error: any) {
    console.error('Error updating rule:', error);
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
  }
}
