---
phase: 06-free-registration-daily-limit-payment-ui
plan: "02"
subsystem: backend-quota
tags: [quota, free-tier, rate-limiting, atomic-upsert, express]
dependency_graph:
  requires: [06-01 (daily_conversion_usage table)]
  provides: [GET /api/quota, POST /api/transcriptions quota enforcement]
  affects: [server/routes/quota.ts, server/routes/transcriptions.ts, server/index.ts]
tech_stack:
  added: []
  patterns: [atomic UPSERT increment-then-check, CURRENT_DATE AT TIME ZONE 'UTC' for UTC date boundary]
key_files:
  created:
    - server/routes/quota.ts
    - tests/integration/quota.test.ts
    - tests/integration/transcriptionQuota.test.ts
  modified:
    - server/routes/transcriptions.ts
    - server/index.ts
decisions:
  - "Atomic UPSERT increment-then-check with undo-decrement on 429 — prevents race condition, keeps count accurate"
  - "CURRENT_DATE AT TIME ZONE 'UTC' in SQL only — date boundary never computed in JS"
  - "Undo-decrement (not rollback) on over-limit: avoids transaction complexity, acceptable edge case per plan spec"
metrics:
  duration: "~4 min"
  completed_date: "2026-03-16"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 2
---

# Phase 06 Plan 02: Quota Enforcement API Summary

Atomic quota enforcement for free-tier users: GET /api/quota badge endpoint + POST /api/transcriptions UPSERT-then-check pattern with 429 gate and undo-decrement for accurate counts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | GET /api/quota endpoint (TDD) | 9d8f17e | server/routes/quota.ts |
| 2 | Mount quota router + atomic quota enforcement in transcriptions | 027f738 | server/index.ts, server/routes/transcriptions.ts |

## What Was Built

**GET /api/quota (`server/routes/quota.ts`):**
- Requires auth via `requireAuth` middleware
- For role !== 'free': returns `{ role, unlimited: true }`
- For role === 'free': queries `daily_conversion_usage` for today's count using `CURRENT_DATE AT TIME ZONE 'UTC'`
- Returns `{ role: 'free', used, limit: 1, remaining: Math.max(0, 1 - used) }`
- No-row case handled: `used` defaults to 0, `remaining` defaults to 1

**POST /api/transcriptions quota enforcement (`server/routes/transcriptions.ts`):**
- For `role === 'free'`: runs atomic UPSERT before transcription INSERT
- UPSERT: `INSERT ... ON CONFLICT DO UPDATE SET count = count + 1 RETURNING count`
- If `count > FREE_DAILY_LIMIT (1)`: undo-decrement + return 429 with `{ error, quota: { used, limit, remaining: 0 }, upgradeRequired: true }`
- If `count <= limit`: proceed with transcription INSERT, return 201
- Non-free users (role === 'user' or 'admin'): skip quota check entirely

**Quota router mount (`server/index.ts`):**
- Import `quotaRouter` from `./routes/quota`
- Mounted at `/api/quota` before the health endpoint

**Integration Tests:**
- `tests/integration/quota.test.ts`: 6 tests covering table existence, UPSERT mechanics, UNIQUE constraint, and quota check logic
- `tests/integration/transcriptionQuota.test.ts`: 4 tests covering the increment-then-check pattern, 429 trigger, undo-decrement, and non-free user isolation

## Deviations from Plan

None — plan executed exactly as written. The atomic UPSERT with undo-decrement on 429 matches the plan spec precisely.

## Self-Check: PASSED

Files verified:
- server/routes/quota.ts: FOUND
- server/routes/transcriptions.ts: FOUND (modified)
- server/index.ts: FOUND (modified)
- tests/integration/quota.test.ts: FOUND
- tests/integration/transcriptionQuota.test.ts: FOUND

Commits verified:
- 0993dec: test(06-02) RED phase — quota integration tests
- 9d8f17e: feat(06-02) GREEN — quota.ts endpoint
- 152c3e2: test(06-02) RED phase — transcription quota tests
- 027f738: feat(06-02) GREEN — transcriptions.ts + index.ts

TypeScript: `npx tsc --noEmit` PASSED
