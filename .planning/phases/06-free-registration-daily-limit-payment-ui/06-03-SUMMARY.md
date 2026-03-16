---
phase: 06-free-registration-daily-limit-payment-ui
plan: "03"
subsystem: auth-ui
tags: [registration, auth, routing, react, tdd]
dependency_graph:
  requires: ["06-01"]
  provides: ["RegisterPage component", "register() function", "/register route"]
  affects: ["App.tsx routing", "LoginPage.tsx"]
tech_stack:
  added: []
  patterns: ["lazy import + Suspense for route-based code splitting", "pushState + PopStateEvent for SPA navigation from outside router"]
key_files:
  created:
    - components/RegisterPage.tsx
    - components/__tests__/RegisterPage.test.tsx
  modified:
    - lib/auth.ts
    - components/LoginPage.tsx
    - App.tsx
decisions:
  - "Use window.dispatchEvent(new PopStateEvent('popstate')) from LoginPage to trigger App's popstate listener — LoginPage has no navigate prop"
  - "Wrap RegisterPage in Suspense in the !user guard since it uses lazy() — prevents Suspense boundary error"
  - "register() uses authFetch (not raw fetch) to match existing auth.ts pattern and keep API_BASE centralized in lib/api.ts"
metrics:
  duration: "~8min"
  completed_date: "2026-03-16"
  tasks_completed: 2
  files_modified: 5
---

# Phase 06 Plan 03: Registration UI Summary

Self-registration UI with RegisterPage component, register() API function, and route-aware unauthenticated guard in App.tsx — users can now register at /register and auto-login on success.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | register() in lib/auth.ts + RegisterPage component (TDD) | 3c0851a |
| 2 | Wire /register route in App.tsx + LoginPage register link | 5ce553c |

## What Was Built

### components/RegisterPage.tsx (new)
- 3-field form: Email, Password, Confirm Password
- Client-side validation: password >= 8 chars, passwords must match — fires before API call
- Loading state disables submit button with "Dang dang ky..." text
- Error display uses same red box style as LoginPage
- "Da co tai khoan? Dang nhap" link calls `onGoToLogin` prop
- Props: `{ onRegisterSuccess: () => void; onGoToLogin: () => void }`

### lib/auth.ts (modified)
- Added `register(email, password, confirmPassword): Promise<void>` — POSTs to /api/auth/register, saves JWT token via setToken()

### App.tsx (modified)
- Added lazy import for RegisterPage
- Unauthenticated guard is now route-aware: `/register` -> RegisterPage (with Suspense), all others -> LoginPage
- onRegisterSuccess callback: getMe(), setUser(), navigate('/'), load API key from account

### components/LoginPage.tsx (modified)
- Bottom section now has "Chua co tai khoan? Dang ky mien phi" button
- Uses `window.history.pushState + dispatchEvent(new PopStateEvent('popstate'))` to trigger App's route state update

## Deviations from Plan

None — plan executed exactly as written.

## Tests

- 7 unit tests written for RegisterPage (all passing)
- LoginPage existing 4 tests still passing
- Integration quota tests fail due to missing DB connection (pre-existing, unrelated to this plan)

## Self-Check

Files exist:
- components/RegisterPage.tsx: FOUND
- lib/auth.ts (register export): FOUND
- components/__tests__/RegisterPage.test.tsx: FOUND

Commits exist:
- 3c0851a: FOUND (feat(06-03): register() function and RegisterPage component)
- 5ce553c: FOUND (feat(06-03): wire /register route in App.tsx)

## Self-Check: PASSED
