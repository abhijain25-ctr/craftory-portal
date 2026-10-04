export const PRIVACY_NOTICE =
  'Your identity is hidden from other participants. Craftory Studio administrators may review conversations for project management and policy compliance.';

export interface SanitizedParticipantMessage {
  id: string;
  conversationId: string;
  content: string;
  status: 'DELIVERED' | 'HELD_FOR_REVIEW' | 'REJECTED' | 'FAILED';
  createdAt: string;
  senderAlias: string;
  senderRole: string;
  isSelf: boolean;
  clientTempId?: string | null;
  rejectionReason?: string | null;
}

export function sanitizeMessageForParticipant(
  msg: any,
  currentUserId: string,
  isAdmin: boolean = false
): SanitizedParticipantMessage | null {
  const isSender = msg.senderMembership?.userId === currentUserId;

  // Requirement 04 & 10: Keep held messages OUT of the recipient's API responses and chat history until approved!
  if (!isAdmin && !isSender && msg.status === 'HELD_FOR_REVIEW') {
    return null;
  }

  // If rejected, recipient never sees it either
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

export function sanitizeProjectForParticipant(membership: any) {
  return {
    id: membership.project.id,
    name: membership.project.name,
    code: membership.project.code,
    description: membership.project.description,
    status: membership.project.status,
    myAlias: membership.alias,
    myRole: membership.role,
  };
}
