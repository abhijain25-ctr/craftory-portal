import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { sanitizeMessageForParticipant, PRIVACY_NOTICE } from '@/lib/privacy';
import { evaluateMessageContent } from '@/lib/moderation';
import { mockStore } from '@/lib/mock-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.id;
    const isAdmin = user.role === 'ADMIN';

    // 1. Try Prisma first
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          project: true,
        },
      });

      if (conversation) {
        let userMembership = null;
        if (!isAdmin) {
          userMembership = await prisma.projectMembership.findFirst({
            where: {
              userId: user.id,
              projectId: conversation.projectId,
              isActive: true,
            },
          });

          if (!userMembership) {
            return NextResponse.json(
              { error: 'Access denied: You are not an active member of this project conversation.' },
              { status: 403 }
            );
          }
        }

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
      }
    } catch (dbErr) {
      // Prisma offline / Vercel cloud serverless fallback
    }

    // 2. Fallback to mockStore
    const conversation = mockStore.conversations.find((c) => c.id === conversationId || c.projectId === conversationId);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const project = mockStore.projects.find((p) => p.id === conversation.projectId);
    let userMembership = null;

    if (!isAdmin) {
      userMembership = mockStore.memberships.find(
        (m) =>
          (m.userId === user.id || m.userId === mockStore.users.find((u) => u.email.toLowerCase() === user.email.toLowerCase())?.id) &&
          m.projectId === conversation.projectId &&
          m.isActive
      );

      if (!userMembership) {
        return NextResponse.json(
          { error: 'Access denied: You are not an active member of this project conversation.' },
          { status: 403 }
        );
      }
    }

    const rawMessages = mockStore.messages.filter((m) => m.conversationId === conversation.id);
    const sanitizedMessages = rawMessages
      .map((m) => {
        const mem = mockStore.memberships.find((memItem) => memItem.id === m.senderMembershipId);
        return sanitizeMessageForParticipant(
          {
            ...m,
            senderMembership: mem ? { id: mem.id, userId: mem.userId, alias: mem.alias, role: mem.role } : null,
          },
          user.id,
          isAdmin
        );
      })
      .filter(Boolean);

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        projectId: conversation.projectId,
        projectName: project?.name || 'Project Stream',
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
    const isAdmin = user.role === 'ADMIN';
    const body = await req.json();
    const { content, clientTempId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    // 1. Try Prisma first
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { project: true },
      });

      if (conversation) {
        let senderMembership = await prisma.projectMembership.findFirst({
          where: {
            userId: user.id,
            projectId: conversation.projectId,
            isActive: true,
          },
        });

        if (!senderMembership && !isAdmin) {
          return NextResponse.json(
            { error: 'Access denied: You cannot send messages to this conversation.' },
            { status: 403 }
          );
        }

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

        const moderationResult = await evaluateMessageContent(content);
        let initialStatus: 'DELIVERED' | 'HELD_FOR_REVIEW' = moderationResult.shouldHold ? 'HELD_FOR_REVIEW' : 'DELIVERED';

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
      }
    } catch (dbErr) {
      // Prisma offline / fallback to mockStore
    }

    // 2. Fallback to mockStore
    const conversation = mockStore.conversations.find((c) => c.id === conversationId || c.projectId === conversationId);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    let senderMembership = mockStore.memberships.find(
      (m) =>
        (m.userId === user.id || m.userId === mockStore.users.find((u) => u.email.toLowerCase() === user.email.toLowerCase())?.id) &&
        m.projectId === conversation.projectId &&
        m.isActive
    );

    if (!senderMembership && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied: You cannot send messages to this conversation.' },
        { status: 403 }
      );
    }

    if (!senderMembership && isAdmin) {
      senderMembership = {
        id: `mem-admin-${Date.now()}`,
        userId: user.id,
        projectId: conversation.projectId,
        alias: 'Craftory Administrator',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
      };
      mockStore.memberships.push(senderMembership);
    }

    const moderationResult = await evaluateMessageContent(content);
    let initialStatus: 'DELIVERED' | 'HELD_FOR_REVIEW' = moderationResult.shouldHold ? 'HELD_FOR_REVIEW' : 'DELIVERED';

    const newMsgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const createdMessage = {
      id: newMsgId,
      conversationId: conversation.id,
      senderMembershipId: senderMembership!.id,
      content: content.trim(),
      status: initialStatus,
      clientTempId: clientTempId || null,
      createdAt: new Date(),
    };

    mockStore.messages.push(createdMessage);

    if (moderationResult.flagsToCreate.length > 0) {
      for (const flag of moderationResult.flagsToCreate) {
        mockStore.flags.push({
          id: `flag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          messageId: newMsgId,
          category: flag.category,
          severity: flag.severity,
          matchedRule: flag.matchedRule,
          reason: flag.reason,
          status: 'PENDING',
          createdAt: new Date(),
        });
      }
    }

    const sanitized = sanitizeMessageForParticipant(
      {
        ...createdMessage,
        senderMembership: {
          id: senderMembership!.id,
          userId: senderMembership!.userId,
          alias: senderMembership!.alias,
          role: senderMembership!.role,
        },
      },
      user.id,
      isAdmin
    );

    return NextResponse.json(
      {
        message: sanitized,
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
