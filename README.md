# Craftory Studio — Confidential Communication Portal

> **Enterprise Zero-Leakage Communication Portal**  
> Connects clients and assigned employees through project-specific aliases, with administrator oversight, real-time message moderation, and zero identity leakage.

---

## 🌐 Quick Access URLs & Credentials

- **Local Application URL**: [http://localhost:3000](http://localhost:3000)
- **Health & Readiness Endpoint**: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- **IntelliJ IDEA Project Path**: `C:\Users\user\IdeaProjects\craftory-portal` (also linked to scratch workspace)

### 🔑 Pre-Seeded Test Accounts (Fictional Demo Users)

| Role | Email | Password | Real Name (Admin Only) | Project Apollo Alias | Project Borealis Alias |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **👑 Admin** | `admin@craftory.studio` | `Admin@1234` | Sophia Vance | *Administrator* | *Administrator* |
| **👤 Client 1** | `client1@craftory.studio` | `Client@1234` | Marcus Sterling | **Client Alpha** | **Enterprise Advisor C** |
| **👤 Client 2** | `client2@craftory.studio` | `Client@1234` | Elena Rostova | *None* | **Client Delta** |
| **🚫 Client 3 (Unassigned)** | `client3@craftory.studio` | `Client@1234` | Jordan Blake | *None (IDOR Test)* | *None (IDOR Test)* |
| **🛠️ Employee 1** | `employee1@craftory.studio` | `Employee@1234` | Devon Reed | **Project Specialist Beta** | **Systems Architect Gamma** |

*(Note: Corporate alias emails like `client.apollo@clientcompany.com` and `employee.dev@craftory.studio` continue to work as well).*

---

## 🎯 Architecture & Design Highlights

1. **Light Corporate Visual Aesthetic (NEXORA Theme)**:
   - Built with pure crisp white backgrounds (`#FFFFFF`), light ice-slate card backing (`#F8FAFC`), deep ocean teal accents (`#088395` / `#00889A`), and bold navy typography (`#0F172A`).
   - Pure Light Theme — zero dark mode clashing.

2. **Zero Identity Leakage (Pseudonymous Communication)**:
   - Clients and employees strictly see each other's project-specific aliases.
   - The same person receives **different aliases across different projects** (e.g. Marcus is *Client Alpha* in Project Apollo, but *Enterprise Advisor C* in Project Borealis).
   - Real names, emails, phone numbers, avatars, and last-seen data are stripped on the server side prior to sending API responses to participants.

3. **Multi-Category Server-Side Moderation Engine**:
   - **Contact Sharing**: Phone numbers, emails, social handles, external links -> **Strictly Held for Admin Review** (completely invisible to recipient until approved).
   - **Off-Platform Activity**: Circumvention attempts (WhatsApp, Telegram, outside payments) -> Configurable (Hold or Flag).
   - **Commercial Discussions**: Pricing, discounts, budgets, payment demands -> Configurable (Default: Allow & Flag).
   - **Abuse**: Threatening or offensive keywords -> Held for Review with category & severity.

4. **Administrator Review & Audit Workflow**:
   - Filterable review queue (Status, Category, Severity).
   - Surrounding conversation context inspection.
   - One-click decisions: Approve, Reject, Dismiss false positive, Review notes.
   - **Idempotency**: Retrying approval never delivers duplicate messages.
   - Complete audit trail of all moderation actions and membership changes.

5. **MySQL 8.0 Persistence**:
   - Persisted in local MySQL database `craftory_portal` via Prisma ORM.

---

## 🚀 Setup & Execution Guide

### Prerequisites
- Node.js (v18+ or v24+)
- MySQL Server 8.0 (Service `MySQL80` running on `localhost:3306`)

### 1. Environment Configuration
Copy `.env.example` to `.env`:
```env
DATABASE_URL="mysql://root:23bcon0787@localhost:3306/craftory_portal"
JWT_SECRET="craftory_portal_secret_key_prod_2026_super_confidential"
NODE_ENV="development"
PORT=3000
```

### 2. Install Dependencies & Setup Database
```bash
npm install
npx prisma generate
npx prisma db push
node scripts/seed.mjs
```

### 3. Run Acceptance Test Suite (All 7 Criteria)
```bash
npm run test:acceptance
```
This script executes 24 automated assertions covering all 7 acceptance criteria required in the project brief.

### 4. Start the Application
```bash
# Development Mode:
npm run dev

# Production Mode:
npm run build
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛡️ Privacy Boundaries & Legal Disclosures

- **Pseudonymity vs. Anonymity**: Participants are pseudonymous to one another; Craftory Studio administrators can identify both parties. The platform does NOT claim end-to-end encryption or unconditional anonymity.
- **Message Content Disclosure Risk**: Automated checks catch regex and pattern violations, but clever phrasing or contextual hints can inadvertently disclose identity.
- **Demo Data Purge**: All demo data can be reset or purged at any time by running `node scripts/seed.mjs`.
