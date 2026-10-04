import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Craftory Confidential Portal MySQL Database...');

  // Clear existing data safely
  await prisma.auditLog.deleteMany();
  await prisma.flaggedMessage.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.projectMembership.deleteMany();
  await prisma.project.deleteMany();
  await prisma.moderationRule.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin@1234', salt);
  const clientPassword = await bcrypt.hash('Client@1234', salt);
  const employeePassword = await bcrypt.hash('Employee@1234', salt);
  const testPassword = await bcrypt.hash('Test@1234', salt);

  // 1. Create Users
  // Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@craftory.studio',
      realName: 'Sophia Vance (Operations Lead)',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  // Client 1 (Clean email client1@craftory.studio)
  const client1 = await prisma.user.create({
    data: {
      email: 'client1@craftory.studio',
      realName: 'Marcus Sterling (Executive VP)',
      passwordHash: clientPassword,
      role: 'CLIENT',
    },
  });

  // Client 1 Corporate Alias email
  const clientApolloCorp = await prisma.user.create({
    data: {
      email: 'client.apollo@clientcompany.com',
      realName: 'Marcus Sterling (Executive VP)',
      passwordHash: clientPassword,
      role: 'CLIENT',
    },
  });

  // Client 2 (Clean email client2@craftory.studio)
  const client2 = await prisma.user.create({
    data: {
      email: 'client2@craftory.studio',
      realName: 'Elena Rostova (Head of Digital)',
      passwordHash: clientPassword,
      role: 'CLIENT',
    },
  });

  // Client 2 Corporate Alias email
  const clientBorealisCorp = await prisma.user.create({
    data: {
      email: 'client.borealis@nordicretail.com',
      realName: 'Elena Rostova (Head of Digital)',
      passwordHash: clientPassword,
      role: 'CLIENT',
    },
  });

  // Client 3 (Clean email client3@craftory.studio - Unassigned user for IDOR testing)
  const client3 = await prisma.user.create({
    data: {
      email: 'client3@craftory.studio',
      realName: 'Jordan Blake (External Reviewer)',
      passwordHash: clientPassword,
      role: 'CLIENT',
    },
  });

  const unassignedUser = await prisma.user.create({
    data: {
      email: 'unassigned.user@external.com',
      realName: 'Jordan Blake (External Reviewer)',
      passwordHash: testPassword,
      role: 'CLIENT',
    },
  });

  // Employees
  const employee1 = await prisma.user.create({
    data: {
      email: 'employee1@craftory.studio',
      realName: 'Devon Reed (Principal Solutions Engineer)',
      passwordHash: employeePassword,
      role: 'EMPLOYEE',
    },
  });

  const employeeDev = await prisma.user.create({
    data: {
      email: 'employee.dev@craftory.studio',
      realName: 'Devon Reed (Principal Solutions Engineer)',
      passwordHash: employeePassword,
      role: 'EMPLOYEE',
    },
  });

  // 2. Create Two Isolated Projects (Requirement 08 & 10)
  const projectApollo = await prisma.project.create({
    data: {
      name: 'Project Apollo',
      code: 'APOLLO-701',
      description: 'Confidential modernization of the core transaction portal and authentication layer.',
      status: 'ACTIVE',
    },
  });

  const projectBorealis = await prisma.project.create({
    data: {
      name: 'Project Borealis',
      code: 'BOREALIS-902',
      description: 'Zero-trust telemetry architecture and streaming data pipeline implementation.',
      status: 'ACTIVE',
    },
  });

  // 3. Project Memberships with project-specific ALIASES
  // In Project Apollo:
  await prisma.projectMembership.create({
    data: {
      userId: client1.id,
      projectId: projectApollo.id,
      alias: 'Client Alpha',
      role: 'CLIENT',
    },
  });

  await prisma.projectMembership.create({
    data: {
      userId: clientApolloCorp.id,
      projectId: projectApollo.id,
      alias: 'Client Alpha',
      role: 'CLIENT',
    },
  });

  await prisma.projectMembership.create({
    data: {
      userId: employee1.id,
      projectId: projectApollo.id,
      alias: 'Project Specialist Beta',
      role: 'EMPLOYEE',
    },
  });

  const memApolloEmployee = await prisma.projectMembership.create({
    data: {
      userId: employeeDev.id,
      projectId: projectApollo.id,
      alias: 'Project Specialist Beta',
      role: 'EMPLOYEE',
    },
  });

  // In Project Borealis:
  // Same Client 1 gets a DIFFERENT alias in Borealis: "Enterprise Advisor C"
  await prisma.projectMembership.create({
    data: {
      userId: client1.id,
      projectId: projectBorealis.id,
      alias: 'Enterprise Advisor C',
      role: 'CLIENT',
    },
  });

  await prisma.projectMembership.create({
    data: {
      userId: clientApolloCorp.id,
      projectId: projectBorealis.id,
      alias: 'Enterprise Advisor C',
      role: 'CLIENT',
    },
  });

  // Client 2 in Borealis: "Client Delta"
  await prisma.projectMembership.create({
    data: {
      userId: client2.id,
      projectId: projectBorealis.id,
      alias: 'Client Delta',
      role: 'CLIENT',
    },
  });

  await prisma.projectMembership.create({
    data: {
      userId: clientBorealisCorp.id,
      projectId: projectBorealis.id,
      alias: 'Client Delta',
      role: 'CLIENT',
    },
  });

  await prisma.projectMembership.create({
    data: {
      userId: employee1.id,
      projectId: projectBorealis.id,
      alias: 'Systems Architect Gamma',
      role: 'EMPLOYEE',
    },
  });

  await prisma.projectMembership.create({
    data: {
      userId: employeeDev.id,
      projectId: projectBorealis.id,
      alias: 'Systems Architect Gamma',
      role: 'EMPLOYEE',
    },
  });

  // 4. Create Conversations
  const convApollo = await prisma.conversation.create({
    data: {
      projectId: projectApollo.id,
      title: 'Apollo Workstream Chat',
    },
  });

  const convBorealis = await prisma.conversation.create({
    data: {
      projectId: projectBorealis.id,
      title: 'Borealis Engineering Stream',
    },
  });

  // 5. Seed ordinary messages in Project Apollo (Requirement 10.1)
  const memApolloClient = await prisma.projectMembership.findFirst({
    where: { userId: client1.id, projectId: projectApollo.id },
  });

  await prisma.message.create({
    data: {
      conversationId: convApollo.id,
      senderMembershipId: memApolloClient.id,
      content: 'Welcome to Project Apollo. We have reviewed the initial milestone deliverables.',
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 3600000 * 3),
    },
  });

  await prisma.message.create({
    data: {
      conversationId: convApollo.id,
      senderMembershipId: memApolloEmployee.id,
      content: 'Thank you! The sprint backlogs have been structured according to our confidential brief. Ready to proceed.',
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 3600000 * 2),
    },
  });

  // 6. Moderation Rules (Requirement 05)
  const ruleContact = await prisma.moderationRule.create({
    data: {
      category: 'CONTACT_SHARING',
      name: 'Direct Contact Details & External Links',
      pattern: '(\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b|\\+?[0-9]{1,3}[- ]?[0-9]{3,4}[- ]?[0-9]{3,4}|wa\\.me|t\\.me|linkedin\\.com|github\\.com\\/[a-zA-Z0-9_-]+|instagram\\.com)',
      action: 'HOLD',
      severity: 'CRITICAL',
      description: 'Holds messages sharing personal phone numbers, emails, and direct social links.',
      isActive: true,
    },
  });

  await prisma.moderationRule.create({
    data: {
      category: 'OFF_PLATFORM',
      name: 'Off-Platform Discussion & Outside Payments',
      pattern: '\\b(whatsapp|telegram|zoom call|google meet|skype|pay\\s*outside|wire\\s*transfer|paypal|upwork|fiverr|dm\\s*me\\s*on)\\b',
      action: 'HOLD',
      severity: 'HIGH',
      description: 'Detects requests to circumvent Craftory Studio and communicate or pay outside the portal.',
      isActive: true,
    },
  });

  await prisma.moderationRule.create({
    data: {
      category: 'COMMERCIAL',
      name: 'Pricing, Discounts & Financial Demands',
      pattern: '(\\$\\s*\\d+|\\b(price|pricing|discount|rate\\s*per\\s*hour|hourly\\s*rate|invoice|billing|budget|payment\\s*terms|quote)\\b)',
      action: 'FLAG',
      severity: 'MEDIUM',
      description: 'Flags commercial discussions requiring administrative review while allowing normal chat.',
      isActive: true,
    },
  });

  await prisma.moderationRule.create({
    data: {
      category: 'ABUSE',
      name: 'Abusive or Threatening Behavior',
      pattern: '\\b(idiot|stupid|scam|threat|harass|hate\\s*you|lawsuit|sue\\s*you)\\b',
      action: 'HOLD',
      severity: 'HIGH',
      description: 'Holds threatening or abusive language for immediate supervisor review.',
      isActive: true,
    },
  });

  // 7. Seed an initial flagged message for demo review in admin queue
  const heldMsg = await prisma.message.create({
    data: {
      conversationId: convApollo.id,
      senderMembershipId: memApolloClient.id,
      content: 'Could you reach out to my direct email at test.marcus@externalcorp.com regarding the NDA?',
      status: 'HELD_FOR_REVIEW',
      createdAt: new Date(Date.now() - 1800000),
    },
  });

  await prisma.flaggedMessage.create({
    data: {
      messageId: heldMsg.id,
      category: 'CONTACT_SHARING',
      severity: 'CRITICAL',
      matchedRule: ruleContact.name,
      reason: 'Matched personal email address: test.marcus@externalcorp.com',
      status: 'PENDING',
    },
  });

  // 8. Audit Log Initial Events
  await prisma.auditLog.create({
    data: {
      actorId: adminUser.id,
      actorRole: 'ADMIN',
      actorEmail: adminUser.email,
      action: 'SYSTEM_SEEDED',
      targetType: 'SYSTEM',
      targetId: 'INIT',
      details: 'Initial system seed completed with isolated projects, clean client credentials, strict privacy aliases, and default moderation rules.',
    },
  });

  console.log('✅ Database successfully seeded with all client & employee accounts!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
