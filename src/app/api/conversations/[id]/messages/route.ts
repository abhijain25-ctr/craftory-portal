import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { sanitizeMessageForParticipant, PRIVACY_NOTICE } from '@/lib/privacy';
import { evaluateMessageContent } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.id;
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        project: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Server-side Access Check (Requirement 02 & 08): Check active membership
    let userMembership = null;
    const isAdmin = user.role === 'ADMIN';

    if (!isAdmin) {
      userMembership = await prisma.projectMembership.findFirst({
        where: {
          userId: user.id,
          projectId: conversation.projectId,
          isActive: true,
        },
      });

      if (!userMembership) {
        // Strict IDOR protection: unrelated user cannot view messages
        return NextResponse.json(
          { error: 'Access denied: You are not an active member of this project conversation.' },
          { status: 403 }
        );
      }
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        senderMembership: {
          select: {
            id: true,
            userId: true,
            alias: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Sanitize messages: strictly strip real identities and hide other participant's held messages
    const sanitizedMessages = messages
      .map((m) => sanitizeMessageForParticipant(m, user.id, isAdmin))
      .filter(Boolean);

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        projectId: conversation.projectId,
        projectName: conversation.project.name,
        title: conversation.title,
        myAlias: userMembership?.alias || (isAdmin ? 'Craftory Administrator' : 'Anonymous'),
        privacyNotice: PRIVACY_NOTICE,
      },
      messages: sanitizedMessages,
    });
  } catch (error: any) {
    console.error('Error fetching conversation messages:', error);
    return NextResponse.json({ error: 'Failed to retrieve conversation' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.id;
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { project: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const isAdmin = user.role === 'ADMIN';
    let senderMembership = await prisma.projectMembership.findFirst({
      where: {
        userId: user.id,
        projectId: conversation.projectId,
        isActive: true,
      },
    });

    if (!senderMembership && !isAdmin) {
      // Access denied / IDOR check
      return NextResponse.json(
        { error: 'Access denied: You cannot send messages to this conversation.' },
        { status: 403 }
      );
    }

    // If admin is chatting without membership, create an admin membership placeholder
    if (!senderMembership && isAdmin) {
      senderMembership = await prisma.projectMembership.upsert({
        where: { userId_projectId: { userId: user.id, projectId: conversation.projectId } },
        update: { isActive: true },
        create: {
          userId: user.id,
          projectId: conversation.projectId,
          alias: 'Craftory Administrator',
          role: 'ADMIN',
        },
      });
    }

    const body = await req.json();
    const { content, clientTempId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    // Idempotency check: if clientTempId already received from this membership, return existing
    if (clientTempId) {
      const existing = await prisma.message.findFirst({
        where: {
          conversationId,
          senderMembershipId: senderMembership!.id,
          clientTempId,
        },
        include: {
          senderMembership: { select: { id: true, userId: true, alias: true, role: true } },
        },
      });

      if (existing) {
        return NextResponse.json({
          message: sanitizeMessageForParticipant(existing, user.id, isAdmin),
          idempotentDuplicate: true,
        });
      }
    }

    // Server-Side Moderation Engine Check (Requirement 04 & 05)
    const moderationResult = await evaluateMessageContent(content);

    let initialStatus: 'DELIVERED' | 'HELD_FOR_REVIEW' = 'DELIVERED';
    if (moderationResult.shouldHold) {
      initialStatus = 'HELD_FOR_REVIEW';
    }

    // Persist message
    const createdMessage = await prisma.message.create({
      data: {
        conversationId,
        senderMembershipId: senderMembership!.id,
        content: content.trim(),
        status: initialStatus,
        clientTempId: clientTempId || null,
      },
      include: {
        senderMembership: { select: { id: true, userId: true, alias: true, role: true } },
      },
    });

    // Create flagged message alerts for administrator if policy triggers
    if (moderationResult.flagsToCreate.length > 0) {
      for (const flag of moderationResult.flagsToCreate) {
        await prisma.flaggedMessage.create({
          data: {
            messageId: createdMessage.id,
            category: flag.category,
            severity: flag.severity,
            matchedRule: flag.matchedRule,
            reason: flag.reason,
            status: 'PENDING',
          },
        });
      }
    }

    return NextResponse.json(
      {
        message: sanitizeMessageForParticipant(createdMessage, user.id, isAdmin),
        heldForReview: initialStatus === 'HELD_FOR_REVIEW',
        flags: moderationResult.flagsToCreate,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error posting message:', error);
    return NextResponse.json({ error: 'Failed to deliver message' }, { status: 500 });
  }
}
