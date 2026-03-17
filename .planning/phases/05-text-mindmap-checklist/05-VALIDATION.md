---
phase: 5
slug: text-mindmap-checklist
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-06-01 | 06 | 1 | icon-schema | unit | `npm run test:unit` | ❌ W0 | ⬜ pending |
| 05-06-02 | 06 | 1 | icon-install | build | `npm run build` | ❌ W0 | ⬜ pending |
| 05-06-03 | 06 | 2 | icon-node | unit | `npm run test:unit` | ❌ W0 | ⬜ pending |
| 05-06-04 | 06 | 2 | icon-prompt | unit | `npm run test:unit` | ❌ W0 | ⬜ pending |
| 05-06-05 | 06 | 3 | icon-render | manual | browser smoke test | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `features/mindmap/__tests__/iconSchema.test.ts` — unit tests for iconKey field in Zod schema
- [ ] `features/mindmap/__tests__/MindmapCanvas.iconRender.test.ts` — smoke render test for icon background

*Existing infrastructure covers the framework; only new test stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Icon background renders mờ phía sau label | icon-render | React Flow canvas requires browser | Open /mindmap, paste text, generate → verify icon nền mờ xuất hiện trong mỗi node trừ root |
| Icon fallback hiển thị khi Gemini trả key sai | icon-fallback | Requires mocked Gemini response in browser | Inspect node data với iconKey="nonexistent" → verify Circle/Tag icon hiển thị |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
