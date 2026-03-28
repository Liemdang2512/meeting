---
phase: quick-260328-ndf
plan: 01
subsystem: email-authorization
tags: [security, authorization, admin-only, email]
dependency_graph:
  requires: [Phase 07 email sending, Phase 08 role-based-workflows]
  provides: [ADMIN-EMAIL-ONLY]
  affects: [server/routes/email.ts, SharedMeetingWorkflow, SpecialistWorkflowPage]
tech_stack:
  added: []
  patterns: [role-check-before-handler, conditional-render-isAdmin]
key_files:
  created: []
  modified:
    - server/routes/email.ts
    - server/routes/__tests__/email.test.ts
    - features/workflows/shared/SharedMeetingWorkflow.tsx
    - features/workflows/specialist/SpecialistWorkflowPage.tsx
decisions:
  - Admin-only email guard placed before try block in handler (role check first, then validation)
  - Frontend uses existing isAdmin state in SharedMeetingWorkflow (already tracked)
  - SpecialistWorkflowPage uses user.role === 'admin' inline (no separate state needed)
  - UI-only hide approach — no state/handler removal, keeps code reversible
metrics:
  duration: 7min
  completed: 2026-03-28T09:54:47Z
  tasks: 2
  files: 4
---

# Quick Task 260328-ndf: Admin-Only Email Sending Summary

**One-liner:** Backend 403 guard + frontend conditional render restricts email sending to admin users only.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add admin-only guard to POST /api/email/send-minutes | ebf3edf | server/routes/email.ts, server/routes/__tests__/email.test.ts |
| 2 | Hide email card/button for non-admin users in frontend | c7c5708 | features/workflows/shared/SharedMeetingWorkflow.tsx, features/workflows/specialist/SpecialistWorkflowPage.tsx |

## What Was Done

### Task 1 — Backend Guard

Added role check immediately after `requireAuth` fires in `POST /api/email/send-minutes`:

```typescript
if (req.user!.role !== 'admin') {
  return res.status(403).json({ error: 'Chi admin moi duoc gui email bien ban' });
}
```

Updated `email.test.ts`:
- Added `createAdminUser()` helper to DRY up mock user creation
- Added `user: createAdminUser()` to all existing test mock requests (5 tests updated)
- Added new test: `returns 403 for non-admin user` using `role: 'specialist'`
- All 9 tests pass

### Task 2 — Frontend UI Guard

**SharedMeetingWorkflow.tsx:** Wrapped the entire email card (`{/* Card: Gửi email */}`) in `{isAdmin && <div ...>...</div>}`. The `isAdmin` state was already correctly set from `currentUser.role === 'admin'` — no additional logic needed.

**SpecialistWorkflowPage.tsx:** Changed the email section condition from `{info.recipientEmails.length > 0 && (` to `{user.role === 'admin' && info.recipientEmails.length > 0 && (` — uses the existing `user: AuthUser` prop directly.

## Verification

- `npx vitest run server/routes/__tests__/email.test.ts` — 9/9 tests pass
- `npx tsc --noEmit` — zero type errors

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] server/routes/email.ts modified with role guard
- [x] server/routes/__tests__/email.test.ts has new 403 test
- [x] SharedMeetingWorkflow.tsx wraps email card in isAdmin
- [x] SpecialistWorkflowPage.tsx wraps email section in user.role === 'admin'
- [x] Commits ebf3edf and c7c5708 exist

## Self-Check: PASSED
