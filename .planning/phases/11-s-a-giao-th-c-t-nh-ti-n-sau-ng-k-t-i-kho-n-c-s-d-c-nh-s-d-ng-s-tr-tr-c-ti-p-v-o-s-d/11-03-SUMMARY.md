---
phase: 11-s-a-giao-th-c-t-nh-ti-n-sau-ng-k-t-i-kho-n-c-s-d-c-nh-s-d-ng-s-tr-tr-c-ti-p-v-o-s-d
plan: 03
subsystem: payments
tags: [payments, webhook, wallet-ledger, idempotency, integration-test]
requires:
  - phase: 11-01
    provides: wallet schema, credit pack rate card, append-only ledger rules
  - phase: 11-02
    provides: migration policy and overdraft helpers used by refresh payload
provides:
  - Atomic webhook success handlers for VNPay, MoMo, VietQR that fund credits and unlock workflow groups
  - Payment refresh payload builder that returns wallet and legacy policy context with fresh auth token
  - Integration regression coverage for idempotent topup + wallet refresh payload
affects: [payment-result-flow, pricing, wallet-balance-display, billing-runtime]
tech-stack:
  added: []
  patterns:
    - "Gateway success path uses single SQL transaction for order completion + wallet balance + ledger + workflow unlock"
    - "Idempotency enforced by FOR UPDATE lock on payment_orders and early return on completed status"
    - "check-upgrade response assembled from dedicated payload builder for token refresh consistency"
key-files:
  created: []
  modified:
    - server/routes/payments/vnpay.ts
    - server/routes/payments/momo.ts
    - server/routes/payments/vietqr.ts
    - server/routes/payments/index.ts
    - server/routes/__tests__/payments.integration.test.ts
key-decisions:
  - "VNPay and MoMo create endpoints now persist planId and plan-based amount so webhook funding maps to D-02 credit packs."
  - "Webhook handlers append topup ledger entries with correlation_id=order_id and update wallet_balances in same transaction."
  - "check-upgrade payload includes both top-level wallet fields and wallet object for backward-compatible frontend consumption."
patterns-established:
  - "Gateway helper exports (apply*PaymentSuccess) allow deterministic integration testing without signature/network coupling."
  - "Out-of-scope unit test failures are logged to deferred-items.md instead of patched in plan execution."
requirements-completed: [TBD]
duration: 6min
completed: 2026-04-07
---

# Phase 11 Plan 03: Payment Runtime Wallet Funding Summary

**Gateway callbacks now atomically top up credits, append immutable wallet ledger events, and unlock workflow groups while refresh APIs return wallet and legacy access state immediately after payment.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-07T05:52:21Z
- **Completed:** 2026-04-07T05:58:17Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Implemented atomic success effects for VNPay, MoMo, and VietQR: complete order, top up wallet, append ledger event, unlock workflow.
- Added idempotent webhook processing with row locking and replay-safe short-circuit behavior.
- Extended check-upgrade flow to return wallet balance, overdraft limit, and legacy access timestamp in same refresh roundtrip.
- Expanded integration tests to verify one-time funding under retries and wallet payload presence after successful payment.

## Task Commits

Each task was committed atomically:

1. **Task 1: Update gateway webhook effects to fund credits + unlock workflow** - `02414ea` (test), `34f1d46` (feat)
2. **Task 2: Extend payment refresh endpoint with wallet state payload** - `acf273a` (feat)
3. **Task 3: Expand integration tests for funding idempotency and wallet refresh payload** - `20597b8` (test), `ae518ca` (feat)

_Note: TDD tasks include RED and GREEN commits._

## Files Created/Modified
- `server/routes/payments/vnpay.ts` - Added transactional funding helper and plan-based order creation for VNPay.
- `server/routes/payments/momo.ts` - Added transactional funding helper and plan-based order creation for MoMo.
- `server/routes/payments/vietqr.ts` - Added transactional funding helper and reused it in webhook success path.
- `server/routes/payments/index.ts` - Added `buildCheckUpgradePayload()` and returned wallet/legacy payload in refresh response.
- `server/routes/__tests__/payments.integration.test.ts` - Added idempotent funding + refresh payload integration coverage.

## Decisions Made
- Export gateway success helpers to make integration tests deterministic and avoid gateway signature coupling.
- Use `assigned_at` ordering for `legacy_migration_assignments` when selecting current legacy sunset.
- Preserve existing token contract (`token` + `user`) and add wallet fields as additive response properties.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added plan-aware VNPay/MoMo order creation**
- **Found during:** Task 1 (webhook funding implementation)
- **Issue:** Existing VNPay/MoMo orders persisted non-pack plan metadata, preventing deterministic pack-to-credit mapping.
- **Fix:** Accepted `planId` in create endpoints, persisted plan in `payment_orders`, and used rate-card price by pack.
- **Files modified:** `server/routes/payments/vnpay.ts`, `server/routes/payments/momo.ts`
- **Verification:** `npm run test:integration -- server/routes/__tests__/payments.integration.test.ts`
- **Committed in:** `34f1d46`

**2. [Rule 1 - Bug] Fixed legacy assignment ordering key**
- **Found during:** Task 3 (integration GREEN run)
- **Issue:** Refresh payload query sorted by non-existent `created_at` column in `legacy_migration_assignments`.
- **Fix:** Changed ordering to `assigned_at DESC`.
- **Files modified:** `server/routes/payments/index.ts`
- **Verification:** `npm run test:integration -- server/routes/__tests__/payments.integration.test.ts`
- **Committed in:** `ae518ca`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both fixes were necessary to satisfy correctness and D-03 runtime behavior. No architectural scope expansion.

## Auth Gates
None.

## Known Stubs
None found in modified files.

## Issues Encountered
- `npm run test:unit` fails on pre-existing UI test expectations for updated pricing/upgrade modal copy and structure (`components/__tests__/UpgradeModal.test.tsx`, `components/__tests__/PricingPage.test.tsx`). Logged as out-of-scope in phase `deferred-items.md`.

## User Setup Required
None - no external configuration changes required.

## Next Phase Readiness
- Payment runtime now emits wallet funding effects and replay-safe behavior needed by downstream billing UI flows.
- Plan 11-04 can consume stable refresh payload fields (`balance`, `overdraftLimit`, `legacyAccessUntil`) without extra roundtrips.

## Self-Check: PASSED
- Found summary file at expected phase path.
- Verified commits exist: `02414ea`, `34f1d46`, `acf273a`, `20597b8`, `ae518ca`.
