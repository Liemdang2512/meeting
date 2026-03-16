---
phase: 06-free-registration-daily-limit-payment-ui
plan: "05"
subsystem: pricing-ui
tags: [pricing, payment-demo, modal, routing, tdd]
dependency_graph:
  requires:
    - "06-01 (QuotaUpgradeModal with navigate('/pricing') link)"
  provides:
    - "/pricing route (PricingPage component)"
    - "UpgradeModal payment demo flow (form → processing → success)"
    - "Nâng cấp navbar tab"
  affects:
    - "App.tsx (lazy import, route, navbar tab)"
tech_stack:
  added: []
  patterns:
    - "PaymentStep state machine (form | processing | success)"
    - "Lazy-loaded route page with user.role prop"
    - "TDD: RED stubs → GREEN implementation"
key_files:
  created:
    - features/pricing/PricingPage.tsx
    - features/pricing/UpgradeModal.tsx
  modified:
    - App.tsx
    - components/__tests__/PricingPage.test.tsx
    - components/__tests__/UpgradeModal.test.tsx
decisions:
  - "vi.useFakeTimers() with act(async () => { fireEvent.click() }) needed before checking processing state — findByText polls with real timers and times out"
  - "vi.runAllTimers() inside act() to advance 2s setTimeout for success state assertion"
  - "Free plan CTA disabled via plan.ctaAction === 'current' || isCurrent — always disabled for free plan regardless of role"
metrics:
  duration: "7min"
  completed_date: "2026-03-16T11:03:50Z"
  tasks_completed: 2
  files_changed: 5
---

# Phase 06 Plan 05: Pricing Page and Upgrade Modal Summary

**One-liner:** 3-plan pricing page (Free/Pro/Enterprise) and demo payment modal (form → 2s spinner → success) wired into App.tsx as `/pricing` route with navbar tab.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | PricingPage with 3 plan cards + UpgradeModal payment demo (TDD) | fdbb213 | features/pricing/PricingPage.tsx, features/pricing/UpgradeModal.tsx, 2 test files |
| 2 | Wire /pricing route and "Nâng cấp" navbar tab in App.tsx | a97340f | App.tsx |

## What Was Built

### PricingPage (`features/pricing/PricingPage.tsx`)
- 3-plan grid: Free (0 VND/mo), Pro (199.000 VND/mo), Enterprise (contact)
- `currentUserRole` prop determines which plan shows "Gói hiện tại" (disabled)
- Free plan always disabled (ctaAction: 'current')
- Pro card highlighted with indigo border and "Phổ biến nhất" badge
- Pro CTA "Nâng cấp ngay" opens UpgradeModal via `showUpgradeModal` state
- Enterprise CTA "Liên hệ" opens `mailto:contact@meetingassistant.app`
- Responsive: 1 col mobile, 3 cols lg

### UpgradeModal (`features/pricing/UpgradeModal.tsx`)
- Payment state machine: `PaymentStep = 'form' | 'processing' | 'success'`
- Form: card number (formatted with spaces), expiry (MM/YY), CVV (max 3 digits)
- Processing: 2-second `setTimeout` → spinner + "Đang xử lý..."
- Success: checkmark + "Thanh toán thành công!" + demo message + "Đóng"
- No real API calls or Stripe integration

### App.tsx changes
- `PricingPage` lazy import added
- `isPricingRoute = route === '/pricing'`
- "Nâng cấp" navbar tab (all logged-in users, active state on /pricing)
- `{isPricingRoute && <PricingPage currentUserRole={user?.role} />}` inside Suspense

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed fake timer test for processing/success states**
- **Found during:** Task 1 (TDD GREEN verification)
- **Issue:** `screen.findByText()` uses real timers internally (polling), times out when `vi.useFakeTimers()` active
- **Fix:** Replaced `findByText` with `act(async () => { fireEvent.click() })` followed by `getByText`, and used `vi.runAllTimers()` inside `act()` for 2s advancement
- **Files modified:** components/__tests__/UpgradeModal.test.tsx
- **Commit:** fdbb213

## Self-Check: PASSED

- FOUND: features/pricing/PricingPage.tsx
- FOUND: features/pricing/UpgradeModal.tsx
- FOUND: commit fdbb213 (feat Task 1)
- FOUND: commit a97340f (feat Task 2)
