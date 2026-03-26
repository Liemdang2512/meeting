---
phase: 09-ui-revamp-website-va-giao-dien-tung-nhom-tinh-nang
plan: "03"
subsystem: workflow-form-components
tags: [forms, ui-components, landing-page, reporter, officer, workflow]
dependency_graph:
  requires: [09-01]
  provides: [ReporterInfoForm, OfficerInfoForm, MeetingLandingPage]
  affects: [09-04, 09-05, 09-06]
tech_stack:
  added: []
  patterns: [controlled-form, auto-save-useEffect, participant-management, card-grid-navigation]
key_files:
  created:
    - features/workflows/reporter/ReporterInfoForm.tsx
    - features/workflows/officer/OfficerInfoForm.tsx
    - components/MeetingLandingPage.tsx
  modified:
    - features/minutes/types.ts (brought in from 09-01: ReporterInfo, OfficerInfo, SpecialistInfo)
    - features/minutes/storage.ts (brought in from 09-01: saveReporterDraft, saveOfficerDraft)
    - features/workflows/reporter/reporterPrompt.ts (brought in from 09-01)
    - features/workflows/officer/officerPrompt.ts (brought in from 09-01)
    - features/workflows/specialist/specialistPrompt.ts (brought in from 09-01)
decisions:
  - "MeetingLandingPage defines local MeetingLandingUser interface with workflowGroups?: string[] — avoids coupling to AuthUser which lacks that field in this worktree"
  - "OfficerInfoForm duplicates participant management logic (addParticipant/updateParticipant/removeParticipant) per D-04 independence rule — no cross-form coupling"
  - "ReporterInfoForm interviewTitle spans full md:col-span-2 per UI-SPEC layout spec"
  - "No language selector on MeetingLandingPage per plan decision — each workflow page manages its own audioLanguage"
metrics:
  duration: "2min"
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_changed: 3
---

# Phase 09 Plan 03: Form Components and MeetingLandingPage Summary

**One-liner:** ReporterInfoForm (5-field D-05 form), OfficerInfoForm (6-field D-07 form with participant management), and MeetingLandingPage (filtered workflow group card selector) — all using UI-SPEC blue palette and typography.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ReporterInfoForm and OfficerInfoForm components | 9df346e | features/workflows/reporter/ReporterInfoForm.tsx, features/workflows/officer/OfficerInfoForm.tsx |
| 2 | Create MeetingLandingPage with workflow group cards | fb313a9 | components/MeetingLandingPage.tsx |

## What Was Built

### Task 1: ReporterInfoForm and OfficerInfoForm

**features/workflows/reporter/ReporterInfoForm.tsx** — Controlled form component:
- Props: `{ value: ReporterInfo; onChange: (next: ReporterInfo) => void; onContinue: () => void; onSkip: () => void; }`
- 5 fields per D-05: interviewTitle (full-width), guestName, reporter, datetime (datetime-local), location
- `grid-cols-1 md:grid-cols-2 gap-4` layout, interviewTitle `md:col-span-2`
- Auto-save: `useEffect(() => { saveReporterDraft(value); }, [value])`
- Heading: "Thông tin phỏng vấn", CTA: "Tiếp tục tạo bài", Skip: "Bỏ qua"
- Button colors: `bg-[#1E3A8A] hover:bg-[#1E40AF]`

**features/workflows/officer/OfficerInfoForm.tsx** — Controlled form with participant management:
- Props: `{ value: OfficerInfo; onChange: (next: OfficerInfo) => void; onContinue: () => void; onSkip: () => void; }`
- 5 text/datetime fields per D-07: title (full-width), presiding, courtSecretary, datetime, location
- Participant management section: add/update/remove with ROLE_OPTIONS, name/title/role per participant
- Self-contained: `createId()`, `ROLE_OPTIONS`, and all participant handlers duplicated (no import from MeetingInfoForm)
- Auto-save: `useEffect(() => { saveOfficerDraft(value); }, [value])`
- Heading: "Thông tin vụ án", CTA: "Tiếp tục tạo hồ sơ"

### Task 2: MeetingLandingPage

**components/MeetingLandingPage.tsx** — Workflow group selection page:
- Props: `{ user: MeetingLandingUser; navigate: (path: string) => void; }`
- Local `WORKFLOW_CARDS` constant (reporter/specialist/officer) — no import from App.tsx
- Filter: `WORKFLOW_CARDS.filter(c => user.workflowGroups?.includes(c.group))`
- Grid: `grid-cols-1 md:grid-cols-3 gap-4` with accessible `<button>` elements
- Card hover: `hover:border-[#1E40AF] hover:shadow-sm`
- Empty state: "Bạn chưa được phân vào nhóm nào. Liên hệ quản trị viên để được hỗ trợ."
- Navigate: `navigate('/' + card.group)` on click

## Verification

- `npx tsc --noEmit` — no errors in any newly created files
- All acceptance criteria verified via grep checks

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree missing Plan 01 type/storage files**
- **Found during:** Task 1 setup
- **Issue:** The parallel worktree didn't have ReporterInfo/OfficerInfo types or saveReporterDraft/saveOfficerDraft from Plan 01 (different worktree branch)
- **Fix:** Cherry-picked Plan 01 production files (types.ts, storage.ts, prompt files) from worktree-agent-a94c1b5f using `git checkout`
- **Files modified:** features/minutes/types.ts, features/minutes/storage.ts, plus prompt files
- **Commit:** Included in 9df346e

**2. [Rule 2 - Missing] AuthUser lacks workflowGroups in this worktree**
- **Found during:** Task 2 setup
- **Issue:** lib/auth.ts AuthUser doesn't have workflowGroups in this worktree branch
- **Fix:** Defined local `MeetingLandingUser` interface in MeetingLandingPage.tsx with `workflowGroups?: string[]` — avoids type coupling, safe when consumed by App.tsx which will cast
- **Files modified:** components/MeetingLandingPage.tsx
- **Commit:** fb313a9

## Known Stubs

None. All 3 components are fully implemented with real field bindings, auto-save, and navigation. Downstream plans (09-04, 09-05, 09-06) will wire these into ReporterWorkflowPage, SpecialistWorkflowPage, and OfficerWorkflowPage.

## Self-Check: PASSED

Files created:
- features/workflows/reporter/ReporterInfoForm.tsx — FOUND
- features/workflows/officer/OfficerInfoForm.tsx — FOUND
- components/MeetingLandingPage.tsx — FOUND

Commits:
- 9df346e feat(09-03): create ReporterInfoForm and OfficerInfoForm components
- fb313a9 feat(09-03): create MeetingLandingPage with filtered workflow group cards
