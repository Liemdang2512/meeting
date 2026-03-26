---
phase: 09-ui-revamp-website-va-giao-dien-tung-nhom-tinh-nang
plan: "04"
subsystem: reporter-workflow-page
tags: [reporter, workflow, transcription, summarization, ui, 4-step-wizard]
dependency_graph:
  requires: [09-01, 09-02, 09-03]
  provides: [ReporterWorkflowPage (complete)]
  affects: [09-06]
tech_stack:
  added: []
  patterns: [self-contained-workflow, step-wizard, parallel-file-transcription, collapsible-prompt-editor]
key_files:
  created: []
  modified:
    - features/workflows/reporter/ReporterWorkflowPage.tsx (placeholder replaced with full 4-step wizard, 385 lines)
    - App.tsx (added navigate/user props to ReporterWorkflowPage call site)
decisions:
  - "App.tsx pre-wired with navigate/user props — required because ReporterWorkflowPage now has typed interface; Plan 06 notes this as its responsibility but the type error demanded fixing now (Rule 1)"
  - "summarizeTranscript loggingContext uses 'minutes-generate' actionType — 'summary' is not in TokenUsageActionType union"
  - "User! non-null assertion in App.tsx for ReporterWorkflowPage user prop — WorkflowGuard guarantees user is authenticated before children render"
metrics:
  duration: "5min"
  completed_date: "2026-03-26"
  tasks_completed: 1
  files_changed: 2
---

# Phase 09 Plan 04: ReporterWorkflowPage Complete Summary

**One-liner:** Full 4-step self-contained reporter workflow — file upload with reporter systemHint transcription, interview info form, and AI interview article summarization with collapsible prompt editor.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build complete ReporterWorkflowPage with 4-step wizard | 209a5a4 | features/workflows/reporter/ReporterWorkflowPage.tsx, App.tsx |

## What Was Built

### Task 1: ReporterWorkflowPage — 4-step wizard

**features/workflows/reporter/ReporterWorkflowPage.tsx** — Complete self-contained workflow (385 lines):

**Props interface:**
```typescript
interface ReporterWorkflowPageProps {
  navigate: (path: string) => void;
  user: AuthUser;
}
```

**Step 1 (Upload):**
- `FileUpload` component with `pendingFiles`/`onAddFiles`/`onRemoveFile`/`fileStatuses` props
- Transcription mode selector: basic (pill) / deep (pill) with visual feedback
- Audio language selector (vi/en/zh/ko/ja/other) with custom input for 'other'
- "Bắt đầu phiên âm" CTA button, disabled when no files

**Step 2 (Transcribing):**
- Transitions immediately on start, runs `transcribeBasic`/`transcribeDeep` with `REPORTER_SYSTEM_HINT`
- `Loader2` spinner from lucide-react (not emoji) per plan spec
- Shows deepProgress step label for deep mode (step N/3)
- Parallel processing via `Promise.all` across multiple files

**Step 3 (Form):**
- Shows transcript preview (scrollable, max-h-48)
- Renders `<ReporterInfoForm>` with `value`/`onChange`/`onContinue`/`onSkip`
- Both onContinue and onSkip advance to step 4

**Step 4 (Result):**
- Collapsible prompt editor toggle ("Tùy chỉnh prompt" / "Ẩn tùy chỉnh prompt")
- "Tổng hợp bài phỏng vấn" button calls `summarizeTranscript` with `buildReporterPrompt({ info, templatePrompt })`
- "Tạo lại" button to regenerate once summary exists
- Summary displayed via `TranscriptionView` (600px height) inline, no navigation (D-15)
- Transcript also shown via `TranscriptionView` while awaiting summarization

**Error handling:** All errors shown as inline `text-red-700` divs, no `window.alert()` calls.

**State management:** Fully self-contained — no App.tsx state dependencies.

## Verification

- `npx tsc --noEmit` — no errors in ReporterWorkflowPage.tsx or App.tsx wiring
- All acceptance criteria verified via grep checks (11/11 passed)
- File is 385 lines (> 150 minimum)
- Placeholder text "đang được phát triển" removed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] App.tsx type error: ReporterWorkflowPage called with no props**
- **Found during:** Task 1 TypeScript check
- **Issue:** My new typed interface `ReporterWorkflowPageProps` caused `TS2739: Type '{}' is missing properties: navigate, user` in App.tsx line 1015
- **Fix:** Added `navigate={navigate} user={user!}` to App.tsx call site; used non-null assertion since WorkflowGuard guarantees user is present
- **Files modified:** App.tsx
- **Commit:** 209a5a4 (same commit as task)

**2. [Rule 1 - Bug] Invalid TokenUsageActionType 'summary'**
- **Found during:** Task 1 TypeScript check
- **Issue:** `'summary'` is not in the `TokenUsageActionType` union; valid values are `'minutes-generate'`, `'transcribe-basic'`, etc.
- **Fix:** Changed summarization loggingContext `actionType` to `'minutes-generate'`
- **Files modified:** features/workflows/reporter/ReporterWorkflowPage.tsx
- **Commit:** 209a5a4

## Known Stubs

None. ReporterWorkflowPage is fully implemented with real transcription, real form integration, real summarization, and TranscriptionView display. No hardcoded empty values flow to UI.

## Self-Check: PASSED

Files modified:
- features/workflows/reporter/ReporterWorkflowPage.tsx — FOUND (385 lines)
- App.tsx — FOUND (prop wiring added)

Commits:
- 209a5a4 feat(09-04): build complete ReporterWorkflowPage 4-step reporter workflow
