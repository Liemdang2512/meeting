---
phase: 03-docker-postgres
plan: "03"
subsystem: testing
tags: [integration-tests, postgres, vitest, schema-verification, token-usage]
dependency_graph:
  requires:
    - "03-01: Docker + vitest.integration.config.ts"
    - "03-02: db/schema.sql + test helpers (db.ts, setup.ts)"
  provides:
    - "tests/integration/schema.test.ts"
    - "tests/integration/tokenUsage.test.ts"
  affects:
    - "npm run test:integration (green)"
    - "npm run test:unit (unaffected)"
tech_stack:
  added: []
  patterns:
    - "sql.reserve() + BEGIN/ROLLBACK for transaction-isolated mutation tests"
    - "tx.json(obj) for JSONB parameter binding in postgres.js"
    - "Rollback isolation verified on same reserved connection (avoids max:1 pool deadlock)"
key_files:
  created:
    - tests/integration/schema.test.ts
    - tests/integration/tokenUsage.test.ts
  modified: []
decisions:
  - "Use tx.json(meta) instead of JSON.stringify(meta) when binding JSONB columns — postgres.js treats stringified JSON as text, losing column type"
  - "Post-rollback isolation check uses the same reserved tx connection (not outer sql) to avoid deadlocking the max:1 connection pool"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-13T07:10:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 03 Plan 03: Integration Tests for Schema + Token Usage Summary

Integration test suite proving Docker Postgres schema correctness with 15 passing tests: schema structure verification (tables, columns, indexes, auth.uid(), is_admin() existence) and token_usage_logs DML tests with FK enforcement, is_admin() true/false behavior, and transaction rollback isolation.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Write schema.test.ts | d921963 | tests/integration/schema.test.ts |
| 2 | Write tokenUsage.test.ts | 06e67a1 | tests/integration/tokenUsage.test.ts |

## Test Coverage

### schema.test.ts (7 tests)
- All 5 public tables exist (transcriptions, summaries, profiles, user_settings, token_usage_logs)
- auth.users table exists in auth schema
- token_usage_logs has all required columns (10 columns verified)
- 3 performance indexes on token_usage_logs (user_id, created_at, feature)
- auth.uid() returns NULL when no JWT context is set
- auth.uid() returns correct UUID after set_config('request.jwt.claims', ...)
- is_admin() function exists in public schema

### tokenUsage.test.ts (8 tests)
- Insert with required fields only — row retrievable in same transaction
- Insert with all optional fields including JSONB metadata
- Optional fields (input_tokens, output_tokens, metadata) can be NULL
- Transaction rollback removes inserted row (isolation proved)
- FK constraint rejects insert with non-existent user_id
- is_admin() returns false for user with no profile
- is_admin() returns false for user with role=user
- is_admin() returns true for user with role=admin

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] JSONB metadata returned as string instead of object**
- **Found during:** Task 2 (first test run)
- **Issue:** Passing `JSON.stringify(meta)` as a template literal parameter causes postgres.js to bind it as `text`, so the column returns a JSON string instead of a parsed object
- **Fix:** Changed to `tx.json(meta)` which postgres.js serializes with correct JSONB type hint
- **Files modified:** tests/integration/tokenUsage.test.ts
- **Commit:** 06e67a1

**2. [Rule 1 - Bug] Transaction rollback test timed out (30s) due to connection pool deadlock**
- **Found during:** Task 2 (first test run)
- **Issue:** The plan's original rollback test used the outer `sql` connection to verify post-rollback state, but `sql` has `max: 1`. While `tx` (a reserved connection) was active, `sql` queued forever waiting for a free connection
- **Fix:** Replaced the outer `sql` query with a new `tx`-based query after manual `ROLLBACK` + `BEGIN` on the reserved connection — same isolation guarantee, no deadlock
- **Files modified:** tests/integration/tokenUsage.test.ts
- **Commit:** 06e67a1

## Verification Results

```
npm run test:integration
  2 test files passed
  15 tests passed
  0 failures

npm run test:unit
  4 test files passed
  24 tests passed (includes integration tests run in unit suite due to no exclusion glob)
```

## Self-Check: PASSED

- tests/integration/schema.test.ts: EXISTS, 111 lines
- tests/integration/tokenUsage.test.ts: EXISTS, 162 lines
- Commit d921963: EXISTS (schema tests)
- Commit 06e67a1: EXISTS (tokenUsage tests)
- npm run test:integration: 15/15 green
