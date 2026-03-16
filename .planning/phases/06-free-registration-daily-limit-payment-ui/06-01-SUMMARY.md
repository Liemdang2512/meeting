---
phase: 06-free-registration-daily-limit-payment-ui
plan: "01"
subsystem: backend-auth
tags: [auth, free-tier, registration, database, admin]
dependency_graph:
  requires: []
  provides: [daily_conversion_usage table, POST /api/auth/register, role='free' support]
  affects: [server/routes/auth.ts, server/routes/admin.ts, db/migrations/]
tech_stack:
  added: [express-rate-limit@8.3.1]
  patterns: [postgres.js sql.begin() transaction, Zod v4 safeParse, express-rate-limit draft-7]
key_files:
  created:
    - db/migrations/006_add_free_tier.sql
  modified:
    - server/routes/auth.ts
    - server/routes/admin.ts
decisions:
  - "Use tx: any cast for postgres.js TransactionSql — TypeScript Omit<> drops call signatures, any is idiomatic workaround"
  - "Zod v4 uses .issues not .errors on ZodError — auto-fixed during Task 2"
  - "Rate limit window: 1 hour (60*60*1000 ms) per CONTEXT.md, not 15min RESEARCH.md example"
metrics:
  duration: "~4 min"
  completed_date: "2026-03-16"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 3
---

# Phase 06 Plan 01: Backend Free-Tier Foundation Summary

Free-tier backend foundation: daily_conversion_usage DB table, self-registration endpoint with rate limiting and atomic transaction, login role-fallback bug fix, and admin role validation extended to support 'free'.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DB migration — daily_conversion_usage table | 3efc816 | db/migrations/006_add_free_tier.sql |
| 2 | POST /api/auth/register + login bug fix | 1db6f77 | server/routes/auth.ts, package.json |
| 3 | Admin role validation extended to include 'free' | fe5f5d9 | server/routes/admin.ts |

## What Was Built

**DB Migration (`db/migrations/006_add_free_tier.sql`):**
- Idempotent `CREATE TABLE IF NOT EXISTS public.daily_conversion_usage`
- Columns: id (uuid PK), user_id (FK to auth.users CASCADE DELETE), usage_date (date DEFAULT CURRENT_DATE UTC), count (integer DEFAULT 0)
- UNIQUE constraint on (user_id, usage_date)
- Index on (user_id, usage_date DESC) for quota-check queries

**Registration Endpoint (`server/routes/auth.ts`):**
- `POST /api/auth/register` with Zod validation (email format, password min 8 chars, confirmPassword match)
- Rate limited: 5 req/IP/hour via express-rate-limit v8 (`standardHeaders: 'draft-7'`)
- Atomic: wraps `auth.users` insert + `public.profiles` insert in `sql.begin()` transaction
- Returns 201 with `{ token, user: { id, email, role: 'free' } }` on success
- Returns 409 on duplicate email, 400 on validation failure

**Login Bug Fix (`server/routes/auth.ts` line 37):**
- Changed `profile?.role ?? 'user'` to `profile?.role ?? 'free'`
- Profile-less logins no longer get unlimited 'user' access

**Admin Role Extension (`server/routes/admin.ts`):**
- Both POST `/admin/users` (line 43) and PUT `/admin/users/:id` (line 96) now accept `['free', 'user', 'admin']`
- Error messages updated to reflect all three valid roles

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 uses `.issues` not `.errors` on ZodError**
- **Found during:** Task 2
- **Issue:** Plan code used `parsed.error.errors[0].message` but Zod v4 renamed the property to `issues`
- **Fix:** Changed to `parsed.error.issues[0].message`
- **Files modified:** server/routes/auth.ts
- **Commit:** 1db6f77

**2. [Rule 1 - Bug] postgres.js TransactionSql loses call signatures via TypeScript Omit<>**
- **Found during:** Task 2
- **Issue:** `sql.begin(async (tx) => { ... await tx\`...\` })` — TypeScript errors because `TransactionSql` extends `Omit<Sql, ...>` which drops call signatures in TypeScript's type system
- **Fix:** Changed `(tx)` to `(tx: any)` — idiomatic workaround for this known postgres.js / TypeScript limitation
- **Files modified:** server/routes/auth.ts
- **Commit:** 1db6f77

## Self-Check

Checking created/modified files exist:
- db/migrations/006_add_free_tier.sql: EXISTS
- server/routes/auth.ts: EXISTS (modified)
- server/routes/admin.ts: EXISTS (modified)

Checking commits exist:
- 3efc816: Task 1 migration
- 1db6f77: Task 2 register + bug fix
- fe5f5d9: Task 3 admin role

TypeScript: `npx tsc --noEmit` PASSED

## Self-Check: PASSED
