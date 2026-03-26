---
phase: 09-ui-revamp-website-va-giao-dien-tung-nhom-tinh-nang
plan: 02
subsystem: ui
tags: [react, typescript, gemini, lucide-react, tailwindcss]

# Dependency graph
requires:
  - phase: 09-01
    provides: shared utility hooks and constants for workflow pages
provides:
  - systemHint optional parameter on transcribeBasic and transcribeDeep in geminiService
  - WorkflowStepHeader shared component for 4-step workflow indicator
affects:
  - 09-03 (OfficerWorkflowPage using WorkflowStepHeader)
  - 09-04 (ReporterWorkflowPage using WorkflowStepHeader)
  - 09-05 (SpecialistWorkflowPage using WorkflowStepHeader)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - systemHint appended as NGU CANH BO SUNG suffix to base audio prompt
    - WorkflowStepHeader uses React.Fragment with flex connector lines between steps

key-files:
  created:
    - components/workflows/WorkflowStepHeader.tsx
  modified:
    - services/geminiService.ts

key-decisions:
  - "systemHint added as last parameter (position 6/7) so existing positional callers are unaffected"
  - "transcribeDeep Agent 1 prompt extended via template literal suffix — only raw transcript step gets context hint"
  - "WorkflowStepHeader DEFAULT_STEPS uses proper Vietnamese diacritical labels per UI-SPEC step labels table"

patterns-established:
  - "Per-group transcription context: pass systemHint as optional last arg to transcribeBasic/transcribeDeep"
  - "Step indicator: WorkflowStepHeader with currentStep (1-based) and optional steps override"

requirements-completed: [UI-04, UI-05]

# Metrics
duration: 8min
completed: 2026-03-26
---

# Phase 09 Plan 02: geminiService systemHint + WorkflowStepHeader Summary

**Extended geminiService transcription functions with per-group systemHint context and created shared 4-step WorkflowStepHeader component using brand blue #1E3A8A and Lucide Check icon**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-26T04:03:37Z
- **Completed:** 2026-03-26T04:11:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added optional `systemHint?: string` as last parameter to `transcribeBasic` and `transcribeDeep` — backward-compatible, appended as "NGU CANH BO SUNG" suffix to base audio prompt
- Created `components/workflows/WorkflowStepHeader.tsx` with active/completed/upcoming visual states, brand blue #1E3A8A for active step, and Lucide Check icon for completed steps
- TypeScript compiles clean with 0 new errors in modified files

## Task Commits

Each task was committed atomically:

1. **Task 1: Add optional systemHint parameter to transcribeBasic and transcribeDeep** - `7c75236` (feat)
2. **Task 2: Create shared WorkflowStepHeader component** - `58466b0` (feat)

## Files Created/Modified

- `services/geminiService.ts` - Added systemHint optional param (last position) to both transcribe functions
- `components/workflows/WorkflowStepHeader.tsx` - New shared 4-step indicator component

## Decisions Made

- `systemHint` placed as last parameter (position 6 for transcribeBasic, position 7 for transcribeDeep) to avoid breaking any existing positional callers
- Only Agent 1 of transcribeDeep receives the system hint (raw transcript step) — downstream agents work from the transcript text, not audio
- WorkflowStepHeader DEFAULT_STEPS uses proper Vietnamese diacritical marks as specified in UI-SPEC labels table

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in App.tsx (TranscriptionViewProps.userId) were present before this plan and are out of scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `WorkflowStepHeader` is ready to be imported by all 3 workflow pages (plans 09-03, 09-04, 09-05)
- `systemHint` parameter is ready for workflow page callers to pass group-specific context strings

---
*Phase: 09-ui-revamp-website-va-giao-dien-tung-nhom-tinh-nang*
*Completed: 2026-03-26*
