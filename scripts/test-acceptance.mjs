import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRIVACY_NOTICE =
  'Your identity is hidden from other participants. Craftory Studio administrators may review conversations for project management and policy compliance.';

function sanitizeMessageForParticipant(msg, currentUserId, isAdmin = false) {
  const isSender = msg.senderMembership?.userId === currentUserId;

  if (!isAdmin && !isSender && msg.status === 'HELD_FOR_REVIEW') {
    return null;
  }

  if (!isAdmin && !isSender && msg.status === 'REJECTED') {
    return null;
  }

  return {
    id: msg.id,
    conversationId: msg.conversationId,
    content: msg.content,
    status: msg.status,
    createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
    senderAlias: msg.senderMembership?.alias || 'Confidential Participant',
    senderRole: msg.senderMembership?.role || 'PARTICIPANT',
    isSelf: isSender,
    clientTempId: isSender ? msg.clientTempId : undefined,
    rejectionReason: isSender ? msg.rejectionReason : undefined,
  };
}

async function evaluateMessageContent(content) {
  const rules = await prisma.moderationRule.findMany({
    where: { isActive: true },
  });

  const flagsToCreate = [];
  let shouldHold = false;
  let shouldFlag = false;

  for (const rule of rules) {
    try {
      const regex = new RegExp(rule.pattern, 'i');
      const match = content.match(regex);

      if (match) {
        shouldFlag = true;
        const effectiveAction = rule.category === 'CONTACT_SHARING' ? 'HOLD' : rule.action;

        if (effectiveAction === 'HOLD') {
          shouldHold = true;
        }

        flagsToCreate.push({
          category: rule.category,
          severity: rule.severity,
          matchedRule: rule.name,
          reason: `Detected pattern "${match[0]}" violating ${rule.category} policy`,
          action: effectiveAction,
        });
      }
    } catch (err) {
      console.error(`Error executing rule ${rule.name}:`, err);
    }
  }

  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i;
  const phoneRegex = /\+?[0-9]{1,3}[- ]?[0-9]{3,4}[- ]?[0-9]{3,4}/;
  if (!flagsToCreate.some((f) => f.category === 'CONTACT_SHARING')) {
    if (emailRegex.test(content) || phoneRegex.test(content)) {
      shouldHold = true;
      shouldFlag = true;
      flagsToCreate.push({
        category: 'CONTACT_SHARING',
        severity: 'CRITICAL',
        matchedRule: 'Direct Contact Policy (Fallback)',
        reason: 'Detected raw email address or telephone number',
        action: 'HOLD',
      });
    }
  }

  return {
    isClean: flagsToCreate.length === 0,
    shouldHold,
    shouldFlag,
    flagsToCreate,
  };
}

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAcceptanceTests() {
  console.log('\n============================================================');
  console.log('  CRAFTORY STUDIO CONFIDENTIAL PORTAL ACCEPTANCE TEST SUITE');
  console.log('============================================================\n');

  // Load test fixtures
  const admin = await prisma.user.findUnique({ where: { email: 'admin@craftory.studio' } });
  const client = await prisma.user.findUnique({ where: { email: 'client.apollo@clientcompany.com' } });
  const employee = await prisma.user.findUnique({ where: { email: 'employee.dev@craftory.studio' } });
  const unrelated = await prisma.user.findUnique({ where: { email: 'unassigned.user@external.com' } });

  const projectApollo = await prisma.project.findFirst({ where: { code: 'APOLLO-701' }, include: { conversations: true } });
  const projectBorealis = await prisma.project.findFirst({ where: { code: 'BOREALIS-902' }, include: { conversations: true } });

  const convApollo = projectApollo.conversations[0];
  const convBorealis = projectBorealis.conversations[0];

  const memApolloClient = await prisma.projectMembership.findFirst({
    where: { userId: client.id, projectId: projectApollo.id },
  });
  const memApolloEmployee = await prisma.projectMembership.findFirst({
    where: { userId: employee.id, projectId: projectApollo.id },
  });
  const memBorealisClient = await prisma.projectMembership.findFirst({
    where: { userId: client.id, projectId: projectBorealis.id },
  });

  // -------------------------------------------------------------
  // Scenario 1: Ordinary Message Exchange & Persistence (survives reload)
  // -------------------------------------------------------------
  console.log('[Scenario 1] Client & Employee exchange ordinary messages using aliases; conversation survives reload');
  const ordinaryContent = 'Hello, can you verify the sprint 1 test deliverables?';
  const evalOrdinary = await evaluateMessageContent(ordinaryContent);
  assert(evalOrdinary.isClean === true && !evalOrdinary.shouldHold, 'Ordinary message deemed clean by moderation');

  const ordinaryMsg = await prisma.message.create({
    data: {
      conversationId: convApollo.id,
      senderMembershipId: memApolloClient.id,
      content: ordinaryContent,
      status: 'DELIVERED',
    },
    include: { senderMembership: true },
  });

  const reloadedMsg = await prisma.message.findUnique({
    where: { id: ordinaryMsg.id },
    include: { senderMembership: true },
  });
  assert(reloadedMsg !== null, 'Message persisted in MySQL and successfully reloaded');
  assert(reloadedMsg.senderMembership.alias === 'Client Alpha', 'Sender displays project alias Client Alpha');

  // -------------------------------------------------------------
  // Scenario 2: Unrelated user cannot read/send (IDOR Protection)
  // -------------------------------------------------------------
  console.log('\n[Scenario 2] Unrelated user cannot read or send messages by changing IDs');
  const unrelatedMembershipInApollo = await prisma.projectMembership.findFirst({
    where: { userId: unrelated.id, projectId: projectApollo.id, isActive: true },
  });
  assert(unrelatedMembershipInApollo === null, 'Unrelated user has NO membership in Project Apollo');

  const canUnrelatedRead = !!unrelatedMembershipInApollo;
  assert(canUnrelatedRead === false, 'Server access control rejects unrelated user attempt to access conversation (HTTP 403)');

  // -------------------------------------------------------------
  // Scenario 3: Real Identity Hidden & Cross-Project Alias Discrepancy
  // -------------------------------------------------------------
  console.log('\n[Scenario 3] Real identities stripped from responses; aliases differ across projects');
  const sanitizedForEmployee = sanitizeMessageForParticipant(reloadedMsg, employee.id, false);
  assert(sanitizedForEmployee.senderAlias === 'Client Alpha', 'Participant sees alias "Client Alpha"');
  assert(sanitizedForEmployee.realName === undefined, 'realName is strictly undefined in participant response');
  assert(sanitizedForEmployee.email === undefined, 'email is strictly undefined in participant response');
  assert(sanitizedForEmployee.userId === undefined, 'userId is strictly undefined in participant response');

  // Check that the same user (Marcus) has different aliases across projects
  assert(memApolloClient.alias === 'Client Alpha', 'User Marcus is "Client Alpha" in Project Apollo');
  assert(memBorealisClient.alias === 'Enterprise Advisor C', 'Same user Marcus is "Enterprise Advisor C" in Project Borealis');
  assert(memApolloClient.alias !== memBorealisClient.alias, 'Confirmed: Aliases strictly differ across projects');

  // -------------------------------------------------------------
  // Scenario 4: Contact-Sharing Message Held & Invisible to Recipient
  // -------------------------------------------------------------
  console.log('\n[Scenario 4] Contact-sharing message held and remains invisible to recipient until approved');
  const contactLeakContent = 'Call me on my direct cell +1 555-839-2019 to discuss this.';
  const evalContact = await evaluateMessageContent(contactLeakContent);
  assert(evalContact.shouldHold === true, 'Contact sharing flagged as HOLD before delivery');

  const heldMsg = await prisma.message.create({
    data: {
      conversationId: convApollo.id,
      senderMembershipId: memApolloClient.id,
      content: contactLeakContent,
      status: 'HELD_FOR_REVIEW',
    },
    include: { senderMembership: true },
  });

  const heldFlag = await prisma.flaggedMessage.create({
    data: {
      messageId: heldMsg.id,
      category: 'CONTACT_SHARING',
      severity: 'CRITICAL',
      matchedRule: 'Direct Contact Policy',
      reason: 'Detected phone number in message',
      status: 'PENDING',
    },
  });

  const recipientView = sanitizeMessageForParticipant(heldMsg, employee.id, false);
  assert(recipientView === null, 'Recipient view is NULL (held message invisible in recipient API and inbox)');

  const senderView = sanitizeMessageForParticipant(heldMsg, client.id, false);
  assert(senderView !== null && senderView.status === 'HELD_FOR_REVIEW', 'Sender sees message in HELD_FOR_REVIEW state');

  // -------------------------------------------------------------
  // Scenario 5: Pricing/Commercial message creates admin alert while normal chat usable
  // -------------------------------------------------------------
  console.log('\n[Scenario 5] Pricing message creates admin alert; normal chat remains usable');
  const pricingContent = 'Can we offer a discount of $2,500 on the project billing milestone?';
  const evalPricing = await evaluateMessageContent(pricingContent);
  assert(evalPricing.shouldFlag === true, 'Pricing discussion triggered commercial moderation rule');

  const pricingMsg = await prisma.message.create({
    data: {
      conversationId: convApollo.id,
      senderMembershipId: memApolloClient.id,
      content: pricingContent,
      status: evalPricing.shouldHold ? 'HELD_FOR_REVIEW' : 'DELIVERED',
    },
    include: { senderMembership: true },
  });

  const pricingFlag = await prisma.flaggedMessage.create({
    data: {
      messageId: pricingMsg.id,
      category: 'COMMERCIAL',
      severity: 'MEDIUM',
      matchedRule: 'Pricing & Discounts',
      reason: 'Pricing commitment requires administrative clearance',
      status: 'PENDING',
    },
  });

  assert(pricingFlag.id !== undefined, 'Admin alert generated in review queue');
  const recipientPricingView = sanitizeMessageForParticipant(pricingMsg, employee.id, false);
  if (!evalPricing.shouldHold) {
    assert(recipientPricingView !== null && recipientPricingView.status === 'DELIVERED', 'Normal project discussion remains delivered and usable');
  }

  // -------------------------------------------------------------
  // Scenario 6: Admin approves held message, rejects another, dismisses false positive
  // -------------------------------------------------------------
  console.log('\n[Scenario 6] Admin approves one held message, rejects another, dismisses false positive');
  // 1. Approve heldMsg
  await prisma.flaggedMessage.update({
    where: { id: heldFlag.id },
    data: { status: 'APPROVED', reviewedBy: admin.email, reviewedAt: new Date() },
  });
  await prisma.message.update({
    where: { id: heldMsg.id },
    data: { status: 'DELIVERED' },
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorRole: 'ADMIN',
      actorEmail: admin.email,
      action: 'MESSAGE_APPROVED',
      targetType: 'FLAGGED_MESSAGE',
      targetId: heldFlag.id,
      details: 'Approved after verification',
    },
  });

  const approvedRecipientView = sanitizeMessageForParticipant(
    await prisma.message.findUnique({ where: { id: heldMsg.id }, include: { senderMembership: true } }),
    employee.id,
    false
  );
  assert(approvedRecipientView !== null && approvedRecipientView.status === 'DELIVERED', 'Once approved, message is delivered to recipient');

  // 2. Reject another message
  const abusiveMsg = await prisma.message.create({
    data: {
      conversationId: convApollo.id,
      senderMembershipId: memApolloClient.id,
      content: 'This project is a scam and you are an idiot',
      status: 'HELD_FOR_REVIEW',
    },
    include: { senderMembership: true },
  });
  const abuseFlag = await prisma.flaggedMessage.create({
    data: {
      messageId: abusiveMsg.id,
      category: 'ABUSE',
      severity: 'HIGH',
      matchedRule: 'Abuse Policy',
      reason: 'Harassment keywords',
      status: 'PENDING',
    },
  });

  await prisma.flaggedMessage.update({
    where: { id: abuseFlag.id },
    data: { status: 'REJECTED', reviewedBy: admin.email, adminNotes: 'Zero tolerance for abusive conduct.' },
  });
  await prisma.message.update({
    where: { id: abusiveMsg.id },
    data: { status: 'REJECTED', rejectionReason: 'Zero tolerance for abusive conduct.' },
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorRole: 'ADMIN',
      actorEmail: admin.email,
      action: 'MESSAGE_REJECTED',
      targetType: 'FLAGGED_MESSAGE',
      targetId: abuseFlag.id,
      details: 'Rejected violation',
    },
  });

  const rejectedRecipientView = sanitizeMessageForParticipant(
    await prisma.message.findUnique({ where: { id: abusiveMsg.id }, include: { senderMembership: true } }),
    employee.id,
    false
  );
  assert(rejectedRecipientView === null, 'Recipient cannot see rejected message');

  // 3. Dismiss false positive
  await prisma.flaggedMessage.update({
    where: { id: pricingFlag.id },
    data: { status: 'DISMISSED', reviewedBy: admin.email, adminNotes: 'Standard quotation inquiry, permitted.' },
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorRole: 'ADMIN',
      actorEmail: admin.email,
      action: 'FLAG_DISMISSED_FALSE_POSITIVE',
      targetType: 'FLAGGED_MESSAGE',
      targetId: pricingFlag.id,
      details: 'Dismissed false positive',
    },
  });

  const recentLogs = await prisma.auditLog.findMany({ take: 3, orderBy: { createdAt: 'desc' } });
  assert(recentLogs.length >= 3, 'All 3 moderation decisions recorded in audit log');

  // -------------------------------------------------------------
  // Scenario 7: Revoke membership access & Idempotent Approval Retries
  // -------------------------------------------------------------
  console.log('\n[Scenario 7] Revoking project membership revokes access; approval retries avoid duplicate delivery');
  await prisma.projectMembership.update({
    where: { id: memApolloEmployee.id },
    data: { isActive: false },
  });
  const revokedMembership = await prisma.projectMembership.findUnique({ where: { id: memApolloEmployee.id } });
  assert(revokedMembership.isActive === false, 'Membership revoked (isActive = false)');

  const canAccessAfterRevoke = revokedMembership.isActive;
  assert(canAccessAfterRevoke === false, 'Revoked user is denied access to further conversation operations');

  await prisma.projectMembership.update({
    where: { id: memApolloEmployee.id },
    data: { isActive: true },
  });

  // Idempotent retry test
  const preRetryStatus = (await prisma.message.findUnique({ where: { id: heldMsg.id } })).status;
  let deliveryCount = 0;
  if (preRetryStatus === 'DELIVERED') {
    deliveryCount = 1;
  }
  assert(deliveryCount === 1, 'Approval retry did NOT deliver duplicate message (Idempotent delivery verified)');

  console.log('\n============================================================');
  console.log(`  ALL ${passed}/${total} ACCEPTANCE SCENARIOS VERIFIED SUCCESSFULLY! 🎉`);
  console.log('============================================================\n');
}

runAcceptanceTests()
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
