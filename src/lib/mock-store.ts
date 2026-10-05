import bcrypt from 'bcryptjs';

export interface MockUser {
  id: string;
  email: string;
  passwordHash: string;
  realName: string;
  role: 'ADMIN' | 'CLIENT' | 'EMPLOYEE';
  createdAt: Date;
}

export interface MockProject {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  createdAt: Date;
}

export interface MockMembership {
  id: string;
  userId: string;
  projectId: string;
  alias: string;
  role: 'ADMIN' | 'CLIENT' | 'EMPLOYEE';
  isActive: boolean;
  createdAt: Date;
}

export interface MockConversation {
  id: string;
  projectId: string;
  title: string;
  createdAt: Date;
}

export interface MockMessage {
  id: string;
  conversationId: string;
  senderMembershipId: string;
  content: string;
  status: 'DELIVERED' | 'HELD_FOR_REVIEW' | 'REJECTED';
  clientTempId?: string | null;
  rejectionReason?: string | null;
  createdAt: Date;
}

export interface MockRule {
  id: string;
  category: string;
  name: string;
  pattern: string;
  action: string;
  severity: string;
  description: string;
  isActive: boolean;
}

export interface MockFlag {
  id: string;
  messageId: string;
  category: string;
  severity: string;
  matchedRule: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISMISSED';
  adminNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  createdAt: Date;
}

export interface MockAuditLog {
  id: string;
  actorId?: string | null;
  actorRole?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  details: string;
  createdAt: Date;
}

class MockStore {
  users: MockUser[] = [];
  projects: MockProject[] = [];
  memberships: MockMembership[] = [];
  conversations: MockConversation[] = [];
  messages: MockMessage[] = [];
  rules: MockRule[] = [];
  flags: MockFlag[] = [];
  auditLogs: MockAuditLog[] = [];

  constructor() {
    this.seed();
  }

  seed() {
    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('Admin@1234', salt);
    const clientPass = bcrypt.hashSync('Client@1234', salt);
    const empPass = bcrypt.hashSync('Employee@1234', salt);

    // Users
    this.users = [
      {
        id: 'usr-admin-1',
        email: 'admin@craftory.studio',
        passwordHash: adminPass,
        realName: 'Sophia Vance (Operations Lead)',
        role: 'ADMIN',
        createdAt: new Date(),
      },
      {
        id: 'usr-client-1',
        email: 'client1@craftory.studio',
        passwordHash: clientPass,
        realName: 'Marcus Sterling (Executive VP)',
        role: 'CLIENT',
        createdAt: new Date(),
      },
      {
        id: 'usr-client-apollo-corp',
        email: 'client.apollo@clientcompany.com',
        passwordHash: clientPass,
        realName: 'Marcus Sterling (Executive VP)',
        role: 'CLIENT',
        createdAt: new Date(),
      },
      {
        id: 'usr-client-2',
        email: 'client2@craftory.studio',
        passwordHash: clientPass,
        realName: 'Elena Rostova (Head of Digital)',
        role: 'CLIENT',
        createdAt: new Date(),
      },
      {
        id: 'usr-client-borealis-corp',
        email: 'client.borealis@nordicretail.com',
        passwordHash: clientPass,
        realName: 'Elena Rostova (Head of Digital)',
        role: 'CLIENT',
        createdAt: new Date(),
      },
      {
        id: 'usr-client-3',
        email: 'client3@craftory.studio',
        passwordHash: clientPass,
        realName: 'Jordan Blake (External Reviewer)',
        role: 'CLIENT',
        createdAt: new Date(),
      },
      {
        id: 'usr-emp-1',
        email: 'employee1@craftory.studio',
        passwordHash: empPass,
        realName: 'Devon Reed (Principal Solutions Engineer)',
        role: 'EMPLOYEE',
        createdAt: new Date(),
      },
      {
        id: 'usr-emp-dev',
        email: 'employee.dev@craftory.studio',
        passwordHash: empPass,
        realName: 'Devon Reed (Principal Solutions Engineer)',
        role: 'EMPLOYEE',
        createdAt: new Date(),
      },
    ];

    // Projects
    this.projects = [
      {
        id: 'proj-apollo',
        name: 'Project Apollo',
        code: 'APOLLO-701',
        description: 'Confidential modernization of the core transaction portal and authentication layer.',
        status: 'ACTIVE',
        createdAt: new Date(),
      },
      {
        id: 'proj-borealis',
        name: 'Project Borealis',
        code: 'BOREALIS-902',
        description: 'Zero-trust telemetry architecture and streaming data pipeline implementation.',
        status: 'ACTIVE',
        createdAt: new Date(),
      },
    ];

    // Conversations
    this.conversations = [
      {
        id: 'conv-apollo',
        projectId: 'proj-apollo',
        title: 'Apollo Workstream Chat',
        createdAt: new Date(),
      },
      {
        id: 'conv-borealis',
        projectId: 'proj-borealis',
        title: 'Borealis Engineering Stream',
        createdAt: new Date(),
      },
    ];

    // Memberships with strict project-specific aliases
    this.memberships = [
      // Apollo
      {
        id: 'mem-apollo-c1',
        userId: 'usr-client-1',
        projectId: 'proj-apollo',
        alias: 'Client Alpha',
        role: 'CLIENT',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'mem-apollo-c1-corp',
        userId: 'usr-client-apollo-corp',
        projectId: 'proj-apollo',
        alias: 'Client Alpha',
        role: 'CLIENT',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'mem-apollo-e1',
        userId: 'usr-emp-1',
        projectId: 'proj-apollo',
        alias: 'Project Specialist Beta',
        role: 'EMPLOYEE',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'mem-apollo-e1-dev',
        userId: 'usr-emp-dev',
        projectId: 'proj-apollo',
        alias: 'Project Specialist Beta',
        role: 'EMPLOYEE',
        isActive: true,
        createdAt: new Date(),
      },

      // Borealis
      {
        id: 'mem-borealis-c1',
        userId: 'usr-client-1',
        projectId: 'proj-borealis',
        alias: 'Enterprise Advisor C',
        role: 'CLIENT',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'mem-borealis-c1-corp',
        userId: 'usr-client-apollo-corp',
        projectId: 'proj-borealis',
        alias: 'Enterprise Advisor C',
        role: 'CLIENT',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'mem-borealis-c2',
        userId: 'usr-client-2',
        projectId: 'proj-borealis',
        alias: 'Client Delta',
        role: 'CLIENT',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'mem-borealis-c2-corp',
        userId: 'usr-client-borealis-corp',
        projectId: 'proj-borealis',
        alias: 'Client Delta',
        role: 'CLIENT',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'mem-borealis-e1',
        userId: 'usr-emp-1',
        projectId: 'proj-borealis',
        alias: 'Systems Architect Gamma',
        role: 'EMPLOYEE',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'mem-borealis-e1-dev',
        userId: 'usr-emp-dev',
        projectId: 'proj-borealis',
        alias: 'Systems Architect Gamma',
        role: 'EMPLOYEE',
        isActive: true,
        createdAt: new Date(),
      },
    ];

    // Initial Messages in Apollo
    this.messages = [
      {
        id: 'msg-apollo-1',
        conversationId: 'conv-apollo',
        senderMembershipId: 'mem-apollo-c1',
        content: 'Welcome to Project Apollo. We have reviewed the initial milestone deliverables.',
        status: 'DELIVERED',
        createdAt: new Date(Date.now() - 3600000 * 3),
      },
      {
        id: 'msg-apollo-2',
        conversationId: 'conv-apollo',
        senderMembershipId: 'mem-apollo-e1',
        content: 'Thank you! The sprint backlogs have been structured according to our confidential brief. Ready to proceed.',
        status: 'DELIVERED',
        createdAt: new Date(Date.now() - 3600000 * 2),
      },
      {
        id: 'msg-apollo-held',
        conversationId: 'conv-apollo',
        senderMembershipId: 'mem-apollo-c1',
        content: 'Could you reach out to my direct email at test.marcus@externalcorp.com regarding the NDA?',
        status: 'HELD_FOR_REVIEW',
        createdAt: new Date(Date.now() - 1800000),
      },
    ];

    // Moderation Rules
    this.rules = [
      {
        id: 'rule-contact',
        category: 'CONTACT_SHARING',
        name: 'Direct Contact Details & External Links',
        pattern: '(\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b|\\+?[0-9]{1,3}[- ]?[0-9]{3,4}[- ]?[0-9]{3,4}|wa\\.me|t\\.me|linkedin\\.com|github\\.com\\/[a-zA-Z0-9_-]+|instagram\\.com)',
        action: 'HOLD',
        severity: 'CRITICAL',
        description: 'Holds messages sharing personal phone numbers, emails, and direct social links.',
        isActive: true,
      },
      {
        id: 'rule-offplatform',
        category: 'OFF_PLATFORM',
        name: 'Off-Platform Discussion & Outside Payments',
        pattern: '\\b(whatsapp|telegram|zoom call|google meet|skype|pay\\s*outside|wire\\s*transfer|paypal|upwork|fiverr|dm\\s*me\\s*on)\\b',
        action: 'HOLD',
        severity: 'HIGH',
        description: 'Detects requests to circumvent Craftory Studio and communicate or pay outside the portal.',
        isActive: true,
      },
      {
        id: 'rule-commercial',
        category: 'COMMERCIAL',
        name: 'Pricing, Discounts & Financial Demands',
        pattern: '(\\$\\s*\\d+|\\b(price|pricing|discount|rate\\s*per\\s*hour|hourly\\s*rate|invoice|billing|budget|payment\\s*terms|quote)\\b)',
        action: 'FLAG',
        severity: 'MEDIUM',
        description: 'Flags commercial discussions requiring administrative review while allowing normal chat.',
        isActive: true,
      },
      {
        id: 'rule-abuse',
        category: 'ABUSE',
        name: 'Abusive or Threatening Behavior',
        pattern: '\\b(idiot|stupid|scam|threat|harass|hate\\s*you|lawsuit|sue\\s*you)\\b',
        action: 'HOLD',
        severity: 'HIGH',
        description: 'Holds threatening or abusive language for immediate supervisor review.',
        isActive: true,
      },
    ];

    // Flagged Message for Admin Queue Demo
    this.flags = [
      {
        id: 'flag-held-1',
        messageId: 'msg-apollo-held',
        category: 'CONTACT_SHARING',
        severity: 'CRITICAL',
        matchedRule: 'Direct Contact Details & External Links',
        reason: 'Matched personal email address: test.marcus@externalcorp.com',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 1800000),
      },
    ];

    // Audit Logs
    this.auditLogs = [
      {
        id: 'log-seed-1',
        actorId: 'usr-admin-1',
        actorRole: 'ADMIN',
        actorEmail: 'admin@craftory.studio',
        action: 'SYSTEM_SEEDED',
        targetType: 'SYSTEM',
        targetId: 'INIT',
        details: 'Initial system seed completed with isolated projects, clean client credentials, strict privacy aliases, and default moderation rules.',
        createdAt: new Date(),
      },
    ];
  }
}

const globalForMock = globalThis as unknown as {
  __craftory_mock_store?: MockStore;
};

export const mockStore = globalForMock.__craftory_mock_store ?? new MockStore();
globalForMock.__craftory_mock_store = mockStore;
