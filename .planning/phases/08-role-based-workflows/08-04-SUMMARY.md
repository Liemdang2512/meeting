---
phase: 08-role-based-workflows
plan: "04"
subsystem: group-switcher-settings
tags: [workflow-groups, group-switcher, settings, frontend, backend, tests]
dependency_graph:
  requires: [08-01, 08-02, 08-03]
  provides: [group-switcher-header, workflow-groups-settings, workflow-groups-backend-crud]
  affects: [features/workflows/GroupSwitcher.tsx, features/settings/WorkflowGroupsSection.tsx, server/routes/profiles.ts, App.tsx]
tech_stack:
  added: []
  patterns: [conditional-render-multi-group, jwt-reissue-on-group-change, add-remove-diff-pattern, lazy-route-settings]
key_files:
  created:
    - features/workflows/GroupSwitcher.tsx
    - features/settings/WorkflowGroupsSection.tsx
    - features/workflows/__tests__/GroupSwitcher.test.tsx
  modified:
    - server/routes/profiles.ts
    - App.tsx
decisions:
  - "GroupSwitcher returns null when workflowGroups.length <= 1 — no rendering overhead for single-group users"
  - "WorkflowGroupsSection computes add/remove diff client-side — minimal payload, backend logic remains authoritative"
  - "Settings /settings route uses window.history.back() for back navigation — compatible with existing PopState pattern"
  - "WorkflowGroupsSection lazy-loaded (separate chunk WorkflowGroupsSection-OR8rRIzF.js) — settings are infrequently accessed"
  - "PATCH /workflow-groups fixes activeWorkflowGroup if removed group was active (Pitfall 3) — server-side safety invariant"
metrics:
  duration: "3min"
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_changed: 5
---

# Phase 08 Plan 04: GroupSwitcher + Settings + Tests Summary

GroupSwitcher header pill-buttons for multi-group users + WorkflowGroupsSection settings page + PATCH /api/profiles/workflow-groups backend endpoint + 3 GroupSwitcher unit tests covering ROLE-06. Human verification pending.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | GroupSwitcher + WorkflowGroupsSection + settings endpoint + App.tsx wiring | fa47b95 | features/workflows/GroupSwitcher.tsx, features/settings/WorkflowGroupsSection.tsx, server/routes/profiles.ts, App.tsx |
| 2 | GroupSwitcher tests + full suite verification (ROLE-06) | 36219e0 | features/workflows/__tests__/GroupSwitcher.test.tsx |

## Verification

- `features/workflows/GroupSwitcher.tsx` exports `GroupSwitcher`, returns null when `workflowGroups.length <= 1`
- GroupSwitcher calls `authFetch('/profiles/active-workflow-group', { method: 'PATCH' ...})` on group switch
- `server/routes/profiles.ts` contains `router.patch('/workflow-groups', ...)` with at-least-1 constraint
- Backend endpoint fixes `activeWorkflowGroup` if removed group was active (Pitfall 3)
- `features/settings/WorkflowGroupsSection.tsx` toggle cards UI, save with add/remove diff
- `App.tsx` renders `GroupSwitcher` conditionally on `user.workflowGroups.length > 1`
- `App.tsx` has `/settings` route branch rendering `WorkflowGroupsSection`
- 3 GroupSwitcher tests GREEN: renders nothing for single-group, renders buttons for multi-group, highlights active
- All 7 workflow feature tests GREEN (WorkflowGuard x4 + GroupSwitcher x3)
- `npm run build` succeeds

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `features/workflows/reporter/ReporterWorkflowPage.tsx` — stub page ("dang duoc phat trien"), carried from Plan 03. Intentional placeholder for future reporter workflow.
- `features/workflows/officer/OfficerWorkflowPage.tsx` — stub page ("dang duoc phat trien"), carried from Plan 03. Intentional placeholder for future officer workflow.

These are pre-existing stubs from Plan 03, not introduced by this plan.

## Self-Check: PASSED
