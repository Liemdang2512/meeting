---
phase: 11
slug: s-a-giao-th-c-t-nh-ti-n-sau-ng-k-t-i-kho-n-c-s-d-c-nh-s-d-ng-s-tr-tr-c-ti-p-v-o-s-d
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts`, `vitest.integration.config.ts` |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm run test:all` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm run test:integration`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | D-04/D-05 | integration | `npm run test:integration -- server/routes/__tests__/billing.integration.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | D-06/D-07 | integration | `npm run test:integration -- server/routes/__tests__/billing.overdraft.integration.test.ts` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 1 | D-08/D-09 | integration | `npm run test:integration -- server/routes/__tests__/billing.migration.integration.test.ts` | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 2 | payment top-up mapping | integration | `npm run test:integration -- server/routes/__tests__/payments.integration.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/routes/__tests__/billing.integration.test.ts` — debit/refund/correlation id scenarios
- [ ] `server/routes/__tests__/billing.overdraft.integration.test.ts` — concurrent debits vs overdraft floor
- [ ] `server/routes/__tests__/billing.migration.integration.test.ts` — legacy sunset authorization
- [ ] `server/routes/__tests__/billing.unit.test.ts` — rate-card and idempotency pure logic

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Payment redirect UX after webhook lag | D-04/D-05 | External gateway callback timing is non-deterministic | Complete one real payment in sandbox, verify UI shows pending then balance updates without duplicate charge |
| Admin migration batch execution | D-08/D-09 | Depends on one-time ops sequencing and stakeholder sign-off | Execute batch on staging with sample users, verify grandfather access expires per assigned timestamp |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
