---
phase: 9
slug: ui-revamp-website-va-giao-dien-tung-nhom-tinh-nang
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | types | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | MeetingLandingPage | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 9-02-01 | 02 | 2 | ReporterWorkflowPage | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 9-03-01 | 03 | 2 | SpecialistWorkflowPage | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 9-04-01 | 04 | 2 | OfficerWorkflowPage | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `components/__tests__/MeetingLandingPage.test.tsx` — stubs for landing page
- [ ] `features/workflows/reporter/__tests__/ReporterWorkflowPage.test.tsx` — stubs for reporter workflow
- [ ] `features/workflows/officer/__tests__/OfficerWorkflowPage.test.tsx` — stubs for officer workflow

*Existing vitest infrastructure covers the framework — only test stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI summary output for each group | D-10, D-11, D-12 | Requires Gemini API key + real audio | Upload audio, trigger summary per group, verify output format matches group |
| localStorage draft persists on refresh | D-09 | Browser session state | Fill form, refresh, verify data restored |
| Language selector affects transcription | D-13 | Requires real transcription | Select non-VN language, upload audio, verify transcript language |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
