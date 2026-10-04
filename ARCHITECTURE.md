# Craftory Studio — Architecture & Threat Model

This document outlines the system architecture, security controls, privacy boundaries, and known limitations of the Confidential Communication Portal.

---

## 1. System Topology & Data Flow

```
[ Client / Employee Browser ]
              │
              │  HTTPS (TLS 1.3)
              ▼
    [ Next.js Edge / Server ]
              │
      ┌───────┴───────────────────────┐
      │  Session Auth & RBAC Check    │  (Checks project membership, rejects IDOR attempts)
      │  Moderation Pre-Delivery Filter│  (Regex & heuristics: Contact, Off-Platform, Commercial, Abuse)
      │  DTO Privacy Sanitizer        │  (Strips realName, email, phone, userId for participants)
      └───────┬───────────────────────┘
              │
              ▼
      [ MySQL 8.0 Storage ]
        - users (Admin only sees realName/email)
        - projects
        - project_memberships (Stores project-specific alias)
        - conversations
        - messages (Status: DELIVERED, HELD_FOR_REVIEW, REJECTED)
        - flagged_messages (Admin review queue)
        - audit_logs (Immutable audit trail)
```

---

## 2. Core Security & Privacy Controls

### A. Role-Based Access Control (RBAC) & IDOR Protection
- Every conversation and message operation verifies that the authenticated user holds an active membership record in the target project (`ProjectMembership.isActive === true`).
- An unrelated user or a member of Project B attempting to query Project A's conversation ID receives `HTTP 403 Forbidden`.
- Client and employee UI components never render other participants' IDs or global user directories.

### B. Server-Side DTO Sanitization
- Even if a client inspects raw HTTP network payloads in Chrome DevTools, participant endpoints strictly omit:
  - Participant real names
  - Participant email addresses
  - Participant phone numbers
  - Database primary keys of other users
  - Unapproved `HELD_FOR_REVIEW` or `REJECTED` messages sent by the other party.
- Only the project-specific `alias` and `role` are ever returned.

### C. Cross-Project Alias Discrepancy
- The data model maps aliases to `ProjectMembership` rather than `User`.
- User Marcus Sterling is configured as **Client Alpha** in Project Apollo, but as **Enterprise Advisor C** in Project Borealis, preventing cross-project correlation.

### D. Idempotent Message Approval
- The admin approval endpoint (`/api/admin/flags/[id]/action`) enforces idempotency:
  - If a message has already been released and marked `DELIVERED`, retrying approval does not create duplicate deliveries or trigger double notifications.

---

## 3. Known Limitations & Threat Model Disclosures

1. **Content-Based Identity Disclosure**:
   - While the portal strips metadata (headers, user profile info, account details), automated moderation cannot catch every subtle contextual clue written directly inside message prose (e.g., *"As discussed in our meeting at the Chicago HQ last week..."*).
   - This boundary is explicitly disclosed in the mandatory chat notice and documentation.

2. **False Positives & False Negatives in Moderation**:
   - Heuristic rules for commercial discussions (e.g. `$2,500` or `discount`) may trigger on legitimate technical terminology (e.g. `100% discount on cache invalidation` or `pricing algorithm logic`).
   - Hence, the system adheres to the core review principle: **A flag requests human supervisor review; it does not establish wrongdoing**. Admins can dismiss false positives in one click.

3. **Data Purge Capability**:
   - Demo records can be completely reset or wiped cleanly at any time by running `node scripts/seed.mjs`.
