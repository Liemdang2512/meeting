---
phase: 11-s-a-giao-th-c-t-nh-ti-n-sau-ng-k-t-i-kho-n-c-s-d-c-nh-s-d-ng-s-tr-tr-c-ti-p-v-o-s-d
plan: 05
subsystem: payments
tags: [wallet, credit-history, ui, pagination, api]
requires:
  - phase: 11-01
    provides: wallet_ledger table schema and event_type taxonomy
  - phase: 11-03
    provides: Wallet balance funded by gateway webhooks
provides:
  - Paginated GET /api/wallet/history endpoint returning wallet_ledger rows per user
  - CreditHistory React component with event labels, amount coloring, and page navigation
  - PricingPage wired to show CreditHistory below wallet balance panel
affects: [pricing-page, wallet-display, credit-history-ui]
tech-stack:
  added: []
  patterns:
    - "Auth-gated paginated ledger query with LIMIT/OFFSET and total COUNT in same handler"
    - "Vietnamese event label map with fallback to raw event_type for unknown values"
    - "Conditional CreditHistory render only when wallet data is loaded (avoids unauthenticated flash)"
key-files:
  created:
    - server/routes/wallet.ts
    - features/pricing/CreditHistory.tsx
  modified:
    - server/index.ts
    - features/pricing/PricingPage.tsx
key-decisions:
  - "CreditHistory renders only when wallet state is non-null — avoids showing empty table to unauthenticated viewers"
  - "PAGE_SIZE fixed at 20 rows to match typical transaction list conventions"
  - "Negative amount_credits displayed with error/red class; positive with primary/green class"
requirements: []
duration: 8min
completed: 2026-04-08
---

# Phase 11 Plan 05: Wallet Credit History API and UI Summary

**Paginated wallet ledger API and Vietnamese-labeled transaction history table wired into PricingPage below the wallet balance panel.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-08T03:14:48Z
- **Completed:** 2026-04-08T03:22:00Z
- **Tasks:** 2 (+ Task 3 checkpoint)
- **Files modified:** 4

## Accomplishments

- Created `server/routes/wallet.ts` with `GET /api/wallet/history` that returns the user's wallet_ledger rows paginated (20 per page) along with pagination metadata.
- Mounted `/api/wallet` router in `server/index.ts`.
- Created `features/pricing/CreditHistory.tsx` with a paginated transaction table, Vietnamese event labels, red/green amount coloring, and previous/next page controls.
- Updated `features/pricing/PricingPage.tsx` to import and render `<CreditHistory />` below the wallet balance section, gated on `wallet` state being non-null.

## Task Commits

Each task was committed atomically:

1. **Task 1: GET /api/wallet/history endpoint + route mount** - `6b4eca1` (feat)
2. **Task 2: CreditHistory component + PricingPage integration** - `2f58201` (feat)

## Files Created/Modified

- `server/routes/wallet.ts` — New auth-gated router with paginated wallet_ledger query.
- `server/index.ts` — Added walletRouter import and `/api/wallet` mount point.
- `features/pricing/CreditHistory.tsx` — New transaction table component with pagination.
- `features/pricing/PricingPage.tsx` — Added CreditHistory import and conditional render below wallet balance.

## Decisions Made

- CreditHistory renders only when wallet state is non-null to prevent empty table flash for unauthenticated users.
- PAGE_SIZE fixed at 20 rows per page.
- Negative `amount_credits` displayed with `text-error` class (red); positive with `text-primary` class (green).
- Event label map includes all six known event_type values from `server/billing/types.ts` with Vietnamese strings; unknown values fall back to the raw event_type string.

## Deviations from Plan

None - plan executed exactly as described in success criteria.

## Auth Gates

None.

## Known Stubs

None found in modified files.

## Issues Encountered

Pre-existing unit test failures in `components/__tests__/PricingPage.test.tsx` and `components/__tests__/UpgradeModal.test.tsx` remain out of scope (logged in phase `deferred-items.md`).

## Self-Check: PASSED

- `server/routes/wallet.ts` — FOUND
- `features/pricing/CreditHistory.tsx` — FOUND
- `server/index.ts` — FOUND (modified)
- `features/pricing/PricingPage.tsx` — FOUND (modified)
- Commit `6b4eca1` — FOUND
- Commit `2f58201` — FOUND
