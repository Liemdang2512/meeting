---
phase: 06-free-registration-daily-limit-payment-ui
verified: 2026-03-18T09:55:00Z
status: gaps_found
score: 10/12 must-haves verified
re_verification: false
gaps:
  - truth: "Free users see a quota badge in the navbar showing 'Hôm nay: X/1 lượt'"
    status: failed
    reason: "QuotaBadge renders 'lần' but the spec (CONTEXT.md), plan-04 truth, and all unit tests expect 'lượt'. Three QuotaBadge unit tests fail at runtime."
    artifacts:
      - path: "features/pricing/QuotaBadge.tsx"
        issue: "Line 60: renders 'lần', must be 'lượt' to match CONTEXT.md spec and passing test suite"
    missing:
      - "Change 'lần' to 'lượt' on line 60 of features/pricing/QuotaBadge.tsx"
  - truth: "AUTH-02 requirement is accounted for"
    status: failed
    reason: "The phase verification request lists AUTH-02 as a required ID for this phase, but AUTH-02 appears in zero plan frontmatter files and has no coverage in any artifact. No plan in phase 06 claims it."
    artifacts: []
    missing:
      - "Determine if AUTH-02 belongs to this phase. If yes, identify which plan should claim it and implement it. If it belongs to a different phase, update the requirement mapping."
human_verification:
  - test: "Register flow end-to-end"
    expected: "Navigating to /register before login shows the form. Submitting valid credentials auto-logs in and redirects to '/'."
    why_human: "Route redirect and localStorage JWT behavior cannot be verified via grep"
  - test: "Quota badge updates after transcription"
    expected: "After a free user completes one transcription, the badge changes from '0/1 lượt' (green) to '1/1 lượt' (amber) without page reload"
    why_human: "Real-time DOM update triggered by window event requires live browser"
  - test: "QuotaUpgradeModal appears on 429"
    expected: "When a free user attempts a second transcription on the same UTC day, the QuotaUpgradeModal opens. 'Xem các gói nâng cấp' navigates to /pricing."
    why_human: "429 flow and modal trigger require live API + browser"
  - test: "UpgradeModal payment demo"
    expected: "Filling card number/expiry/CVV and clicking 'Thanh toán' shows 2-second spinner then 'Thanh toán thành công!' with the demo message"
    why_human: "State machine animation timing requires browser"
  - test: "Rate limiter on /register"
    expected: "After 5 registration attempts from the same IP in one hour, the 6th returns a 429 with 'Quá nhiều yêu cầu đăng ký' message"
    why_human: "IP-based rate limit cannot be verified by code scanning"
---

# Phase 06: Free Registration + Daily Limit + Payment UI — Verification Report

**Phase Goal:** Free registration, daily quota enforcement (1 conversion/day for free users), and payment/pricing UI.
**Verified:** 2026-03-18T09:55:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A new user can register with email + password and receive a JWT with role='free' | VERIFIED | `server/routes/auth.ts` POST /register wraps user+profile inserts in `sql.begin()`, assigns role='free', returns 201 with JWT |
| 2 | Duplicate email registration returns 409 | VERIFIED | `auth.ts:72-75` — duplicate check throws err.statusCode=409, caught and returned as 409 |
| 3 | Password shorter than 8 characters is rejected (API level) | VERIFIED | `auth.ts:55` — Zod `z.string().min(8, ...)`, returns 400 on failure |
| 4 | Login with profile-less account defaults to role='free' | VERIFIED | `auth.ts:37` — `profile?.role ?? 'free'` (bug fixed) |
| 5 | Admin can set role='free' via PUT /api/admin/users/:id | VERIFIED | `admin.ts:112` — role array includes 'free' (extended to 'free','pro','enterprise','admin') |
| 6 | daily_conversion_usage table migration exists | VERIFIED | `db/migrations/006_add_free_tier.sql` — idempotent CREATE TABLE IF NOT EXISTS with UNIQUE constraint and index |
| 7 | GET /api/quota returns { role, unlimited: true } for non-free users | VERIFIED | `server/routes/quota.ts:12-14` — branches on role !== 'free' |
| 8 | GET /api/quota returns { role:'free', used, limit, remaining } for free users | VERIFIED | `server/routes/quota.ts:20-31` — queries daily_conversion_usage, returns correct shape |
| 9 | POST /api/transcriptions returns 429 with upgradeRequired for exhausted free users | VERIFIED | `server/routes/transcriptions.ts:45-49` — atomic UPSERT+check+undo pattern, correct 429 body |
| 10 | Free users see a quota badge in the navbar showing 'Hôm nay: X/1 lượt' | FAILED | `features/pricing/QuotaBadge.tsx:60` renders 'lần' instead of 'lượt' — 3 unit tests fail |
| 11 | /pricing shows 3 plan cards (Free, Pro, Enterprise) with payment modal | VERIFIED | `features/pricing/PricingPage.tsx` + `UpgradeModal.tsx` — complete state machine (form/processing/success), all unit tests pass |
| 12 | AUTH-02 requirement is covered | FAILED | AUTH-02 is not claimed by any plan in phase 06 and no implementation evidence exists |

**Score:** 10/12 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `db/migrations/006_add_free_tier.sql` | DB migration for daily_conversion_usage | VERIFIED | Exists, 15 lines, idempotent CREATE TABLE IF NOT EXISTS |
| `server/routes/auth.ts` | POST /register + login bug fix | VERIFIED | register endpoint, rate limiter, Zod schema, sql.begin() transaction, role='free' fix |
| `server/routes/admin.ts` | 'free' in role validation | VERIFIED | Lines 59, 112 include 'free' (plus pro, enterprise) |
| `server/routes/quota.ts` | GET /api/quota endpoint | VERIFIED | Reads profiles.daily_limit + daily_conversion_usage, CURRENT_DATE AT TIME ZONE 'UTC' |
| `server/routes/transcriptions.ts` | Atomic quota UPSERT + 429 guard | VERIFIED | UPSERT-then-check, undo-decrement, upgradeRequired in 429 response |
| `server/index.ts` | Mounts /api/quota | VERIFIED | Line 28 — `app.use('/api/quota', quotaRouter)` |
| `components/RegisterPage.tsx` | Self-registration form UI | VERIFIED | 3 fields, client-side validation, loading state, error display, onRegisterSuccess/onGoToLogin props |
| `lib/auth.ts` | register() function | VERIFIED | Line 64-75 — POSTs to /auth/register, saves token via setToken() |
| `components/LoginPage.tsx` | 'Đăng ký miễn phí' link | VERIFIED | Line 106, 111 — pushState to /register + "Chưa có tài khoản? Đăng ký miễn phí" |
| `App.tsx` | /register route + /pricing route + quota wiring | VERIFIED | RegisterPage lazy, isPricingRoute, QuotaBadge in navbar, QuotaUpgradeModal, 429 handler, quota-updated dispatch |
| `features/pricing/QuotaBadge.tsx` | Quota display for navbar | STUB | Exists and fetches correctly, but renders 'lần' instead of 'lượt' — text mismatch with spec |
| `features/pricing/QuotaUpgradeModal.tsx` | Modal on quota exhaustion | VERIFIED | Correct props, dismiss works, "Xem các gói nâng cấp" wired |
| `features/pricing/PricingPage.tsx` | 3-plan pricing page | VERIFIED | Free/Pro/Enterprise cards, currentUserRole prop, showUpgradeModal state |
| `features/pricing/UpgradeModal.tsx` | Demo payment modal | VERIFIED | form/processing/success state machine, 2s setTimeout, reset on close |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `server/routes/auth.ts POST /register` | `auth.users + public.profiles` | `sql.begin()` transaction | WIRED | Line 70 — tx parameter, atomic insert |
| `server/routes/auth.ts login line 37` | role fallback | `profile?.role ?? 'free'` | WIRED | Bug fix confirmed at line 37 |
| `server/routes/transcriptions.ts POST /` | `public.daily_conversion_usage` | atomic UPSERT-then-check | WIRED | Lines 27-50 — INSERT ON CONFLICT + undo decrement |
| `server/routes/quota.ts` | `public.daily_conversion_usage` | `CURRENT_DATE AT TIME ZONE 'UTC'` | WIRED | Lines 20-24 — date boundary in SQL only |
| `server/index.ts` | `/api/quota` router | `app.use('/api/quota', quotaRouter)` | WIRED | Line 28 |
| `features/pricing/QuotaBadge.tsx` | `GET /api/quota` | `authFetch('/quota')` in useCallback | WIRED | Lines 19-32 — fetchQuota with authFetch |
| `App.tsx 429 handler` | `QuotaUpgradeModal` | `setShowQuotaModal(true)` on upgradeRequired | WIRED | Lines 445-448 |
| `App.tsx navbar` | `QuotaBadge` | render with onQuotaExhausted prop | WIRED | Lines 837-839 |
| `features/pricing/PricingPage.tsx` | `features/pricing/UpgradeModal.tsx` | `useState showUpgradeModal`, isOpen prop | WIRED | Lines 72, 163-166 |
| `App.tsx navbar` | `/pricing route` | `navigate('/pricing')` button | WIRED | Lines 875-878 |

---

## Requirements Coverage

The user's prompt specified these requirement IDs for this phase:
`REG-01, UI-01, UI-02, UI-03, QUOTA-01, QUOTA-02, QUOTA-03, AUTH-02`

The plans collectively declare:
`REG-01, REG-02, REG-03, REG-04, UI-01, UI-02, UI-03, UI-04, QUOTA-01, QUOTA-02, QUOTA-03, QUOTA-04`

| Requirement | Source Plan | Description (from research) | Status | Evidence |
|-------------|------------|----------------------------|--------|----------|
| REG-01 | 06-00, 06-01, 06-03 | POST /register creates free user | SATISFIED | auth.ts POST /register, RegisterPage component |
| REG-02 | 06-01 | Duplicate email returns 409 | SATISFIED | auth.ts:72-75 duplicate check |
| REG-03 | 06-01 | Weak password rejected (< 8 chars) | SATISFIED | Zod min(8) at auth.ts:55 + client-side in RegisterPage |
| REG-04 | 06-01 | Rate limiter blocks after 5 attempts/IP/hour | SATISFIED | registerLimiter at auth.ts:45-51 |
| UI-01 | 06-00, 06-05 | PricingPage renders Free and Pro plans | SATISFIED | PricingPage.tsx with 3 cards, unit tests pass |
| UI-02 | 06-00, 06-05 | UpgradeModal shows processing then success | SATISFIED | UpgradeModal.tsx state machine, unit tests pass |
| UI-03 | 06-00, 06-04 | QuotaBadge shows correct remaining count | PARTIAL | Component logic correct; text uses 'lần' not 'lượt' — 3 unit tests fail |
| UI-04 | 06-03 | RegisterPage form validates and submits | SATISFIED | RegisterPage.tsx, all 7 RegisterPage unit tests pass |
| QUOTA-01 | 06-02 | Free user blocked after 1 conversion/day | SATISFIED | transcriptions.ts 429 guard |
| QUOTA-02 | 06-02 | Admin/user role bypasses quota | SATISFIED | transcriptions.ts role === 'free' guard — only free users hit check |
| QUOTA-03 | 06-02 | Quota resets on next UTC day | SATISFIED | Date boundary in SQL CURRENT_DATE AT TIME ZONE 'UTC' |
| QUOTA-04 | 06-02, 06-04 | GET /api/quota returns correct remaining | SATISFIED | quota.ts endpoint verified |
| AUTH-02 | NOT CLAIMED | Not defined in any phase 06 plan | ORPHANED | AUTH-02 appears in the phase verification request but is claimed by no plan and no artifact provides it |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `features/pricing/QuotaBadge.tsx` | 60 | Renders 'lần' not 'lượt' | Blocker | 3 unit tests fail; badge text diverges from spec |
| `server/routes/admin.ts` | 59, 112 | Role array 'free','pro','enterprise','admin' (plan specified 'free','user','admin') | Warning | Intentional deviation — expanded role set is functionally superior; no functional regression |

---

## Human Verification Required

### 1. Register Flow End-to-End

**Test:** Open the app in a browser, navigate to `/register`, fill in email + password + confirm password, submit.
**Expected:** User is auto-logged in and redirected to `/` (the main app), no extra verification step.
**Why human:** Route redirect after localStorage token save cannot be verified by grep.

### 2. Quota Badge Update After Transcription

**Test:** Log in as a free user (or register). Check navbar badge shows "Hôm nay: 0/1 lượt" (green). Upload and process one file. Check badge again.
**Expected:** Badge updates to "Hôm nay: 1/1 lượt" (amber) without page reload, triggered by the `quota-updated` event.
**Why human:** Real-time DOM update driven by a window event requires a live browser.

### 3. QuotaUpgradeModal on Exhausted Quota

**Test:** As a free user who has already done one conversion today, upload another file.
**Expected:** The QuotaUpgradeModal appears. "Xem các gói nâng cấp" navigates to `/pricing`. "Đóng" dismisses without navigating.
**Why human:** Requires live API returning 429 with upgradeRequired.

### 4. UpgradeModal Payment Demo Flow

**Test:** Go to `/pricing`, click "Nâng cấp ngay" on the Pro card. Fill in any card number / expiry / CVV. Click "Thanh toán".
**Expected:** Spinner shows for ~2 seconds, then "Thanh toán thành công!" with the demo message "Tính năng đang phát triển...". Clicking "Đóng" resets to the form.
**Why human:** Animated state machine timing requires browser rendering.

### 5. Rate Limiter on POST /register

**Test:** Attempt to register 6 times from the same IP within one hour.
**Expected:** First 5 attempts process normally. The 6th returns an error: "Quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau 1 giờ."
**Why human:** IP-based rate limiting cannot be verified by static code analysis.

---

## Gaps Summary

**Two gaps block full goal achievement:**

**Gap 1 (Blocker — UI-03): QuotaBadge text mismatch.**
`features/pricing/QuotaBadge.tsx` line 60 renders "lần" instead of "lượt". The CONTEXT.md specification explicitly states the badge should display "Hôm nay: 0/1 lượt". The unit test suite (6 test assertions) expects "lượt". Three tests are currently failing. This is a one-character fix (`lần` → `lượt`) but it makes the test suite red and diverges from the agreed spec.

**Gap 2 (Orphaned requirement — AUTH-02): No coverage.**
The phase verification request includes AUTH-02 as a required ID, but AUTH-02 does not appear in any of the 6 plan frontmatter files (06-00 through 06-05), is not referenced in RESEARCH.md or CONTEXT.md, and has no implementation artifact. It is either: (a) a requirement that should have been assigned to this phase but was missed in planning, or (b) a requirement belonging to a different phase and incorrectly listed here. This must be resolved before the phase can be marked complete.

---

_Verified: 2026-03-18T09:55:00Z_
_Verifier: Claude (gsd-verifier)_
