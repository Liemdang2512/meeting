---
phase: 09-ui-revamp-website-va-giao-dien-tung-nhom-tinh-nang
plan: "06"
subsystem: specialist-workflow
tags: [workflow, specialist, meeting-minutes, transcription, form]
dependency_graph:
  requires: [09-01, 09-02, 09-03]
  provides: [specialist-workflow-complete]
  affects: [App.tsx routing for /specialist]
tech_stack:
  added: []
  patterns:
    - 4-step self-contained workflow pattern (upload, transcribe, form, result)
    - Optional label overrides on MeetingInfoForm for per-group field naming
    - WorkflowStepHeader reusable step indicator component
key_files:
  created:
    - features/workflows/specialist/SpecialistWorkflowPage.tsx
    - features/workflows/specialist/specialistPrompt.ts
    - components/workflows/WorkflowStepHeader.tsx
  modified:
    - features/minutes/components/MeetingInfoForm.tsx
decisions:
  - "Use 'minutes-generate' TokenUsageActionType for summarizeTranscript calls — 'summarize' not in worktree union"
  - "TranscriptionView in worktree only has text prop — pass text only (no userId/mindmap props)"
  - "Optional labels prop on MeetingInfoForm for D-06 field renaming — backward compatible with default labels"
  - "WorkflowStepHeader created in components/workflows/ — does not exist in worktree branch"
metrics:
  duration: "12min"
  completed_date: "2026-03-26"
  tasks: 1
  files: 4
---

# Phase 09 Plan 06: Specialist Workflow Page Summary

**One-liner:** Full 4-step SpecialistWorkflowPage (upload, transcribe, MeetingInfoForm with D-06 label overrides, AI minutes generation) replacing navigate('/meeting') redirect stub.

## What Was Built

Replaced the `SpecialistWorkflowPage` redirect stub with a complete self-contained 4-step workflow:

1. **Step 1 (Upload):** FileUpload component + transcription mode selector (basic/deep) + language selector
2. **Step 2 (Transcription):** Calls transcribeBasic or transcribeDeep with progress indicators for deep mode
3. **Step 3 (Form):** MeetingInfoForm with D-06 label overrides (`companyName` → "Tiêu đề cuộc họp", `companyAddress` → "Địa điểm")
4. **Step 4 (Result):** TranscriptionView showing AI-generated minutes + prompt editor + "Tạo lại" regeneration button

### Supporting Files Created

- **`specialistPrompt.ts`:** `buildSpecialistPrompt` wrapping `buildMinutesCustomPrompt` — matches interface from plan context
- **`WorkflowStepHeader.tsx`:** Reusable step indicator component (1-based, shows checkmarks for completed steps)

### MeetingInfoForm Changes

Added optional `labels` prop:
```typescript
labels?: {
  companyName?: string;
  companyAddress?: string;
};
```
Labels default to "Tên doanh nghiệp" / "Địa chỉ doanh nghiệp" — fully backward compatible.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] WorkflowStepHeader missing from worktree**
- **Found during:** Task 1
- **Issue:** `components/workflows/WorkflowStepHeader.tsx` referenced in plan does not exist in worktree branch (only on main after plan 09-03)
- **Fix:** Created the component from scratch matching the spec in the plan's context section
- **Files modified:** `components/workflows/WorkflowStepHeader.tsx` (created)
- **Commit:** e8f669a

**2. [Rule 1 - Bug] TranscriptionView in worktree has minimal Props interface**
- **Found during:** Task 1
- **Issue:** Worktree `TranscriptionView` only accepts `{ text: string }` — no userId, onMindmapCapture, onMindmapPdfReady
- **Fix:** Pass only `text={summary}` to TranscriptionView (omit props not in this worktree's interface)
- **Files modified:** `features/workflows/specialist/SpecialistWorkflowPage.tsx`
- **Commit:** e8f669a

**3. [Rule 1 - Bug] TokenUsageActionType 'summarize' not in worktree union**
- **Found during:** Task 1
- **Issue:** Plan referenced `'summarize'` as actionType but worktree `TokenUsageActionType` doesn't include it
- **Fix:** Use `'minutes-generate'` (closest semantic match in union)
- **Files modified:** `features/workflows/specialist/SpecialistWorkflowPage.tsx`
- **Commit:** e8f669a

**4. [Rule 1 - Bug] transcribeBasic/transcribeDeep signatures differ from main repo**
- **Found during:** Task 1
- **Issue:** Worktree versions have fewer args — no `systemHint` parameter (D-13 says pass undefined anyway, so functionally identical)
- **Fix:** Call without `systemHint` argument — matches worktree's 5/6-arg signatures
- **Files modified:** `features/workflows/specialist/SpecialistWorkflowPage.tsx`
- **Commit:** e8f669a

### Pre-existing Issues (Out of Scope)

App.tsx has 5 pre-existing TypeScript errors (using TranscriptionView with props that don't exist in this worktree's version). These existed before this plan and are not caused by our changes. Logged to deferred-items scope.

## Self-Check

### Files exist:
- `features/workflows/specialist/SpecialistWorkflowPage.tsx` — FOUND (432 lines)
- `features/workflows/specialist/specialistPrompt.ts` — FOUND
- `components/workflows/WorkflowStepHeader.tsx` — FOUND
- `features/minutes/components/MeetingInfoForm.tsx` — FOUND (labels prop added)

### Commits exist:
- `e8f669a` — feat(09-06): build complete SpecialistWorkflowPage replacing redirect stub

## Self-Check: PASSED
