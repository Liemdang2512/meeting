---
phase: quick
plan: 260328-our
type: execute
wave: 1
depends_on: []
files_modified:
  - App.tsx
  - features/workflows/shared/SharedMeetingWorkflow.tsx
  - features/pricing/PricingPage.tsx
  - features/user-management/UserManagementPage.tsx
autonomous: true
requirements: [remove-workflow-groups-from-profile, show-registered-on-upgrade, admin-show-workflow-groups]
must_haves:
  truths:
    - "Trang /profile va /settings khong con hien section chon nhom workflow"
    - "Trang pricing hien thi 'Da dang ky' tren moi goi ma user da co trong workflowGroups"
    - "Admin user management hien thi danh sach nhom workflow cua tung user"
  artifacts:
    - path: "App.tsx"
      provides: "Profile route without WorkflowGroupsSection"
    - path: "features/workflows/shared/SharedMeetingWorkflow.tsx"
      provides: "Profile route without WorkflowGroupsSection"
    - path: "features/pricing/PricingPage.tsx"
      provides: "Registered badge per workflow group"
    - path: "features/user-management/UserManagementPage.tsx"
      provides: "Workflow groups column in user table"
  key_links:
    - from: "features/pricing/PricingPage.tsx"
      to: "AuthUser.workflowGroups"
      via: "prop userWorkflowGroups"
      pattern: "workflowGroups.*includes"
---

<objective>
Remove workflow group selection from profile/settings pages, show "Da dang ky" badges on pricing/upgrade page for groups the user already has, and display each user's workflow groups in admin user management.

Purpose: Workflow group registration should happen on the upgrade page (not profile), and admin needs visibility into each user's groups.
Output: Modified App.tsx, SharedMeetingWorkflow.tsx, PricingPage.tsx, UserManagementPage.tsx
</objective>

<context>
@features/settings/WorkflowGroupsSection.tsx
@features/pricing/PricingPage.tsx
@features/user-management/UserManagementPage.tsx
@features/workflows/types.ts
@lib/auth.ts
</context>

<interfaces>
From lib/auth.ts:
```typescript
export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  workflowGroups: WorkflowGroup[];
  activeWorkflowGroup: WorkflowGroup;
  features: Feature[];
}
```

From features/workflows/types.ts:
```typescript
export type WorkflowGroup = 'reporter' | 'specialist' | 'officer';
export const WORKFLOW_GROUPS: readonly { key: WorkflowGroup; label: string; description: string }[];
```

From server/routes/admin.ts GET /api/admin/users response:
```typescript
// Already returns workflow_groups and active_workflow_group per user
{ users: [{ id, email, role, daily_limit, features, workflow_groups: string[], active_workflow_group: string, tokens_used, created_at }] }
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Remove WorkflowGroupsSection from profile routes + add registered badges to PricingPage</name>
  <files>App.tsx, features/workflows/shared/SharedMeetingWorkflow.tsx, features/pricing/PricingPage.tsx</files>
  <action>
**1. App.tsx (lines ~1041-1062):** Replace the /profile || /settings route block. Remove the `<WorkflowGroupsSection>` usage entirely. Replace with a simple profile info display showing user email, role label, active workflow group label, and registered workflow groups list (read-only, no editing). Use WORKFLOW_GROUPS from features/workflows/types.ts for labels. Remove the lazy import of WorkflowGroupsSection (line ~38).

**2. features/workflows/shared/SharedMeetingWorkflow.tsx (lines ~1039-1061):** Same change as App.tsx — replace the /profile || /settings route block. Remove the `<WorkflowGroupsSection>` usage and its lazy import (line ~42). Replace with the same read-only profile info display.

**3. features/pricing/PricingPage.tsx:**
- Change PricingPageProps to accept `userWorkflowGroups?: string[]` (in addition to existing `currentUserRole`).
- For each plan card, check if `userWorkflowGroups?.includes(plan.id)` — if true, show a green "Da dang ky" badge on the card (positioned top-right or below the subtitle).
- The badge should be a small green pill: `<span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">Da dang ky</span>`.
- When a group is already registered, the CTA button text should change to "Da dang ky" and be disabled (similar to isCurrentPlan behavior), BUT keep the existing isCurrentPlan logic for role-based detection too.
- Update the PricingPage usage in App.tsx to pass `userWorkflowGroups={user?.workflowGroups}`.

Note: Do NOT delete WorkflowGroupsSection.tsx file — it may be used later or referenced elsewhere. Just remove imports and usages from App.tsx and SharedMeetingWorkflow.tsx.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>Profile/settings routes show read-only info (no workflow group editing). PricingPage shows "Da dang ky" badge for groups user already has. TypeScript compiles clean.</done>
</task>

<task type="auto">
  <name>Task 2: Display workflow groups column in admin UserManagementPage</name>
  <files>features/user-management/UserManagementPage.tsx</files>
  <action>
**1. Add workflow_groups and active_workflow_group to UserRow interface:**
```typescript
interface UserRow {
  // ... existing fields ...
  workflow_groups: string[];    // ADD
  active_workflow_group: string; // ADD
}
```
The API already returns these fields (confirmed in server/routes/admin.ts line 57-58).

**2. Add WORKFLOW_GROUP_LABEL map** at top of file:
```typescript
const WORKFLOW_GROUP_LABEL: Record<string, string> = {
  reporter: 'Phong vien',
  specialist: 'Chuyen vien',
  officer: 'Can bo',
};
```

**3. Add a "Nhom workflow" column** to the table, positioned after the "Goi / Quyen" column:
- Header: `<th>Nhom workflow</th>`
- Cell: Display each workflow group as a small pill/badge. The active group gets a distinct style (e.g., blue bg). Others get neutral style. Format:
```tsx
<td className="px-5 py-4">
  <div className="flex flex-wrap gap-1.5">
    {u.workflow_groups.map(g => (
      <span key={g} className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        g === u.active_workflow_group
          ? 'bg-blue-100 text-blue-700 border border-blue-200'
          : 'bg-slate-100 text-slate-600 border border-slate-200'
      }`}>
        {WORKFLOW_GROUP_LABEL[g] || g}
      </span>
    ))}
  </div>
</td>
```
If workflow_groups is empty or undefined, show a dash "—".
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>Admin user table shows a "Nhom workflow" column with colored badges per user. Active workflow group is visually distinct (blue). TypeScript compiles clean.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — no TypeScript errors
2. Navigate to /profile or /settings — should show read-only profile info, no workflow group toggle/save buttons
3. Navigate to /pricing — each group card shows "Da dang ky" badge if user has that group
4. Navigate to /admin (as admin user) — user table shows workflow groups column with badges
</verification>

<success_criteria>
- WorkflowGroupsSection no longer rendered on profile/settings routes (both App.tsx and SharedMeetingWorkflow.tsx)
- PricingPage shows registration status per workflow group based on user.workflowGroups
- Admin UserManagementPage displays workflow groups for each user with active group highlighted
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/260328-our-bo-section-chon-nhom-workflow-khoi-profi/260328-our-SUMMARY.md`
</output>
