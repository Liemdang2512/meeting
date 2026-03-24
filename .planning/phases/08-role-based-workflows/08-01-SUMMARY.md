---
phase: 08-role-based-workflows
plan: "01"
subsystem: auth-data-model
tags: [workflow-groups, db-migration, auth, types, foundation]
dependency_graph:
  requires: []
  provides: [workflow-groups-schema, workflow-group-types, extended-auth-user]
  affects: [server/auth.ts, lib/auth.ts, server/routes/auth.ts, components/RegisterPage.tsx]
tech_stack:
  added: []
  patterns: [text-array-column, legacy-token-normalization, single-source-type]
key_files:
  created:
    - db/migrations/009_add_workflow_groups.sql
    - features/workflows/types.ts
    - server/routes/__tests__/auth.register-workflow.test.ts
  modified:
    - db/schema.sql
    - server/auth.ts
    - lib/auth.ts
    - server/routes/auth.ts
    - components/RegisterPage.tsx
    - tests/integration/schema.test.ts
decisions:
  - "WorkflowGroup type defined in features/workflows/types.ts as single source of truth (D-01, D-04)"
  - "Legacy JWT tokens normalized to specialist group in requireAuth (D-08)"
  - "register() in lib/auth.ts now accepts workflowGroups[] — RegisterPage passes ['specialist'] default until UI plan adds selection"
  - "signToken() calls in server/routes/auth.ts updated to include workflowGroups + activeWorkflowGroup"
metrics:
  duration: "3min"
  completed_date: "2026-03-24"
  tasks_completed: 3
  files_changed: 9
---

# Phase 08 Plan 01: Workflow Groups Data Model Foundation Summary

Multi-group workflow foundation layer: DB migration adding text[] columns to profiles, shared WorkflowGroup type, extended AuthUser on server and client with legacy JWT normalization, Wave 0 RED test stubs.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | Wave 0 RED test stubs | c6f95c8 | tests/integration/schema.test.ts, server/routes/__tests__/auth.register-workflow.test.ts |
| 1 | DB migration + schema update | f8faf62 | db/migrations/009_add_workflow_groups.sql, db/schema.sql |
| 2 | WorkflowGroup types + AuthUser extension + legacy normalization | 251371d | features/workflows/types.ts, server/auth.ts, lib/auth.ts, server/routes/auth.ts, components/RegisterPage.tsx |

## Verification

- `db/migrations/009_add_workflow_groups.sql` exists with idempotent ALTER TABLE + D-08 backfill
- `features/workflows/types.ts` exports WorkflowGroup type with 3 valid values
- `server/auth.ts` AuthUser includes workflowGroups + activeWorkflowGroup
- `lib/auth.ts` AuthUser mirrors server AuthUser; register() accepts 4th workflowGroups param
- requireAuth normalizes legacy tokens to default specialist group via `?? ['specialist']`
- 6 test stubs exist in RED state (4 in register-workflow + 2 in schema.test.ts)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed signToken() calls in server/routes/auth.ts**
- **Found during:** Task 2
- **Issue:** Extending AuthUser with required fields `workflowGroups` and `activeWorkflowGroup` caused TS2345 errors at two signToken() call sites in server/routes/auth.ts
- **Fix:** Updated login route to fetch workflow_groups and active_workflow_group from profiles; register route passes default `['specialist']` values
- **Files modified:** server/routes/auth.ts
- **Commit:** 251371d

**2. [Rule 1 - Bug] Fixed register() call in components/RegisterPage.tsx**
- **Found during:** Task 2
- **Issue:** Adding required 4th parameter `workflowGroups` to register() signature caused the existing call in RegisterPage.tsx to be missing the argument
- **Fix:** Pass `['specialist']` as default until Phase 08 Plan 03 adds workflow group selection UI
- **Files modified:** components/RegisterPage.tsx
- **Commit:** 251371d

## Known Stubs

None — all stubs are intentional RED-state test stubs in `server/routes/__tests__/auth.register-workflow.test.ts` and `tests/integration/schema.test.ts`. These will go GREEN in Wave 2+ plans (08-02 implements the registration handler, 08-03 runs schema integration tests).

## Self-Check: PASSED
