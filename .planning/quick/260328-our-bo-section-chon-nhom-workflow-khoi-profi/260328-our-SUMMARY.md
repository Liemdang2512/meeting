# Quick Task 260328-our: Workflow Groups Refactor

**Date:** 2026-03-28
**Commit:** b252191

## What was done

1. **Profile page (App.tsx + SharedMeetingWorkflow.tsx)** — Removed `WorkflowGroupsSection` (edit UI) from `/profile` and `/settings` routes. Replaced with read-only account info card showing: email, gói tài khoản, nhóm đang hoạt động, nhóm đã đăng ký (as pills).

2. **PricingPage** — Added `userWorkflowGroups` prop. Each plan card now shows a green "✓ Đã đăng ký" badge (top-right) if the user already has that workflow group. CTA button shows "Đã đăng ký" and is disabled for owned groups.

3. **UserManagementPage (Admin)** — Added `workflow_groups` + `active_workflow_group` to `UserRow` interface. Added "Nhóm workflow" column with colored pill badges; active group shown in blue, others in slate.

## Files changed
- `App.tsx`
- `features/workflows/shared/SharedMeetingWorkflow.tsx`
- `features/pricing/PricingPage.tsx`
- `features/user-management/UserManagementPage.tsx`
