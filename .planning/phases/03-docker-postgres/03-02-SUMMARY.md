---
phase: 03-docker-postgres
plan: "02"
subsystem: test-infrastructure
tags: [vitest, postgres, integration-tests, node-env]
dependency_graph:
  requires: ["03-01"]
  provides: ["test-client", "db-helpers", "integration-vitest-config"]
  affects: ["03-03"]
tech_stack:
  added: ["postgres@^3.4.8"]
  patterns: ["singleFork via fileParallelism:false", "transaction isolation with ReservedSql", "process.env fallback for test DB URL"]
key_files:
  created:
    - vitest.integration.config.ts
    - tests/integration/helpers/db.ts
    - tests/integration/helpers/setup.ts
  modified:
    - package.json (postgres devDependency added)
decisions:
  - "Used fileParallelism:false instead of poolOptions.forks.singleFork — Vitest 4 removed poolOptions; fileParallelism:false achieves identical serial execution guarantee"
  - "postgres max:1 — with fileParallelism:false all tests run in one process, single connection avoids pool overhead"
metrics:
  duration: "~5 minutes"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
  completed_date: "2026-03-13"
---

# Phase 03 Plan 02: Integration Test Harness (postgres.js + Vitest Node Config) Summary

postgres.js client with createTestUser/setAuthContext/closeDb helpers and Vitest node-env config using fileParallelism:false for serial transaction-safe integration tests.

## What Was Built

Installed postgres npm package and created the shared test infrastructure that integration tests (Wave 3) will use to connect to the Docker PostgreSQL instance.

### Files Created

**vitest.integration.config.ts** — Separate Vitest config for integration tests. Uses `environment: 'node'` (no jsdom), `pool: 'forks'` with `fileParallelism: false` (serial execution), 30s timeout, and `setupFiles` pointing to the global teardown hook.

**tests/integration/helpers/db.ts** — Shared postgres.js client + test utility functions:
- `sql` — single-connection postgres.js client connecting to `process.env.TEST_DATABASE_URL` (fallback: `postgres://postgres:postgres@localhost:5433/meeting_test`)
- `createTestUser(tx, email)` — inserts into `auth.users`, returns UUID string
- `setAuthContext(tx, userId)` — calls `set_config('request.jwt.claims', ...)` so `auth.uid()` returns the test user
- `closeDb()` — calls `sql.end({ timeout: 5 })`, idempotent

**tests/integration/helpers/setup.ts** — Vitest global `afterAll` hook that calls `closeDb()` to prevent process hang after tests complete.

## Decisions Made

### fileParallelism:false instead of poolOptions.forks.singleFork
Vitest 4.0 removed the `poolOptions` config key entirely. The deprecation message in the Vitest source (`poolOptions was removed in Vitest 4`) confirmed this. The equivalent behavior — running all test files in a single process serially — is now achieved with `fileParallelism: false`. TypeScript would have errored on the old config at compile time.

### max: 1 on postgres.js client
With `fileParallelism: false` all tests are serial, so a single connection is sufficient. Avoids connection pool overhead and makes test isolation simpler.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Vitest 4 removed poolOptions API**
- **Found during:** Task 1 (TypeScript check during Task 2 verification)
- **Issue:** The plan specified `poolOptions: { forks: { singleFork: true } }` but Vitest 4 removed `poolOptions` entirely. TypeScript error: `poolOptions does not exist in type InlineConfig`
- **Fix:** Replaced with `fileParallelism: false` at the top-level of the test config, which is the Vitest 4 equivalent
- **Files modified:** vitest.integration.config.ts
- **Commit:** 229aeb0

## Verification Results

- postgres@^3.4.8 installed in devDependencies
- `vitest.integration.config.ts`: environment node, fileParallelism false, pool forks, include tests/integration/**/*.test.ts, setupFiles setup.ts, timeout 30000
- `tests/integration/helpers/db.ts`: exports sql, createTestUser, setAuthContext, closeDb; uses process.env.TEST_DATABASE_URL with fallback
- `tests/integration/helpers/setup.ts`: calls afterAll(closeDb)
- Zero import.meta usage in tests/integration/helpers/
- `npm run test:unit`: 2 test files, 9 tests — all passed (unit tests unaffected)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | d5f5d79 | feat(03-02): install postgres devDep and create vitest integration config |
| 2 | 229aeb0 | feat(03-02): create integration test helpers and fix vitest config for v4 |
