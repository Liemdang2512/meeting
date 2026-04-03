---
phase: 10-payment-gateway
plan: 02
subsystem: payments
tags: [vnpay, express, postgres, hmac, tdd, cache-invalidation]

# Dependency graph
requires:
  - phase: 10-01
    provides: invalidateProfileCache, paymentsRouter, payment_orders table, payment_webhook_events table
provides:
  - vnpayRouter with POST /create, GET /return, POST /ipn
  - vnpay npm package installed
  - Both paymentsRouter and vnpayRouter registered in server/index.ts
affects: [10-04-frontend-payment]

# Tech tracking
tech-stack:
  added: [vnpay@2.4.4]
  patterns: [HashAlgorithm enum import for type-safe config, ReturnQueryFromVNPay cast for req.query, atomic sql.begin() transaction for role upgrade + order completion]

key-files:
  created:
    - server/routes/payments/vnpay.ts
    - server/routes/__tests__/vnpay.test.ts
  modified:
    - server/index.ts
    - package.json
    - package-lock.json

key-decisions:
  - "Used HashAlgorithm.SHA512 enum from vnpay package instead of string literal — required for TypeScript compliance"
  - "Cast req.query as unknown as ReturnQueryFromVNPay for verifyReturnUrl/verifyIpnCall — vnpay requires typed query object but Express req.query is ParsedQs"
  - "IPN logs webhook to payment_webhook_events BEFORE processing — audit trail must never be blocked by processing errors"
  - "Return handler does NOT upgrade role — IPN is the sole authoritative path for role upgrades"
  - "RspCode 99 (unknown error) returned on unexpected IPN exceptions — VNPay retries on non-00/02 codes"

requirements-completed: [PAY-VNPAY]

# Metrics
duration: ~5min
completed: 2026-04-03
---

# Phase 10 Plan 02: VNPay Payment Gateway Summary

**VNPay router with create/return/IPN handlers, HMAC verification, atomic role upgrade, profile cache invalidation, and idempotency guard — registered in server/index.ts**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-03T10:12:00Z
- **Completed:** 2026-04-03T10:16:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Installed `vnpay` npm package (v2.4.4) — provides typed HMAC signing/verification via VNPay SDK
- Created `server/routes/payments/vnpay.ts` with three handlers:
  - `POST /create` — inserts pending order into payment_orders and returns signed VNPay payment URL
  - `GET /return` — browser redirect handler; verifies signature and redirects to `/payment/result?status=success|failed`
  - `POST /ipn` — authoritative role upgrade: logs raw payload to payment_webhook_events, verifies HMAC (97), guards idempotency (02), checks order (01), verifies amount (04), atomically updates payment_orders + profiles in sql.begin() transaction, then invalidates profile cache
- Registered both `paymentsRouter` (from 10-01) and `vnpayRouter` in `server/index.ts`

## Task Commits

1. **Task 1 RED — Failing tests** - `4386ce6` (test)
2. **Task 1 GREEN — VNPay implementation** - `a02c130` (feat)
3. **Task 2 — Register routers** - `6bc5ea6` (feat)

## Files Created/Modified

- `server/routes/payments/vnpay.ts` — vnpayRouter with POST /create, GET /return, POST /ipn
- `server/routes/__tests__/vnpay.test.ts` — 5 unit tests (orderId format, IPN idempotency, amount verification)
- `server/index.ts` — imports and registers paymentsRouter + vnpayRouter
- `package.json` — added vnpay dependency
- `package-lock.json` — updated lock file

## Decisions Made

- Used `HashAlgorithm.SHA512` enum (not string `'SHA512'`) — TypeScript strict mode required the enum import from vnpay
- Cast `req.query as unknown as ReturnQueryFromVNPay` — Express types `ParsedQs` is not directly assignable to vnpay's query type; double-cast is the safe pattern
- IPN logging happens before signature verification — ensures audit trail even for invalid/spoofed calls
- `RspCode: '99'` on unknown exceptions — signals VNPay to retry rather than silently dropping

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed HashAlgorithm type error**
- **Found during:** Task 1 (TypeScript compilation check)
- **Issue:** Plan template used string literal `'SHA512'` but vnpay TypeScript types require `HashAlgorithm.SHA512` enum value
- **Fix:** Added `import { VNPay, HashAlgorithm } from 'vnpay'` and changed `hashAlgorithm: 'SHA512'` to `hashAlgorithm: HashAlgorithm.SHA512`
- **Files modified:** server/routes/payments/vnpay.ts
- **Committed in:** a02c130

**2. [Rule 1 - Bug] Fixed ReturnQueryFromVNPay type cast**
- **Found during:** Task 1 (TypeScript compilation check)
- **Issue:** Plan template cast `req.query as Record<string, string>` but vnpay types require `ReturnQueryFromVNPay` which mandates `vnp_OrderInfo` and `vnp_TxnRef` fields
- **Fix:** Added `import type { ReturnQueryFromVNPay } from 'vnpay'` and changed casts to `req.query as unknown as ReturnQueryFromVNPay`
- **Files modified:** server/routes/payments/vnpay.ts
- **Committed in:** a02c130

**3. [Rule 1 - Bug] Fixed test TypeScript narrowing error**
- **Found during:** Task 1 (TypeScript compilation check)
- **Issue:** `const orderStatus = 'pending'` infers literal type `'pending'`, making `=== 'completed'` comparison always-false TypeScript error
- **Fix:** Changed to `const orderStatus: string = 'pending'` to allow the comparison
- **Files modified:** server/routes/__tests__/vnpay.test.ts
- **Committed in:** a02c130

**Total deviations:** 3 auto-fixed (all TypeScript type errors from plan template using informal types)
**Impact on plan:** No logic changes — only type annotations adjusted for strict TypeScript. All plan success criteria met.

## Known Stubs

None — all handlers are fully wired. The create/return/IPN endpoints perform real DB operations and real HMAC verification.

Note: VNPay env vars (`VNPAY_TMN_CODE`, `VNPAY_SECURE_SECRET`, `APP_URL`) must be configured before use in production. These are documented in `.env.example`.

## Self-Check: PASSED

- server/routes/payments/vnpay.ts: FOUND
- server/routes/__tests__/vnpay.test.ts: FOUND
- server/index.ts (modified): FOUND
- Commit 4386ce6: FOUND
- Commit a02c130: FOUND
- Commit 6bc5ea6: FOUND
- `npx tsc --noEmit`: PASSED
- Unit tests (5/5): PASSED
