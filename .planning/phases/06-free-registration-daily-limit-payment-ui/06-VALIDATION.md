---
phase: 06
slug: free-registration-daily-limit-payment-ui
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-16
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | `vitest.config.ts` (unit) / `vitest.integration.config.ts` (integration) |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm run test:all` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm run test:all`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-00-01 | 00 | 0 | Stub test files | unit | `npm run test:unit` | ✅ W0 | ⬜ pending |
| 06-00-02 | 00 | 0 | Stub test files | unit | `npm run test:unit` | ✅ W0 | ⬜ pending |
| 06-01-01 | 01 | 1 | DB migration | integration | `npm run test:integration` | ✅ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | POST /register endpoint | integration | `npm run test:integration` | ✅ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | Rate limit on /register | integration | `npm run test:integration` | ✅ W0 | ⬜ pending |
| 06-01-04 | 01 | 1 | Auth fallback bug fix | unit | `npm run test:unit` | ✅ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | Quota check middleware | unit | `npm run test:unit` | ✅ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | UPSERT quota increment | integration | `npm run test:integration` | ✅ W0 | ⬜ pending |
| 06-02-03 | 02 | 2 | Quota reset GMT+7 | unit | `npm run test:unit` | ✅ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | RegisterPage renders | unit | `npm run test:unit` | ✅ W0 | ⬜ pending |
| 06-03-02 | 03 | 2 | Quota badge in navbar | unit | `npm run test:unit` | ✅ W0 | ⬜ pending |
| 06-03-03 | 03 | 2 | PricingPage renders | unit | `npm run test:unit` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Plan 06-00 creates the following stub test files (all pending, not failing):

- [x] `components/__tests__/RegisterPage.test.tsx` — stubs for RegisterPage: form renders, validation, callbacks
- [x] `components/__tests__/PricingPage.test.tsx` — stubs for PricingPage: 3 plans render, CTA behavior
- [x] `components/__tests__/UpgradeModal.test.tsx` — stubs for UpgradeModal: demo payment states (form/processing/success)
- [x] `features/pricing/__tests__/QuotaBadge.test.tsx` — stubs for QuotaBadge: shows count / unlimited / quota-updated event

*If integration tests need DB: `npm run db:up` first (Docker)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Payment modal demo flow | Demo UX | Animation timing & visual state hard to automate | Click Upgrade → verify Processing animation → verify success state |
| Quota badge display in header | UI render | Visual layout check | Login as free user → verify badge shows "Hôm nay: 0/1 lượt" |
| Modal hết quota appears | UX flow | Integration of quota + modal trigger | Use 1 conversion as free user → attempt second → verify modal pops up |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (Wave 0 plan 06-00 created, stubs cover all phase UI components)
