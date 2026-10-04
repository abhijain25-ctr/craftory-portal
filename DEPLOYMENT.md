# Craftory Studio — Deployment & Operations Guide

This guide describes how to deploy, configure, verify, and operate the Confidential Communication Portal in a hosted environment (such as Vercel, Railway, Render, or Docker).

---

## 1. Hosting Architecture Overview

The system is architected as a **Single Full-Stack Service** with a persistent relational database:
- **Application Engine**: Next.js 14 (App Router with server-side routes and API endpoints).
- **Database Engine**: Relational MySQL 8.0+ or PostgreSQL via Prisma ORM.
- **Session Layer**: HTTP-Only Secure JWT cookie (`craftory_session`).
- **Protocols**: Strict HTTPS, TLS 1.3.

---

## 2. Environment Variables Configuration

Set these variables in your hosting provider's dashboard:

| Variable Name | Required | Example Format | Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Yes | `mysql://user:pass@host:3306/craftory_portal` | Database connection string |
| `JWT_SECRET` | Yes | `random_32_character_hex_secret` | Encryption key for session tokens |
| `NODE_ENV` | Yes | `production` | Enables production optimizations and secure cookies |
| `PORT` | Optional | `3000` | Application listening port |

> ⚠️ **Security Mandate**: Never commit credentials to source control. Use your hosting provider's secret manager.

---

## 3. Deployment Steps

### Option A: Railway / Render (Zero-Config Full-Stack)
1. Fork or push repository to GitHub/GitLab.
2. In Railway/Render, create a new project connected to the repository.
3. Provision a **MySQL Database** service and link `DATABASE_URL`.
4. Set Build Command:
   ```bash
   npx prisma generate && npm run build
   ```
5. Set Start Command:
   ```bash
   npx prisma db push && node scripts/seed.mjs && npm start
   ```

### Option B: Vercel + Managed Cloud MySQL (e.g. PlanetScale / Aiven)
1. Import repository to Vercel.
2. Add `DATABASE_URL` and `JWT_SECRET` in Vercel Environment Variables.
3. Deploy. Vercel automatically runs `prisma generate` and builds the Next.js routes.
4. Run migrations/seed from local terminal or CI/CD:
   ```bash
   npx prisma db push
   node scripts/seed.mjs
   ```

---

## 4. Live Readiness Verification

Once deployed, verify the deployment:
1. **Health & Connectivity Probe**:
   Query the public health endpoint:
   ```bash
   curl -i https://your-deployed-domain.com/api/health
   ```
   **Expected Response (HTTP 200)**:
   ```json
   {
     "status": "HEALTHY",
     "service": "Craftory Studio Confidential Communication Portal",
     "database": "CONNECTED",
     "timestamp": "2026-10-04T07:45:10.955Z",
     "version": "1.0.0"
   }
   ```
2. **Access Isolation Verification**:
   Sign in with the unassigned user account (`unassigned.user@external.com` / `Test@1234`). Verify that no project conversations can be accessed.
3. **Session Persistence**:
   Trigger a deployment restart or container recycle, and verify that existing messages and moderation decisions persist.

---

## 5. Recovery & Rollback Plan

If a release fails:
1. **Application Rollback**: Revert deployment to the previous immutable build artifact or Git commit SHA.
2. **Database Recovery**:
   - The database schema additions are non-destructive (additive columns/tables).
   - If demo data becomes tainted during a test cycle, run `node scripts/seed.mjs` to restore pristine demo state without dropping system tables.
