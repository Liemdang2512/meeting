---
phase: 08-role-based-workflows
plan: "03"
subsystem: frontend-workflow-ui
tags: [workflow-groups, register-ui, workflow-guard, routing, frontend]
dependency_graph:
  requires: [08-01, 08-02]
  provides: [register-group-selection-ui, workflow-guard, workflow-route-shells, post-login-routing]
  affects: [components/RegisterPage.tsx, App.tsx, features/workflows/WorkflowGuard.tsx]
tech_stack:
  added: []
  patterns: [toggle-card-multi-select, lazy-route-guard, useEffect-redirect, post-login-navigate]
key_files:
  created:
    - features/workflows/WorkflowGuard.tsx
    - features/workflows/reporter/ReporterWorkflowPage.tsx
    - features/workflows/specialist/SpecialistWorkflowPage.tsx
    - features/workflows/officer/OfficerWorkflowPage.tsx
  modified:
    - components/RegisterPage.tsx
    - App.tsx
    - features/workflows/__tests__/WorkflowGuard.test.tsx
    - components/__tests__/RegisterPage.test.tsx
decisions:
  - "WorkflowGuard uses useEffect for imperative navigation + synchronous null-return guard for render"
  - "SpecialistWorkflowPage redirects to /meeting (existing workflow) via useEffect navigate — Option B minimal-touch approach (D-04)"
  - "Workflow routes (/reporter, /specialist, /officer) placed before main app shell return to enable early-return pattern"
  - "Post-login navigation uses activeWorkflowGroup with /meeting fallback for legacy tokens lacking workflowGroups"
  - "RegisterPage tests updated to select group before submitting — group validation is now gating (Rule 1 auto-fix)"
metrics:
  duration: "5min"
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_changed: 8
---

# Phase 08 Plan 03: Frontend Workflow UI Summary

RegisterPage multi-select group toggle UI + WorkflowGuard component + 3 workflow route shells in App.tsx. After login/register, app navigates to /{activeWorkflowGroup}. Guard blocks cross-group access.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RegisterPage multi-select group UI + WorkflowGuard component | 7bdc20c | components/RegisterPage.tsx, features/workflows/WorkflowGuard.tsx |
| 2 | App.tsx route guard + 3 workflow shell pages + post-login navigation | b92ce77 | App.tsx, features/workflows/reporter/ReporterWorkflowPage.tsx, features/workflows/specialist/SpecialistWorkflowPage.tsx, features/workflows/officer/OfficerWorkflowPage.tsx, features/workflows/__tests__/WorkflowGuard.test.tsx, components/__tests__/RegisterPage.test.tsx |

## Verification

- `components/RegisterPage.tsx` renders 3 toggle cards from WORKFLOW_GROUPS.map
- RegisterPage blocks submit when selectedGroups.length === 0 with Vietnamese error message
- RegisterPage calls `register(email.trim(), password, confirmPassword, selectedGroups)`
- `features/workflows/WorkflowGuard.tsx` exports WorkflowGuard, checks workflowGroups.includes(group)
- WorkflowGuard redirects to /${user.activeWorkflowGroup} on group mismatch
- WorkflowGuard redirects to /login when user is null
- App.tsx has lazy imports for all 3 workflow pages + WorkflowGuard
- App.tsx has /reporter, /specialist, /officer routes each wrapped in WorkflowGuard
- App.tsx post-login navigation goes to /${loggedInUser.activeWorkflowGroup}
- SpecialistWorkflowPage redirects to /meeting via useEffect
- 4 WorkflowGuard unit tests GREEN
- 8 RegisterPage unit tests GREEN (including 1 new group-validation test)
- npm run build succeeds

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated RegisterPage tests for new group selection requirement**
- **Found during:** Task 2 test run
- **Issue:** Existing 5 RegisterPage tests submitted the form without selecting a group, causing the new "must select group" validation to fire instead of reaching password validation or register() call. Tests checking password errors now showed group error instead.
- **Fix:** Updated all form-submission tests to call `selectGroup(/chuyen vien/i)` before filling other fields. Updated register call expectation to include `['specialist']` as 4th argument. Added 1 new test: "hien thi loi khi chua chon nhom nguoi dung" to explicitly test the new validation path. Total: 8 tests passing.
- **Files modified:** components/__tests__/RegisterPage.test.tsx
- **Commit:** b92ce77

## Known Stubs

- `features/workflows/reporter/ReporterWorkflowPage.tsx` — stub page with "dang duoc phat trien" message. Intentional per plan (ROLE-04: reporter workflow UI is a future plan).
- `features/workflows/officer/OfficerWorkflowPage.tsx` — stub page with "dang duoc phat trien" message. Intentional per plan (ROLE-04: officer workflow UI is a future plan).

These stubs are intentional — Plan 03 goal is routing + guard infrastructure, not full workflow UIs. Plan 04 will build out reporter and officer workflows.

## Self-Check: PASSED
