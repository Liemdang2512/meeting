---
phase: 11-s-a-giao-th-c-t-nh-ti-n-sau-ng-k-t-i-kho-n-c-s-d-c-nh-s-d-ng-s-tr-tr-c-ti-p-v-o-s-d
plan: 02
subsystem: payments
tags: [billing, migration, overdraft, integration-tests, postgres]
requires:
  - phase: 11-01
    provides: wallet ledger and rate-card baseline used by overdraft tests
provides:
  - Legacy migration batch schema with per-user sunset assignments
  - Deterministic policy helpers for legacy access and overdraft floor checks
  - Integration contracts for D-08/D-09 sunset logic and D-06/D-07 overdraft floor concurrency
affects: [server-routes, billing-engine, payment-policy]
tech-stack:
  added: []
  patterns: [auditable migration assignment tables, pure policy helpers, transaction-locked overdraft invariant tests]
key-files:
  created:
    - db/migrations/015_legacy_migration_policy.sql
    - server/billing/legacyAccessPolicy.ts
    - server/routes/__tests__/billing.migration.integration.test.ts
    - server/routes/__tests__/billing.overdraft.integration.test.ts
  modified:
    - server/routes/__tests__/billing.overdraft.integration.test.ts
key-decisions:
  - "Use legacy_migration_batches + legacy_migration_assignments for per-user sunset auditability (D-08/D-09)."
  - "Centralize overdraft predicate in legacyAccessPolicy helper and reuse it in concurrency integration tests."
  - "Use per-test random user IDs in overdraft integration tests to respect append-only ledger constraints."
patterns-established:
  - "Policy-as-code: isolate business predicates in deterministic helpers before route wiring."
  - "Concurrency contract tests use FOR UPDATE and balance-floor assertions to lock monetary invariants."
requirements-completed: [TBD]
duration: 4min
completed: 2026-04-07
---

# Phase 11 Plan 02: Migration/Overdraft Policy Summary

**Per-user legacy sunset policy and overdraft-floor invariants are now encoded as DB contracts plus executable integration tests.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-07T05:46:50Z
- **Completed:** 2026-04-07T05:50:19Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added migration contract for auditable legacy migration batches and per-user sunset assignments.
- Added `legacyAccessPolicy` helper with deterministic checks for legacy access window and overdraft floor.
- Added integration tests that lock D-08/D-09 (grace window allow + expired deny) and D-06/D-07 (concurrent debit floor) behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RED integration tests for migration sunset and overdraft floor** - `2b8cec9` (test)
2. **Task 2: Implement migration batch schema and legacy access policy helper** - `8f33e01` (feat)

**Plan metadata:** pending (docs commit created after summary/state updates)

## Files Created/Modified
- `db/migrations/015_legacy_migration_policy.sql` - Defines migration batch metadata and user-level sunset assignment schema.
- `server/billing/legacyAccessPolicy.ts` - Exports pure policy functions for legacy access and overdraft predicate checks.
- `server/routes/__tests__/billing.migration.integration.test.ts` - Verifies inside-window allow and after-sunset deny behavior.
- `server/routes/__tests__/billing.overdraft.integration.test.ts` - Verifies concurrent debit floor invariant with transaction locking.

## Decisions Made
- Migration audit trail uses batch table + assignment table keyed by user and batch for explicit D-09 traceability.
- Overdraft floor source of truth is helper constant/function, not duplicated inline formulas.
- Overdraft test data lifecycle avoids deleting append-only ledger rows by using unique per-test users.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Integration DB was unavailable**
- **Found during:** Task 2 verification
- **Issue:** `npm run test:integration` failed with `ECONNREFUSED` on `localhost:5433`.
- **Fix:** Started test DB and reapplied billing migrations (`013`, `014`, `015`) before rerunning tests.
- **Files modified:** None (runtime environment bootstrap only)
- **Verification:** Integration suite passed for both billing policy test files.
- **Committed in:** N/A (no file change)

**2. [Rule 1 - Bug] Overdraft test fixture conflicted with policy and append-only ledger**
- **Found during:** Task 2 verification
- **Issue:** Initial fixture (`-9500`) made both debits invalid; cleanup attempted deletes blocked by append-only trigger.
- **Fix:** Updated overdraft test to use valid starting balance (`-9000`) and unique per-test user IDs/correlation IDs.
- **Files modified:** `server/routes/__tests__/billing.overdraft.integration.test.ts`
- **Verification:** `npm run test:integration -- server/routes/__tests__/billing.migration.integration.test.ts server/routes/__tests__/billing.overdraft.integration.test.ts`
- **Committed in:** `8f33e01`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Deviations were required to produce reliable GREEN verification without changing intended policy scope.

## Issues Encountered
- `npm run test:unit` reports failures in unrelated UI tests (`components/__tests__/UpgradeModal.test.tsx`) from pre-existing workspace changes; not modified in this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Migration/sunset policy and overdraft floor are locked as executable contracts for subsequent billing route wiring.
- Next plans can consume `legacyAccessPolicy` helpers and migration tables directly in auth/billing runtime flow.

## Self-Check: PASSED

- FOUND: `.planning/phases/11-s-a-giao-th-c-t-nh-ti-n-sau-ng-k-t-i-kho-n-c-s-d-c-nh-s-d-ng-s-tr-tr-c-ti-p-v-o-s-d/11-02-SUMMARY.md`
- FOUND: `2b8cec9` task commit
- FOUND: `8f33e01` task commit

---
*Phase: 11-s-a-giao-th-c-t-nh-ti-n-sau-ng-k-t-i-kho-n-c-s-d-c-nh-s-d-ng-s-tr-tr-c-ti-p-v-o-s-d*
*Completed: 2026-04-07*
