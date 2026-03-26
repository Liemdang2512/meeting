---
phase: 09-ui-revamp-website-va-giao-dien-tung-nhom-tinh-nang
plan: "01"
subsystem: workflow-data-contracts
tags: [types, storage, prompts, tdd, foundation]
dependency_graph:
  requires: []
  provides: [ReporterInfo, OfficerInfo, SpecialistInfo, storage-discriminator, prompt-builders]
  affects: [09-02, 09-03, 09-04, 09-05, 09-06, 09-07, 09-08]
tech_stack:
  added: []
  patterns: [_type-discriminator-localStorage, TDD-RED-GREEN, thin-wrapper-prompt]
key_files:
  created:
    - features/workflows/reporter/reporterPrompt.ts
    - features/workflows/officer/officerPrompt.ts
    - features/workflows/specialist/specialistPrompt.ts
    - features/workflows/reporter/reporterPrompt.test.ts
    - features/workflows/officer/officerPrompt.test.ts
  modified:
    - features/minutes/types.ts
    - features/minutes/storage.ts
    - features/minutes/storage.test.ts
decisions:
  - "Single DRAFT_KEY mom_meeting_info_v1 used for all workflow groups — _type discriminator guards cross-group reads"
  - "loadMeetingInfoDraft accepts legacy data (no _type) and _type=specialist — backward compatible"
  - "buildSpecialistPrompt is thin wrapper over buildMinutesCustomPrompt — DRY, no logic duplication"
  - "ReporterInfo and OfficerInfo do not extend MeetingInfo — clean separation per D-08"
metrics:
  duration: "3min"
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_changed: 8
---

# Phase 09 Plan 01: Data Contracts, Storage, and Prompt Builders Summary

**One-liner:** TypeScript types (ReporterInfo, OfficerInfo, SpecialistInfo), localStorage _type-discriminated draft functions, and 3 AI prompt builders for reporter/officer/specialist workflow groups.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Define types + storage with _type discriminator | 5856a5e | features/minutes/types.ts, features/minutes/storage.ts |
| 2 | Create prompt builders for all 3 workflow groups | ae77935 | features/workflows/reporter/reporterPrompt.ts, features/workflows/officer/officerPrompt.ts, features/workflows/specialist/specialistPrompt.ts |

## What Was Built

### Task 1: Types and Storage

**features/minutes/types.ts** — Added 3 new exported types:
- `ReporterInfo`: interviewTitle, guestName, reporter, datetime, location (all strings)
- `OfficerInfo`: title, presiding, courtSecretary, participants (MeetingParticipant[]), datetime, location
- `SpecialistInfo = MeetingInfo` (alias, zero duplication)

**features/minutes/storage.ts** — Per-group localStorage functions with `_type` discriminator:
- `saveMeetingInfoDraft` now writes `_type: 'specialist'` alongside data (strips recipientEmails as before)
- `loadMeetingInfoDraft` cross-group guard: rejects non-specialist `_type`, accepts legacy (no `_type`) for backward compat
- `saveReporterDraft(info)` / `loadReporterDraft()` — `_type: 'reporter'`
- `saveOfficerDraft(info)` / `loadOfficerDraft()` — `_type: 'officer'`
- `clearDraft()` — alias for clearMeetingInfoDraft

All 23 storage tests pass (TDD GREEN).

### Task 2: Prompt Builders

**features/workflows/reporter/reporterPrompt.ts** — `buildReporterPrompt({info, templatePrompt})`:
- Header: "BÀI PHỎNG VẤN/BÁO CHÍ"
- JSON block with ReporterInfo fields (null for empty)
- Ends verbatim with templatePrompt

**features/workflows/officer/officerPrompt.ts** — `buildOfficerPrompt({info, templatePrompt})`:
- Header: "BIÊN BẢN PHIÊN TOÀ/HỒ SƠ PHÁP LÝ"
- JSON block with OfficerInfo fields (participants filtered by non-empty name)
- Ends verbatim with templatePrompt

**features/workflows/specialist/specialistPrompt.ts** — `buildSpecialistPrompt({info, templatePrompt})`:
- Thin wrapper: delegates to `buildMinutesCustomPrompt`

All 13 prompt tests pass (TDD GREEN).

## Verification

- `npx vitest run features/minutes/storage.test.ts` — 23/23 passed
- `npx vitest run features/workflows/reporter/reporterPrompt.test.ts` — 6/6 passed
- `npx vitest run features/workflows/officer/officerPrompt.test.ts` — 7/7 passed

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All exports are fully implemented. Downstream plans (09-02 through 09-08) will wire these to form components and workflow pages.

## Self-Check: PASSED

Files created/modified:
- features/minutes/types.ts — FOUND (grep -q "export interface ReporterInfo" confirms)
- features/minutes/storage.ts — FOUND (saveReporterDraft, loadOfficerDraft exports confirmed)
- features/workflows/reporter/reporterPrompt.ts — FOUND
- features/workflows/officer/officerPrompt.ts — FOUND
- features/workflows/specialist/specialistPrompt.ts — FOUND

Commits:
- 2112a44 test(09-01): add failing tests for storage _type discriminator
- 5856a5e feat(09-01): add ReporterInfo, OfficerInfo, SpecialistInfo types and per-group storage functions
- d8ae16b test(09-01): add failing tests for reporter and officer prompt builders
- ae77935 feat(09-01): add reporter, officer, and specialist prompt builders
