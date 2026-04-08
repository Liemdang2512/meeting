---
phase: 11-s-a-giao-th-c-t-nh-ti-n-sau-ng-k-t-i-kho-n-c-s-d-c-nh-s-d-ng-s-tr-tr-c-ti-p-v-o-s-d
plan: "04"
subsystem: billing-runtime
tags: [billing, debit, refund, wallet, quota, D-04, D-05, D-06, D-07]
dependency_graph:
  requires: [11-01, 11-02, 11-03]
  provides: [runtime-billing-enforcement, debit-at-start, auto-refund, insufficient-balance-ux]
  affects: [server/billing/billingService.ts, server/routes/gemini.ts, server/routes/quota.ts, features/pricing/QuotaBadge.tsx]
tech_stack:
  added: []
  patterns:
    - "Charge-at-start with correlation ID before AI call"
    - "Compensation refund on downstream failure"
    - "402 INSUFFICIENT_BALANCE response with upgradeRequired flag"
    - "Per-loader schema error isolation in loadWalletSnapshot"
key_files:
  created: []
  modified:
    - server/billing/billingService.ts
    - server/routes/gemini.ts
    - server/routes/quota.ts
    - features/pricing/QuotaBadge.tsx
decisions:
  - "loadWalletSnapshot catches per-loader schema errors (42P01/42703) independently so each loader returns null on missing schema without masking unexpected DB errors"
  - "BillingInsufficientBalanceError carries statusCode=402 and upgradeRequired payload, consumed by route handler to return structured 402 response"
  - "QuotaBadge guards onQuotaExhausted trigger with billingModel !== 'wallet' check to avoid false-positive modal triggers for wallet users"
metrics:
  duration: "30min"
  completed_date: "2026-04-08"
  tasks: 2
  files: 4
---

# Phase 11 Plan 04: Runtime Billing Enforcement and Insufficient-Balance UX Summary

**One-liner:** D-04/D-05/D-07 enforced via charge-at-start billingService wired to /api/gemini/generate with compensation refund and 402 insufficient-balance response.

## Tasks Completed

### Task 1: Implement billing service for debit-at-start and full compensation

Implemented `authorizeAndCharge` and `refundCharge` in `server/billing/billingService.ts`:

- `authorizeAndCharge` runs inside a SQL transaction with `FOR UPDATE` row-level lock
- Legacy access check bypasses debit for users within migration window (D-08/D-09)
- `canDebitWithOverdraftFloor` guards against balance dropping below -10,000 credits (D-07)
- Throws `BillingInsufficientBalanceError` with 402 status and `upgradeRequired: true` payload on floor breach
- Each debit writes an immutable ledger row with a correlation ID
- `refundCharge` uses `correlationId:refund` to prevent duplicate refunds; idempotent on missing-debit and already-refunded states

Integration tests in `server/routes/__tests__/billing.integration.test.ts` cover:
- Success path: debit only, correct ledger row
- Rejection floor: 402 error with upgradeRequired payload
- Refund path: debit + full refund = net zero balance change

**Commits:** `b0fe00c` (RED tests), `56cc050` (GREEN implementation)

### Task 2: Wire billable server routes and frontend insufficient-balance handling

- `server/routes/gemini.ts` calls `authorizeAndCharge` before AI provider call (D-04)
- On downstream failure, `refundCharge` is called automatically in catch block (D-05)
- `BillingInsufficientBalanceError` is caught at route level and returned as `res.status(402).json(payload)`
- `server/routes/quota.ts` replaced daily usage quota with wallet balance payload (`buildWalletQuotaPayload`)
- `features/pricing/QuotaBadge.tsx` renders wallet balance (pill + card variants) for `billingModel='wallet'` responses
- `loadWalletSnapshot` isolates per-loader schema errors so missing `wallet_balances` or `legacy_migration_assignments` tables return safe zero defaults

**Commits:** `a5d04af`, `7101294`, `d3bfbf9`, `7c6b280`, `39c3ca3`, `c30fdf1`, `01a8518`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] loadWalletSnapshot did not catch per-loader schema errors**
- **Found during:** Task 2 execution, quota.test.ts failure
- **Issue:** The `loadWallet()` and `loadLegacyAssignment()` loaders could independently throw `42P01`/`42703` errors, but `loadWalletSnapshot` had no error isolation per-loader. The error bubbled before the route-level fallback could catch it, causing test failure.
- **Fix:** Wrapped each `await loaders.loadX()` call in its own try/catch that checks `isSchemaFallbackError` and returns `null` instead of rethrowing. Unexpected DB errors (other codes) still propagate.
- **Files modified:** `server/routes/quota.ts`
- **Commit:** `01a8518`

### Out-of-scope Pre-existing Test Failures

The following test failures existed before plan 11-04 and are not caused by this plan's changes:

- `components/__tests__/PricingPage.test.tsx` — expects "Nâng cấp lên Pro" text from old credit card UpgradeModal (removed in phase 10-04, commit `ad80bbd`)
- `components/__tests__/UpgradeModal.test.tsx` — expects credit card form fields (removed in phase 10-04 when VietQR was introduced)

These are deferred to a future test-maintenance task.

## Known Stubs

None. All wallet billing UX is wired to live `/api/quota` endpoint data.

## Self-Check

**Files exist:**
- `server/billing/billingService.ts` — exists
- `server/routes/gemini.ts` — exists
- `server/routes/quota.ts` — exists
- `features/pricing/QuotaBadge.tsx` — exists

**Commits exist:**
- `b0fe00c` — test(11-04): add failing runtime billing integration tests
- `56cc050` — feat(11-04): implement debit-at-start billing service with compensation refund
- `a5d04af` — feat(11-04): wire runtime billing enforcement and insufficient-balance UX
- `c30fdf1` — feat(11-04): restore wallet billing enforcement and balance UX
- `01a8518` — fix(11-04): catch per-loader schema errors in loadWalletSnapshot

## Self-Check: PASSED
