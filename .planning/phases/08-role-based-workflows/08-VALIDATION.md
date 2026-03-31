---
phase: 8
slug: role-based-workflows
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.18 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm test -- --runInBand` |
| **Full suite command** | `npm test -- --runInBand` |
| **Estimated runtime** | ~30–45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --runInBand`
- **After every plan wave:** Run `npm test -- --runInBand`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | ROLE-02 | integration | `npm test -- migrations --runInBand` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | ROLE-02 | unit | `npm test -- auth --runInBand` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 2 | ROLE-01 | unit | `npm test -- RegisterPage --runInBand` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 2 | ROLE-01 | integration | `npm test -- auth --runInBand` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 3 | ROLE-03/04 | unit | `npm run build` | ✅ | ⬜ pending |
| 08-03-02 | 03 | 3 | ROLE-03/05 | unit | `npm test -- App --runInBand` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 4 | ROLE-05/06 | unit+integration | `npm test -- --runInBand` | ❌ W0 | ⬜ pending |
| 08-04-02 | 04 | 4 | ROLE-06 | manual | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/routes/__tests__/auth.register-workflow.test.ts` — stubs for ROLE-01, ROLE-02
- [ ] `components/__tests__/RegisterPage.test.tsx` — update for multi-select ROLE-01
- [ ] `App.test.tsx` — stubs for WorkflowGuard ROLE-03, ROLE-05
- [ ] `tests/integration/schema.test.ts` — assert `workflow_groups text[]` + `active_workflow_group text` columns exist
- [ ] `server/routes/__tests__/profiles.workflow.test.ts` — stubs for PATCH active-workflow-group

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Group switcher UI hiển thị đúng khi user có >1 nhóm | ROLE-04 | Visual component, cần confirm render conditional | Login với user multi-group, verify switcher visible in header |
| Settings page add/remove nhóm end-to-end | ROLE-06 | Full browser flow | Navigate to /settings, thêm nhóm mới, verify DB + JWT refresh |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
