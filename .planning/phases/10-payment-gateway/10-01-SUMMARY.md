---
phase: 10-payment-gateway
plan: 01
subsystem: payments
tags: [postgres, express, jwt, vnpay, momo, cache-invalidation]

# Dependency graph
requires:
  - phase: server-auth
    provides: profileCache, requireAuth, signToken, COOKIE_OPTIONS, FREE_FEATURES
provides:
  - payment_orders and payment_webhook_events DB tables (migration 013)
  - exported invalidateProfileCache(userId) from server/auth.ts
  - paymentsRouter with POST /api/payments/check-upgrade endpoint
  - payment gateway env vars documented in .env.example
affects: [10-02-vnpay, 10-03-momo, 10-04-frontend-payment]

# Tech tracking
tech-stack:
  added: []
  patterns: [direct handler invocation for tests (no supertest), cache invalidation before DB re-fetch]

key-files:
  created:
    - db/migrations/013_add_payment_tables.sql
    - server/routes/payments/index.ts
    - server/routes/__tests__/payments.test.ts
  modified:
    - server/auth.ts
    - .env.example

key-decisions:
  - "Used text PRIMARY KEY for payment_orders.id to support gateway-prefixed IDs (ORD_, MOMO_)"
  - "payment_webhook_events.order_id is NOT a foreign key — allows logging even for unknown/invalid order IDs"
  - "Adapted test file to use direct handler invocation pattern instead of supertest (not installed in project)"
  - "invalidateProfileCache placed before requireAuth in auth.ts for logical grouping with cache functions"

patterns-established:
  - "Pattern: cache invalidation before DB re-fetch — invalidateProfileCache then sql query for fresh data"
  - "Pattern: payments router sub-directory (server/routes/payments/) for payment sub-routes"

requirements-completed: [PAY-01, PAY-INFRA]

# Metrics
duration: 15min
completed: 2026-04-02
---

# Phase 10 Plan 01: Payment Infrastructure Foundation Summary

**DB migration for payment_orders/payment_webhook_events tables, exported profileCache invalidation, and POST /api/payments/check-upgrade endpoint that issues fresh JWT after payment success**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-02T17:14:00Z
- **Completed:** 2026-04-02T17:16:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created idempotent migration 013 with payment_orders and payment_webhook_events tables plus 5 indexes
- Exported invalidateProfileCache(userId) from server/auth.ts enabling IPN handlers to clear stale cache
- Created paymentsRouter with POST /check-upgrade that clears cache, re-fetches DB role, and issues fresh JWT cookie
- Documented all 6 payment gateway env vars (VNPAY_TMN_CODE, VNPAY_SECURE_SECRET, MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY, APP_URL) in .env.example

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration** - `f4bb066` (feat)
2. **Task 2 RED: Failing tests** - `2cafd6e` (test)
3. **Task 2 GREEN: Implementation** - `ebd970d` (feat)

**Plan metadata:** (docs commit below)

_Note: TDD task had RED then GREEN commits per TDD execution flow_

## Files Created/Modified
- `db/migrations/013_add_payment_tables.sql` - payment_orders and payment_webhook_events tables with 5 indexes
- `server/auth.ts` - Added exported invalidateProfileCache(userId: string): void
- `server/routes/payments/index.ts` - paymentsRouter with POST /check-upgrade handler
- `server/routes/__tests__/payments.test.ts` - 4 unit tests for cache invalidation and check-upgrade (all pass)
- `.env.example` - Appended VNPAY, MOMO, and APP_URL env vars

## Decisions Made
- Used `text PRIMARY KEY` for payment_orders.id to support gateway-prefixed IDs like `ORD_1712345678_abcd` and `MOMO_...`
- payment_webhook_events.order_id is intentionally NOT a foreign key — allows logging inbound IPNs even if the order_id is unknown or invalid (audit log must never fail silently)
- Adapted test file to use direct handler invocation pattern (consistent with email.test.ts) instead of supertest, which is not installed in the project

## Deviations from Plan

**1. [Rule 3 - Blocking] Replaced supertest with direct handler invocation in tests**
- **Found during:** Task 2 (writing test file)
- **Issue:** Plan's test template used `import request from 'supertest'` — supertest is not in package.json and not installed
- **Fix:** Rewrote tests using the project's existing pattern (createMockRes(), getRouteHandler()) from email.test.ts — tests the same behaviors (401 without auth, 200 with fresh role) without supertest
- **Files modified:** server/routes/__tests__/payments.test.ts
- **Verification:** All 4 tests pass
- **Committed in:** ebd970d (Task 2 implementation commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing dependency)
**Impact on plan:** Required adaptation to match project conventions. All plan success criteria met.

## Issues Encountered
- supertest not available — adapted to project's established test pattern. No impact on test coverage.

## User Setup Required
**Payment gateways require external configuration before use.**

Environment variables to add to your `.env` file (see `.env.example` for all values):
- `VNPAY_TMN_CODE` and `VNPAY_SECURE_SECRET` — from VNPay merchant dashboard
- `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY` — from MoMo Business dashboard
- `APP_URL` — public HTTPS URL of your app (required for payment return/IPN callbacks)

These are only needed when implementing the actual payment flows in plans 10-02 (VNPay) and 10-03 (MoMo).

## Known Stubs
None — this plan is infrastructure-only. The check-upgrade endpoint is fully wired (reads DB, issues JWT). No placeholder data.

## Next Phase Readiness
- All foundation artifacts ready for 10-02 (VNPay IPN handler) and 10-03 (MoMo IPN handler)
- server/index.ts still needs `app.use('/api/payments', paymentsRouter)` — this is explicitly deferred to 10-02 per plan frontmatter
- DB migration must be run against production DB before payment flows go live

---
*Phase: 10-payment-gateway*
*Completed: 2026-04-02*
