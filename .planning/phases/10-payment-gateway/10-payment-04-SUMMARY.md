---
phase: 10-payment-gateway
plan: "04"
subsystem: frontend-payment
tags: [payment, vnpay, momo, gateway, checkout, token-refresh]
dependency_graph:
  requires: [10-01, 10-02, 10-03]
  provides: [checkout-ui, payment-result-page]
  affects: [App.tsx, features/pricing/UpgradeModal.tsx, components/PaymentResultPage.tsx]
tech_stack:
  added: []
  patterns: [lazy-loading, window-location-redirect, token-refresh-on-return]
key_files:
  created:
    - components/PaymentResultPage.tsx
  modified:
    - features/pricing/UpgradeModal.tsx
    - App.tsx
decisions:
  - "UpgradeModal reads token internally via getToken() — no token prop passed from parent"
  - "PaymentResultPage handles both VNPay (?status=success) and MoMo (?resultCode=0) URL params"
  - "/payment/result registered in both authenticated and unauthenticated routing blocks to handle gateway redirect race with auth loading"
metrics:
  duration: 10min
  completed_date: "2026-04-03T03:31:33Z"
  tasks: 2
  files: 3
---

# Phase 10 Plan 04: Frontend Payment Gateway UI Summary

Real gateway selection UI replacing Phase 6 mock card form, plus PaymentResultPage with JWT refresh on return from VNPay/MoMo.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Replace UpgradeModal mock card form with VNPay/MoMo buttons | ad80bbd | features/pricing/UpgradeModal.tsx |
| 2 | Create PaymentResultPage + add /payment/result route | d356bb0 | components/PaymentResultPage.tsx, App.tsx |

## What Was Built

**UpgradeModal (`features/pricing/UpgradeModal.tsx`):**
- Replaced cardNumber/expiry/CVV form with two gateway buttons
- VNPay button with Visa, Mastercard, VNPay QR logos
- MoMo button with MoMo wallet logo
- `handlePay(gateway)` reads token via `getToken()`, calls `POST /api/payments/{gateway}/create`, redirects via `window.location.href`
- Per-button loading spinner; error state on API failure
- Component name and `{ isOpen, onClose }` props unchanged — PricingPage import unaffected

**PaymentResultPage (`components/PaymentResultPage.tsx`):**
- Success UI (green checkmark) and failure UI (red X)
- Parses VNPay `?status=success|failed` and MoMo `?resultCode=0` return URL params
- On success: calls `POST /api/payments/check-upgrade` with Bearer token
- Stores refreshed token via `setToken()` (localStorage key `auth_token`)
- Calls `onTokenRefresh(newUser)` to update app user state
- Auto-redirects to `/` after 5 seconds on success
- Shows amber warning if check-upgrade fails (user can re-login)

**App.tsx:**
- Lazy import: `const PaymentResultPage = lazy(() => import('./components/PaymentResultPage')...)`
- `/payment/result` route registered in unauthenticated block (before LoginPage fallback)
- `/payment/result` route registered in authenticated block (before /profile check)
- Both blocks pass `onTokenRefresh={(newUser) => setUser(newUser)}`

## Deviations from Plan

None — plan executed exactly as written. TypeScript compiles cleanly (`npx tsc --noEmit` passes with zero errors).

## Known Stubs

None — all functionality is wired to real API endpoints (`/api/payments/{gateway}/create` from Plan 10-01/10-02, `/api/payments/check-upgrade` from Plan 10-01).

## Self-Check: PASSED

- `features/pricing/UpgradeModal.tsx` exists and has no card fields
- `components/PaymentResultPage.tsx` exists with check-upgrade, setToken, onTokenRefresh
- `App.tsx` has PaymentResultPage lazy import and 2 route occurrences
- Commits ad80bbd and d356bb0 exist
