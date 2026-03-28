---
phase: quick-260328-ndf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - server/routes/email.ts
  - server/routes/__tests__/email.test.ts
  - features/workflows/shared/SharedMeetingWorkflow.tsx
  - features/workflows/specialist/SpecialistWorkflowPage.tsx
autonomous: true
requirements: [ADMIN-EMAIL-ONLY]
must_haves:
  truths:
    - "Admin users can send email after meeting minutes as before"
    - "Non-admin users cannot see the send-email card/button"
    - "Non-admin users get 403 if they call POST /api/email/send-minutes directly"
  artifacts:
    - path: "server/routes/email.ts"
      provides: "Admin-only guard on send-minutes endpoint"
      contains: "role !== 'admin'"
    - path: "features/workflows/shared/SharedMeetingWorkflow.tsx"
      provides: "Email card hidden for non-admin"
      contains: "isAdmin"
    - path: "features/workflows/specialist/SpecialistWorkflowPage.tsx"
      provides: "Email section hidden for non-admin"
      contains: "user.role"
  key_links:
    - from: "server/routes/email.ts"
      to: "req.user.role"
      via: "role check after requireAuth"
      pattern: "req\\.user.*role.*admin"
    - from: "features/workflows/shared/SharedMeetingWorkflow.tsx"
      to: "isAdmin state"
      via: "conditional render of email card"
      pattern: "isAdmin.*Card.*email"
---

<objective>
Restrict email sending (after meeting minutes) to admin users only.

Purpose: Non-admin users should not be able to send meeting minutes via email. This is both a backend authorization check (403 for non-admin) and a frontend UI change (hide the email card/button for non-admin users).

Output: Backend guard on POST /api/email/send-minutes + hidden email UI for non-admin in both SharedMeetingWorkflow and SpecialistWorkflowPage.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@server/auth.ts (AuthUser interface with role field, requireAuth middleware)
@server/routes/email.ts (POST /send-minutes — currently only requires requireAuth, no role check)
@features/workflows/shared/SharedMeetingWorkflow.tsx (isAdmin state already exists at line 290, email card at lines 1900-1957)
@features/workflows/specialist/SpecialistWorkflowPage.tsx (user prop has AuthUser type, email section around line 760-780)

<interfaces>
From server/auth.ts:
```typescript
export interface AuthUser {
  userId: string;
  email: string;
  role: string;          // 'free' | 'reporter' | 'specialist' | 'officer' | 'admin'
  workflowGroups: WorkflowGroup[];
  activeWorkflowGroup: WorkflowGroup;
  features: Feature[];
}
```

SharedMeetingWorkflow already has:
- `const [isAdmin, setIsAdmin] = useState<boolean>(false);` (line 290)
- `setIsAdmin(currentUser.role === 'admin');` (line 359, 919, 944)

SpecialistWorkflowPage has:
- `user: AuthUser` prop (line 114)
- No existing isAdmin check — needs `user.role === 'admin'` guard
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add admin-only guard to POST /api/email/send-minutes and update tests</name>
  <files>server/routes/email.ts, server/routes/__tests__/email.test.ts</files>
  <action>
    In server/routes/email.ts, add an admin role check immediately after the `requireAuth` middleware fires (i.e., at the top of the async handler, before any validation):

    ```typescript
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Chi admin moi duoc gui email bien ban' });
    }
    ```

    This goes right after line 11 (`router.post('/send-minutes', requireAuth, async (req, res) => {`), before the `try` block's first validation.

    In server/routes/__tests__/email.test.ts, add a test case in the existing `describe('POST /send-minutes')` block:

    ```typescript
    it('returns 403 for non-admin user', async () => {
      const req = createMockReq({
        user: { userId: '1', email: 'user@test.com', role: 'specialist', workflowGroups: ['specialist'], activeWorkflowGroup: 'specialist', features: [] },
        body: { recipients: ['a@b.com'], subject: 'Test', minutesMarkdown: '# Test' },
      });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(403);
    });
    ```

    Ensure existing tests that test successful email sending have `role: 'admin'` in their mock user object. Check the existing test's mock req — if `role` is missing or not 'admin', update it to `role: 'admin'`.
  </action>
  <verify>
    <automated>cd /Users/tanliem/Desktop/meeting-main && npx vitest run server/routes/__tests__/email.test.ts --reporter=verbose 2>&1 | tail -30</automated>
  </verify>
  <done>POST /api/email/send-minutes returns 403 for non-admin users. Existing tests pass with admin role. New test confirms 403 for non-admin.</done>
</task>

<task type="auto">
  <name>Task 2: Hide email card/button for non-admin users in frontend</name>
  <files>features/workflows/shared/SharedMeetingWorkflow.tsx, features/workflows/specialist/SpecialistWorkflowPage.tsx</files>
  <action>
    **SharedMeetingWorkflow.tsx:**
    The `isAdmin` state already exists (line 290) and is set correctly (lines 359, 919, 944).
    Wrap the entire email card (lines 1900-1957, the `{/* Card: Gui email */}` div) in an `{isAdmin && ( ... )}` conditional so it only renders for admin users.

    **SpecialistWorkflowPage.tsx:**
    The component receives `user: AuthUser` prop. Wrap the email section (the div containing email subject, send button, and status — around lines 740-780 area where `handleSendEmail` button is rendered) in a `{user.role === 'admin' && ( ... )}` conditional.

    Do NOT remove any email-related state or handler code — just hide the UI elements. This keeps code simple and reversible.
  </action>
  <verify>
    <automated>cd /Users/tanliem/Desktop/meeting-main && npx tsc --noEmit 2>&1 | tail -20</automated>
  </verify>
  <done>Email card/button is only visible to admin users in both SharedMeetingWorkflow and SpecialistWorkflowPage. TypeScript compiles without errors.</done>
</task>

</tasks>

<verification>
1. `npx vitest run server/routes/__tests__/email.test.ts` — all tests pass, including new 403 test
2. `npx tsc --noEmit` — no type errors
3. Manual: Log in as non-admin user, navigate to meeting workflow, confirm email card is not visible
4. Manual: Log in as admin user, confirm email card is visible and functional
</verification>

<success_criteria>
- Non-admin users cannot see the email sending UI in any workflow page
- POST /api/email/send-minutes returns 403 for non-admin users
- Admin users retain full email functionality (no regression)
- All existing tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/260328-ndf-chi-co-admin-moi-duoc-gui-mail-sau-bien-/260328-ndf-SUMMARY.md`
</output>
