---
phase: 06-visual-diagram
plan: "01"
subsystem: mindmap/diagram
tags: [schema, zod, gemini, react-hook, diagram]
dependency_graph:
  requires: []
  provides:
    - DiagramResponseSchema (features/mindmap/lib/mindmapSchema.ts)
    - useDiagramFromText (features/mindmap/hooks/useDiagramFromText.ts)
  affects:
    - Plan 06-02 (canvas rendering depends on DiagramResponse contract)
tech_stack:
  added: []
  patterns:
    - Zod schema appended below existing schemas without modification
    - useDiagramFromText mirrors useMindmapFromText state machine pattern
    - generateStructured<T> call with DiagramResponseSchema for Gemini JSON validation
key_files:
  created:
    - features/mindmap/hooks/useDiagramFromText.ts
  modified:
    - features/mindmap/lib/mindmapSchema.ts
    - types.ts
    - features/token-usage-admin/labels.ts
decisions:
  - Used 'diagram-generate' as actionType value; required adding it to TokenUsageActionType union and ACTION_LABELS map
metrics:
  duration: "~4 min"
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_changed: 4
---

# Phase 06 Plan 01: Diagram Schema and Hook Summary

**One-liner:** Zod DiagramResponseSchema (hub-spoke/linear layout) + useDiagramFromText hook wiring Gemini to diagram state.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add DiagramResponseSchema to mindmapSchema.ts | 9c57764 | features/mindmap/lib/mindmapSchema.ts |
| 2 | Create useDiagramFromText.ts hook | 3c559f2 | features/mindmap/hooks/useDiagramFromText.ts, types.ts, features/token-usage-admin/labels.ts |

## Key Exports Added

**features/mindmap/lib/mindmapSchema.ts:**
- `DiagramResponseSchema` — validates `{ title, layoutType, nodes[], edges[] }` from Gemini
- `DiagramNode` type — `{ id (max 20 chars), label, subtitle?, description?, iconKey?, role }`
- `DiagramEdge` type — `{ source, target }`
- `DiagramResponse` type — top-level inferred from schema

**features/mindmap/hooks/useDiagramFromText.ts:**
- `useDiagramFromText()` — returns `{ diagram, loading, error, generate, reset }`
- `UseDiagramFromTextResult` interface

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical type] Added 'diagram-generate' to TokenUsageActionType union**
- **Found during:** Task 2 verification
- **Issue:** `TokenLoggingContext.actionType` is typed as `TokenUsageActionType` union literal, which did not include `'diagram-generate'`, causing TS2322 compile error
- **Fix:** Added `'diagram-generate'` to the union in `types.ts` and corresponding label `'Tạo sơ đồ'` in `features/token-usage-admin/labels.ts` (Record<TokenUsageActionType, string> requires exhaustive coverage)
- **Files modified:** types.ts, features/token-usage-admin/labels.ts
- **Commit:** 3c559f2

## Verification

- `npx tsc --noEmit` — 0 errors
- DiagramResponseSchema importable from `features/mindmap/lib/mindmapSchema.ts`
- useDiagramFromText importable from `features/mindmap/hooks/useDiagramFromText.ts`
- Existing ChecklistResponseSchema and MindmapResponseSchema intact (no lines removed)

## Self-Check: PASSED

- `features/mindmap/lib/mindmapSchema.ts` — FOUND
- `features/mindmap/hooks/useDiagramFromText.ts` — FOUND
- Commit 9c57764 — FOUND
- Commit 3c559f2 — FOUND
