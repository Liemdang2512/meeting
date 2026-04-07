---
phase: 11-s-a-giao-th-c-t-nh-ti-n-sau-ng-k-t-i-kho-n-c-s-d-c-nh-s-d-ng-s-tr-tr-c-ti-p-v-o-s-d
plan: 01
subsystem: payments
tags: [billing, wallet, ledger, rate-card, migrations, vitest]

requires:
  - phase: 10-payment-gateway
    provides: Payment gateway order/webhook foundation and pricing entry points
provides:
  - Wallet balance snapshot table and append-only wallet ledger with idempotent correlation key
  - Canonical credit pack catalog seeds for specialist/reporter/officer
  - Canonical billing action rate-card seed and typed server-side lookup helpers
affects: [payments, billing-deduction, pricing]

tech-stack:
  added: []
  patterns:
    - Append-only ledger with update/delete protection trigger
    - Typed rate-card helpers as single source of truth for pack/action constants

key-files:
  created:
    - db/migrations/014_wallet_ledger_and_rate_card.sql
    - server/billing/types.ts
    - server/billing/rateCard.ts
    - server/routes/__tests__/billing.unit.test.ts
  modified: []

key-decisions:
  - "Pack IDs specialist/reporter/officer are locked to 299000/399000/499000 anchors."
  - "Billing rate-card starts with explicit minutes-generate debit cost before runtime deductions are wired."
  - "Wallet ledger is append-only and protected from UPDATE/DELETE to preserve auditability."

patterns-established:
  - "Use correlation_id unique index in ledger for idempotent billing events."
  - "Use typed helper lookups to reject unknown action/pack without silent fallback."

requirements-completed: [TBD]
duration: 5min
completed: 2026-04-07
---

# Phase 11 Plan 01: Billing Contract Foundation Summary

**Internal-credit billing contracts are locked with an auditable wallet ledger schema and deterministic typed pack/action pricing lookups.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-07T05:39:15Z
- **Completed:** 2026-04-07T05:44:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added RED tests that codify fixed pack anchors and unknown-action rejection behavior.
- Implemented migration for `wallet_balances`, `wallet_ledger`, `credit_pack_catalog`, and `billing_rate_card` with idempotency guardrails.
- Added shared billing types and deterministic lookup helpers (`getPackPrice`, `getPackCredits`, `getActionCost`) matching seeded DB literals.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define RED tests for billing contracts** - `ed6a4d8` (test)
2. **Task 2: Implement wallet schema and rate-card contracts** - `82bd4de` (feat)

## Files Created/Modified
- `server/routes/__tests__/billing.unit.test.ts` - RED/GREEN contract tests for pricing constants and unknown-action failure.
- `db/migrations/014_wallet_ledger_and_rate_card.sql` - Wallet and rate-card schema + seed data + append-only trigger.
- `server/billing/types.ts` - Shared billing literal unions and constants.
- `server/billing/rateCard.ts` - Typed helper APIs for pack/action lookups.

## Decisions Made
- Chose 1:1 VND-to-credit seed values for canonical packs to preserve price-anchor readability in this contract-lock phase.
- Enforced append-only ledger semantics at DB level via trigger, not just application convention.
- Kept lookup helpers runtime-safe by throwing explicit errors for unknown pack/action identifiers.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Plan verification command `npm run test:unit` failed due pre-existing out-of-scope test failures unrelated to this plan's files. Logged in `deferred-items.md` for this phase directory.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Billing contract foundations are in place for runtime deduction/refund wiring in subsequent plans.
- Known unrelated test-suite failures remain and should be addressed independently of phase 11-01 scope.

---
*Phase: 11-s-a-giao-th-c-t-nh-ti-n-sau-ng-k-t-i-kho-n-c-s-d-c-nh-s-d-ng-s-tr-tr-c-ti-p-v-o-s-d*
*Completed: 2026-04-07*

## Self-Check: PASSED

- Verified required files exist (`11-01-SUMMARY.md`, `014_wallet_ledger_and_rate_card.sql`, `types.ts`, `rateCard.ts`).
- Verified task commits exist (`ed6a4d8`, `82bd4de`).
