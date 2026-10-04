import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied: Administrator role required' }, { status: 403 });
    }

    const flagId = params.id;
    const flag = await prisma.flaggedMessage.findUnique({
      where: { id: flagId },
      include: {
        message: {
          include: {
            conversation: true,
            senderMembership: { include: { user: true } },
          },
        },
      },
    });

    if (!flag) {
      return NextResponse.json({ error: 'Flagged item not found' }, { status: 404 });
    }

    const body = await req.json();
    const { action, adminNotes } = body; // action: 'APPROVE', 'REJECT', 'DISMISS'

    if (!['APPROVE', 'REJECT', 'DISMISS'].includes(action)) {
      return NextResponse.json({ error: 'Invalid moderation action' }, { status: 400 });
    }

    let updatedFlagStatus: 'APPROVED' | 'REJECTED' | 'DISMISSED' = 'APPROVED';
    let messageStatus: 'DELIVERED' | 'REJECTED' = flag.message.status as any;
    let auditAction = '';
    let duplicateRetried = false;

    if (action === 'APPROVE') {
      updatedFlagStatus = 'APPROVED';
      // Idempotency check: if message is already DELIVERED, don't duplicate
      if (flag.message.status === 'DELIVERED') {
        duplicateRetried = true;
      }
      messageStatus = 'DELIVERED';
      auditAction = 'MESSAGE_APPROVED';
    } else if (action === 'REJECT') {
      updatedFlagStatus = 'REJECTED';
      messageStatus = 'REJECTED';
      auditAction = 'MESSAGE_REJECTED';
    } else if (action === 'DISMISS') {
      // Dismiss false positive: marks flag dismissed, if held, retains or releases depending on note
      updatedFlagStatus = 'DISMISSED';
      auditAction = 'FLAG_DISMISSED_FALSE_POSITIVE';
    }

    // Execute database updates inside a transaction
    const [updatedFlag] = await prisma.$transaction([
      prisma.flaggedMessage.update({
        where: { id: flagId },
        data: {
          status: updatedFlagStatus,
          adminNotes: adminNotes || flag.adminNotes,
          reviewedBy: user.email,
          reviewedAt: new Date(),
        },
      }),
      prisma.message.update({
        where: { id: flag.messageId },
        data: {
          status: messageStatus,
          rejectionReason: action === 'REJECT' ? (adminNotes || 'Content violates Craftory Studio communication policy.') : null,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorRole: user.role,
          actorEmail: user.email,
          action: auditAction,
          targetType: 'FLAGGED_MESSAGE',
          targetId: flagId,
          details: JSON.stringify({
            messageId: flag.messageId,
            action,
            adminNotes: adminNotes || null,
            ruleCategory: flag.category,
            matchedRule: flag.matchedRule,
            wasDuplicateRetry: duplicateRetried,
          }),
        },
      }),
    ]);

    return NextResponse.json({
      message: 'Moderation decision recorded successfully',
      flag: updatedFlag,
      duplicateRetried,
    });
  } catch (error: any) {
    console.error('Error executing flag action:', error);
    return NextResponse.json({ error: 'Failed to record moderation action' }, { status: 500 });
  }
}
