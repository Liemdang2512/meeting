# Phase 8: Role-Based Workflows - Research

**Researched:** 2026-03-24
**Domain:** Multi-group user workflows, PostgreSQL array columns, JWT multi-claim, React routing guard
**Confidence:** HIGH (all critical findings verified against existing codebase directly)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Dùng 3 lựa chọn cố định: `reporter` (Phóng viên), `specialist` (Chuyên viên), `officer` (Cán bộ).
- **D-02:** Chọn nhóm ở trang đăng ký (multi-select); user có thể đăng ký 1 hoặc nhiều nhóm.
- **D-03:** Kiến trúc phải tương thích stack hiện tại React 19 + TypeScript + Vite + PostgreSQL/Auth server.
- **D-04:** Ưu tiên refactor sạch, đúng folder feature-based, hạn chế đụng module không liên quan.
- **D-05:** 1 user có thể thuộc nhiều nhóm — DB lưu array/many-to-many, không phải enum đơn. JWT mang `workflowGroups[]` + `activeWorkflowGroup`.
- **D-06:** User có UI để chuyển đổi active group sau đăng nhập (group switcher).
- **D-07:** User tự đổi/thêm nhóm được qua trang settings.
- **D-08:** Legacy user backfill `activeWorkflowGroup = specialist`, `workflowGroups = ['specialist']`.
- **D-09:** Route riêng theo nhóm: `/reporter`, `/specialist`, `/officer`. Guard kiểm tra nhóm trong danh sách `workflowGroups[]`.

### Claude's Discretion

- Chọn cách lưu multi-group: cột array (`text[]`) trong `profiles` hay bảng `user_workflow_groups` riêng (ưu tiên đơn giản nhất đủ dùng).
- Chọn mức guard ở frontend-only hay frontend + backend (ưu tiên cả hai cho endpoint nhạy cảm).
- Vị trí đặt group switcher UI (header, sidebar, hay settings page).
- Chọn phạm vi test tự động phù hợp để chạy nhanh trong CI hiện tại.

### Deferred Ideas (OUT OF SCOPE)

- Thay đổi logic lõi Gemini transcription.
- Thay đổi pricing/cổng thanh toán.
- Thay đổi cơ chế admin role hiện có.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ROLE-01 | User mới bắt buộc chọn 1 trong 3 nhóm tại đăng ký | Multi-select UI pattern + Zod validation (`z.array().min(1)`) in RegisterSchema |
| ROLE-02 | Giá trị nhóm được lưu bền vững trong DB và có mặt trong JWT/session user profile | `text[]` column in `profiles`, JWT payload extension in `server/auth.ts` |
| ROLE-03 | Sau login/register, app điều hướng đúng route khởi điểm theo nhóm | `activeWorkflowGroup` read from JWT in `App.tsx` → navigate to `/reporter`, `/specialist`, or `/officer` |
| ROLE-04 | Mỗi nhóm có workflow riêng (route + config bước + UI shell) không trộn lẫn | `features/workflows/` directory with per-group shell components |
| ROLE-05 | Guard ngăn truy cập sai luồng (frontend + endpoint cần thiết) | `WorkflowGuard` component + `requireWorkflowGroup` middleware |
| ROLE-06 | Có test cho register payload validation, route guard, và điều hướng theo nhóm | Vitest unit tests (jsdom) + integration stubs |
</phase_requirements>

---

## Summary

Phase 8 adds multi-group workflow support to an existing single-role JWT auth system. The key architectural challenge is extending three distinct layers simultaneously: the DB schema (single `role` column → `text[]` array), the JWT/auth contract (`{ userId, email, role }` → adds `workflowGroups` and `activeWorkflowGroup`), and the frontend routing (flat `route` state in `App.tsx` → per-group guarded shells).

The existing codebase patterns are well-suited for this extension. The migration pattern from phases 006–008 provides a template. The `signToken`/`requireAuth` functions in `server/auth.ts` accept a typed payload interface — adding two new fields requires touching `AuthUser`, `signToken` call sites in `auth.ts`, and the login/register response shape. The `App.tsx` routing already uses a central `navigate()` helper and `route` state, making it straightforward to add guard logic at the render-branch level without introducing a routing library.

**Primary recommendation:** Use `text[]` column in `public.profiles` (not a separate table) for `workflow_groups`, plus a `text` column for `active_workflow_group`. JWT carries both. Frontend guard checks `workflowGroups.includes(group)` at each route branch. Group switcher lives in the app header alongside the existing navigation. Settings page gets a new "Nhóm người dùng" section.

---

## Standard Stack

No new dependencies required. All needs are met by the existing installed stack.

### Core (already installed)
| Library | Version (installed) | Purpose in Phase 8 |
|---------|--------------------|--------------------|
| `zod` | 4.3.6 | Extend `RegisterSchema` with `workflowGroups: z.array(WorkflowGroupEnum).min(1)` |
| `jsonwebtoken` | 9.0.3 | JWT already used — extend payload type only |
| `postgres` | 3.4.8 | `text[]` arrays supported natively via tagged template |
| `vitest` | 4.0.18 (installed) | Unit + integration tests |
| `@testing-library/react` | 16.3.2 | React component tests for RegisterPage + guard |

### No New Installs Needed

PostgreSQL `text[]` is a native type — no extension required. postgres.js automatically maps JS arrays to `text[]` parameters when using tagged templates. No additional ORM, no migration helper library needed.

---

## Architecture Patterns

### Recommended Project Structure for New Feature

```
features/
└── workflows/
    ├── index.ts                  # re-exports
    ├── types.ts                  # WorkflowGroup union, WORKFLOW_GROUPS const
    ├── WorkflowGuard.tsx         # <WorkflowGuard group="reporter"> wrapper
    ├── GroupSwitcher.tsx         # header dropdown to switch active group
    ├── reporter/
    │   └── ReporterWorkflowPage.tsx   # shell/stub for reporter workflow
    ├── specialist/
    │   └── SpecialistWorkflowPage.tsx # current /meeting logic lives here
    └── officer/
        └── OfficerWorkflowPage.tsx    # shell/stub for officer workflow

features/settings/
└── components/
    └── WorkflowGroupsSection.tsx  # UI to add/change groups

db/migrations/
└── 009_add_workflow_groups.sql    # idempotent migration
```

### Pattern 1: `text[]` Column on `profiles` (Discretion Decision: RECOMMENDED)

**What:** Two new columns added to `public.profiles`:
- `workflow_groups text[] NOT NULL DEFAULT '{specialist}'`
- `active_workflow_group text NOT NULL DEFAULT 'specialist'`

**Why over separate table:** Queries stay single-table. No JOIN needed on every auth/login path. Array contains 1–3 values max (bounded domain). For this scale, a join table is over-engineering. postgres.js handles `text[]` natively.

**postgres.js array read/write pattern:**
```typescript
// Write array (postgres.js tagged template handles JS array → text[])
await tx`
  INSERT INTO public.profiles (user_id, role, workflow_groups, active_workflow_group, created_at, updated_at)
  VALUES (${userId}, 'free', ${sql.array(workflowGroups)}, ${activeWorkflowGroup}, NOW(), NOW())
`;

// Read — postgres.js returns text[] as JS string[]
const [profile] = await sql`
  SELECT workflow_groups, active_workflow_group FROM public.profiles WHERE user_id = ${userId}
`;
// profile.workflow_groups is string[]
```

**Verified:** postgres.js `sql.array()` helper and native array parameter binding confirmed against package source.

### Pattern 2: JWT Payload Extension

**Current `AuthUser` interface** (`server/auth.ts`):
```typescript
export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}
```

**Extended `AuthUser`** (add two fields, keep `role` untouched for admin compat):
```typescript
export type WorkflowGroup = 'reporter' | 'specialist' | 'officer';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  workflowGroups: WorkflowGroup[];      // new
  activeWorkflowGroup: WorkflowGroup;   // new
}
```

**`signToken` is typed to `AuthUser`** — adding fields to the interface forces all callers to provide them (TypeScript compilation catches missing fields). Only two call sites: `register` handler and `login` handler in `server/routes/auth.ts`.

**JWT size impact:** Adding two fields to a 7-day JWT adds ~60–80 bytes to payload. Negligible.

**Legacy token handling:** Tokens without `workflowGroups` will fail TypeScript cast but decode fine at runtime. The `requireAuth` middleware casts via `jwt.verify(...) as AuthUser`. Add a normalization layer:
```typescript
// In requireAuth, after jwt.verify:
const payload = jwt.verify(token, JWT_SECRET) as Partial<AuthUser> & Pick<AuthUser, 'userId' | 'email' | 'role'>;
req.user = {
  ...payload,
  workflowGroups: payload.workflowGroups ?? ['specialist'],
  activeWorkflowGroup: payload.activeWorkflowGroup ?? 'specialist',
} as AuthUser;
```
This handles legacy tokens without requiring immediate re-login.

### Pattern 3: Multi-Select UI for RegisterPage

The existing `RegisterPage.tsx` uses controlled state + Tailwind classes. The pattern is a toggle-button group (not checkboxes), matching the existing visual style.

```typescript
// State
const [selectedGroups, setSelectedGroups] = useState<WorkflowGroup[]>([]);

// Toggle handler
const toggleGroup = (group: WorkflowGroup) => {
  setSelectedGroups(prev =>
    prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
  );
};

// Validation before submit
if (selectedGroups.length === 0) {
  setError('Vui lòng chọn ít nhất 1 nhóm người dùng');
  return;
}
```

**UI: Card toggle buttons** (3 cards, each showing group name + description):
```tsx
{WORKFLOW_GROUPS.map(({ key, label, description }) => (
  <button
    key={key}
    type="button"
    onClick={() => toggleGroup(key)}
    className={`w-full p-4 border rounded-xl text-left transition-colors ${
      selectedGroups.includes(key)
        ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
    }`}
  >
    <div className="font-medium">{label}</div>
    <div className="text-sm opacity-70">{description}</div>
  </button>
))}
```

This matches the existing Tailwind + indigo color system in `RegisterPage.tsx`.

### Pattern 4: Route Guard

**Current routing:** `App.tsx` uses `const [route, setRoute] = useState<string>()` and renders branches via `if (route === '/meeting')`. The guard can be implemented as a render-time check at each new workflow branch.

**Guard component** (`features/workflows/WorkflowGuard.tsx`):
```typescript
interface WorkflowGuardProps {
  group: WorkflowGroup;
  user: AuthUser | null;
  navigate: (path: string) => void;
  children: React.ReactNode;
}

export function WorkflowGuard({ group, user, navigate, children }: WorkflowGuardProps) {
  if (!user) {
    navigate('/login');
    return null;
  }
  if (!user.workflowGroups.includes(group)) {
    // Redirect to user's active group instead
    navigate(`/${user.activeWorkflowGroup}`);
    return null;
  }
  return <>{children}</>;
}
```

**App.tsx guard usage** (pattern, not adding router library):
```typescript
if (route === '/reporter') {
  return (
    <WorkflowGuard group="reporter" user={user} navigate={navigate}>
      <ReporterWorkflowPage ... />
    </WorkflowGuard>
  );
}
```

### Pattern 5: Group Switcher (Active Group without Re-Login)

**Mechanism:** Call a new API endpoint `PATCH /api/profiles/active-workflow-group`, receive a new JWT, replace token in localStorage.

```typescript
// New endpoint in server/routes/profiles.ts
router.patch('/active-workflow-group', requireAuth, async (req, res) => {
  const { group } = req.body;
  if (!VALID_GROUPS.includes(group)) {
    return res.status(400).json({ error: 'Nhóm không hợp lệ' });
  }
  // Verify user belongs to this group
  const [profile] = await sql`
    SELECT workflow_groups FROM public.profiles WHERE user_id = ${req.user!.userId}
  `;
  if (!profile?.workflow_groups?.includes(group)) {
    return res.status(403).json({ error: 'Bạn không thuộc nhóm này' });
  }
  // Update DB
  await sql`
    UPDATE public.profiles SET active_workflow_group = ${group}, updated_at = NOW()
    WHERE user_id = ${req.user!.userId}
  `;
  // Issue new JWT with updated active group
  const newToken = signToken({ ...req.user!, activeWorkflowGroup: group });
  res.json({ token: newToken });
});
```

**Frontend:** `GroupSwitcher` component dispatches a `PopStateEvent` after token swap (matching the existing pattern in `LoginPage` — documented in STATE.md: "Use window.dispatchEvent(new PopStateEvent) from LoginPage to trigger App route state").

### Pattern 6: Settings Page — Add/Change Groups

New section in the settings area (already exists in `App.tsx` as `route === '/admin/email-settings'` pattern). Add user-facing settings route `/settings/workflow-groups`.

```typescript
// Endpoint: PATCH /api/profiles/workflow-groups
// Body: { add?: WorkflowGroup[], remove?: WorkflowGroup[] }
// Constraint: at least 1 group must remain after remove
```

### Anti-Patterns to Avoid

- **Storing `workflowGroups` as a comma-separated string:** postgres.js handles `text[]` natively; do not serialize to a string.
- **Guarding only on frontend:** Any endpoint that returns workflow-specific data (future phases) must also check on the backend.
- **Re-using `role` field for workflow groups:** `role` is for admin/free/paid access control. `workflowGroups` is for product workflow selection. Conflating them will break admin detection.
- **Hardcoding group strings in multiple places:** Define `WORKFLOW_GROUPS` constant in `features/workflows/types.ts` and import from there. DB constraint, Zod enum, and TypeScript union must all derive from one source.

---

## DB Schema: Recommended Design

### Migration 009

```sql
-- Migration 009: Add multi-group workflow support
-- Idempotent: safe to run multiple times

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS workflow_groups text[] NOT NULL DEFAULT '{specialist}';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_workflow_group text NOT NULL DEFAULT 'specialist';

-- Backfill legacy users (D-08)
UPDATE public.profiles
  SET workflow_groups = '{specialist}',
      active_workflow_group = 'specialist'
  WHERE workflow_groups IS NULL
     OR active_workflow_group IS NULL;

-- Optional: add a CHECK constraint to prevent invalid group values
-- (defer this to a later phase if the group list may expand)
-- ALTER TABLE public.profiles
--   ADD CONSTRAINT profiles_active_group_valid
--   CHECK (active_workflow_group IN ('reporter', 'specialist', 'officer'));
```

**Why no CHECK constraint initially:** A constraint requires a DROP+recreate migration if groups change. Validation at the application layer (Zod + TypeScript union) is sufficient and more flexible for now.

**Rollback script:**
```sql
-- Rollback 009
ALTER TABLE public.profiles DROP COLUMN IF EXISTS workflow_groups;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS active_workflow_group;
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Array serialization for DB | Custom comma-join/split logic | `sql.array(arr)` in postgres.js | Native type; hand-roll breaks on values with commas |
| Zod enum for groups | Manual string validation | `z.enum(['reporter', 'specialist', 'officer'])` | Auto-generates TypeScript type + runtime validation |
| Token refresh after group switch | Full logout + re-login flow | `signToken({ ...req.user!, activeWorkflowGroup: group })` | Same pattern already used on login; issue new JWT |
| Frontend route state parsing | URL parsing library | Existing `route` state + string comparison | Already works; adding guard wrapper keeps it consistent |

**Key insight:** This phase is purely additive — it extends existing patterns (migration files, JWT payload, route branches) rather than replacing them. Minimal surface area.

---

## Common Pitfalls

### Pitfall 1: postgres.js Array Parameter Syntax

**What goes wrong:** Using `${workflowGroups}` directly in a tagged template when `workflowGroups` is a JS array can produce incorrect SQL depending on how postgres.js inlines it.

**Why it happens:** postgres.js serializes arrays to a PostgreSQL array literal only when using `sql.array()` helper or when the column type is already known. In dynamic inserts, use `sql.array(workflowGroups)` explicitly.

**How to avoid:**
```typescript
// CORRECT
await sql`UPDATE profiles SET workflow_groups = ${sql.array(groups)} WHERE user_id = ${id}`;

// INCORRECT — may serialize as a tuple or string depending on context
await sql`UPDATE profiles SET workflow_groups = ${groups} WHERE user_id = ${id}`;
```

**Warning signs:** `ERROR: column "workflow_groups" is of type text[] but expression is of type text` at runtime.

### Pitfall 2: JWT Claim Missing on Legacy Tokens

**What goes wrong:** Users who logged in before Phase 8 deploy have tokens without `workflowGroups`. If `requireAuth` casts directly to `AuthUser`, accessing `req.user.workflowGroups` throws a runtime error.

**Why it happens:** `jwt.verify(token, SECRET) as AuthUser` is a TypeScript cast — it does not validate the shape at runtime.

**How to avoid:** Add normalization in `requireAuth` (shown in Pattern 2 above). Default to `['specialist']` per D-08.

**Warning signs:** `Cannot read properties of undefined (reading 'includes')` in guard middleware after deploy.

### Pitfall 3: `activeWorkflowGroup` Not in Returned `workflowGroups`

**What goes wrong:** User deletes a group via settings but `activeWorkflowGroup` still points to it. App redirects to `/specialist` but guard rejects (user no longer has `specialist`). Infinite redirect loop.

**Why it happens:** Remove-group logic doesn't update `activeWorkflowGroup` when the active one is removed.

**How to avoid:** When removing a group, always check if it is the current `activeWorkflowGroup`. If so, auto-set `activeWorkflowGroup` to the first remaining group.

**Warning signs:** Redirect loop on login that clears only on logout.

### Pitfall 4: `App.tsx` Growing Further

**What goes wrong:** Directly adding `/reporter`, `/specialist`, `/officer` route branches inline in `App.tsx` increases the file (already 27,979 tokens) with workflow-specific JSX.

**Why it happens:** Current pattern puts all route logic inline.

**How to avoid:** Each workflow shell is a separate lazy-loaded component (matching the existing `lazy()` pattern for `FileSplitPage`, `MindmapPage` etc.). The route branch in `App.tsx` becomes a single-line `<WorkflowGuard>` + lazy component.

### Pitfall 5: schema.test.ts Will Fail Without Update

**What goes wrong:** `tests/integration/schema.test.ts` asserts `profiles` column count. After adding two columns, the test may fail if it checks exact column lists.

**Why it happens:** The integration test suite verifies DB structure.

**How to avoid:** Update `schema.test.ts` to assert the two new columns exist on `profiles`. This is a Wave 0 gap.

### Pitfall 6: Zod v4 Array Validation Error Path

**What goes wrong:** `z.array(WorkflowGroupEnum).min(1)` failure message in Zod v4 is accessed via `.issues`, not `.errors` (already documented in STATE.md for this project).

**How to avoid:** Use `parsed.error.issues[0].message` (same pattern as existing `RegisterSchema`).

---

## Code Examples

### RegisterSchema Extension (server/routes/auth.ts)

```typescript
// Source: zod v4 docs + existing RegisterSchema pattern in server/routes/auth.ts
const WorkflowGroupEnum = z.enum(['reporter', 'specialist', 'officer']);

const RegisterSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  confirmPassword: z.string(),
  workflowGroups: z.array(WorkflowGroupEnum).min(1, 'Vui lòng chọn ít nhất 1 nhóm'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});
```

### Register Handler — DB Insert + JWT Sign

```typescript
// Inside sql.begin() in register handler:
const firstGroup = parsed.data.workflowGroups[0];
await tx`
  INSERT INTO public.profiles (user_id, role, workflow_groups, active_workflow_group, created_at, updated_at)
  VALUES (${u.id}, 'free', ${sql.array(parsed.data.workflowGroups)}, ${firstGroup}, NOW(), NOW())
`;

const token = signToken({
  userId: u.id,
  email: u.email,
  role: 'free',
  workflowGroups: parsed.data.workflowGroups,
  activeWorkflowGroup: firstGroup,
});
```

### Login Handler — Profile Query Extension

```typescript
// In login handler, replace:
const [profile] = await sql`SELECT role FROM public.profiles WHERE user_id = ${user.id}`;

// With:
const [profile] = await sql`
  SELECT role, workflow_groups, active_workflow_group
  FROM public.profiles WHERE user_id = ${user.id}
`;
const workflowGroups: WorkflowGroup[] = profile?.workflow_groups ?? ['specialist'];
const activeWorkflowGroup: WorkflowGroup = profile?.active_workflow_group ?? 'specialist';

const token = signToken({
  userId: user.id,
  email: user.email,
  role: profile?.role ?? 'free',
  workflowGroups,
  activeWorkflowGroup,
});
```

### Frontend Auth Type Extension (lib/auth.ts)

```typescript
// Extend AuthUser — MUST match server/auth.ts
export type WorkflowGroup = 'reporter' | 'specialist' | 'officer';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  workflowGroups: WorkflowGroup[];
  activeWorkflowGroup: WorkflowGroup;
}
```

### Post-Login Navigation (App.tsx pattern)

```typescript
// After getMe() resolves with user:
const groupRoute = `/${user.activeWorkflowGroup}`; // '/reporter' | '/specialist' | '/officer'
navigate(groupRoute);
```

---

## Migration Strategy

### Safe Backfill Sequence (D-08)

1. Add columns with `DEFAULT '{specialist}'` and `DEFAULT 'specialist'` — handles all new rows automatically.
2. `UPDATE ... WHERE workflow_groups IS NULL` — covers any row inserted before default was set (unlikely but safe).
3. The default ensures the migration is non-breaking for currently-logged-in users: their existing JWT without the new claims will be normalized by `requireAuth` to `['specialist']`.
4. Users re-login to get a token with the new claims. No forced logout needed.

### JWT Rollout Strategy (zero-downtime)

1. Deploy migration first (adds columns with defaults).
2. Deploy new server code (normalization in `requireAuth`, extended `signToken` calls).
3. Old tokens still work (normalization fallback in `requireAuth`).
4. Users get new tokens on next login (workflowGroups from DB).
5. Frontend deploy (extended `AuthUser` type, new routes).

---

## Routing Architecture

### Route Map

| Path | Guard | Component |
|------|-------|-----------|
| `/reporter` | `workflowGroups.includes('reporter')` | `ReporterWorkflowPage` (lazy) |
| `/specialist` | `workflowGroups.includes('specialist')` | `SpecialistWorkflowPage` (lazy) — wraps current `/meeting` logic |
| `/officer` | `workflowGroups.includes('officer')` | `OfficerWorkflowPage` (lazy) |

### Existing `/meeting` Route

The current `/meeting` workflow logic becomes `SpecialistWorkflowPage`. During Phase 8, it is either:
- **Option A (simpler):** `/specialist` is a new route that renders the existing inline meeting JSX extracted to a component.
- **Option B (scope-bounded):** `/meeting` remains and `/specialist` redirects to `/meeting` with a guard. This avoids touching the existing meeting logic.

**Recommendation: Option B for Phase 8.** D-04 says "hạn chế đụng module không liên quan." Moving the full `/meeting` logic is a large refactor outside this phase's scope. The specialist route shell simply redirects to `/meeting` after guard checks pass. Future phase extracts properly.

---

## Test Strategy

### Existing Test Infrastructure

- **Unit tests:** `vitest` + `jsdom` + `@testing-library/react`. Config: `vitest.config.ts`. Command: `npx vitest run`.
- **Integration tests:** `vitest` + `node` environment against Docker PostgreSQL. Config: `vitest.integration.config.ts`. Command: `npm run test:integration`. Requires Docker.
- **Known pattern:** Stub files use `expect(true).toBe(false)` for RED state, no vacuous passes (STATE.md).

### Phase 8 Test Map

| Req ID | Behavior | Test Type | File | Test Runner |
|--------|----------|-----------|------|-------------|
| ROLE-01 | RegisterSchema rejects empty workflowGroups | Unit | `server/routes/__tests__/auth.register.test.ts` | `npx vitest run` |
| ROLE-01 | RegisterSchema rejects unknown group values | Unit | `server/routes/__tests__/auth.register.test.ts` | `npx vitest run` |
| ROLE-01 | RegisterPage shows validation error on submit without group | Unit | `components/__tests__/RegisterPage.test.tsx` | `npx vitest run` |
| ROLE-02 | Register handler inserts workflow_groups array into profiles | Integration | `tests/integration/workflowGroups.test.ts` | `npm run test:integration` |
| ROLE-02 | Login handler returns workflowGroups + activeWorkflowGroup in JWT response | Integration | `tests/integration/workflowGroups.test.ts` | `npm run test:integration` |
| ROLE-03 | App navigates to /specialist after login for specialist group user | Unit | `App.test.tsx` (stub) | `npx vitest run` |
| ROLE-05 | WorkflowGuard redirects user without group membership | Unit | `features/workflows/__tests__/WorkflowGuard.test.tsx` | `npx vitest run` |
| ROLE-05 | WorkflowGuard allows user with matching group | Unit | `features/workflows/__tests__/WorkflowGuard.test.tsx` | `npx vitest run` |
| ROLE-06 (bonus) | Multi-group user can access multiple routes | Unit | `features/workflows/__tests__/WorkflowGuard.test.tsx` | `npx vitest run` |

### Wave 0 Gaps (test files to create before implementation)

- [ ] `server/routes/__tests__/auth.register.test.ts` — RegisterSchema Zod validation unit tests (no DB needed)
- [ ] `components/__tests__/RegisterPage.test.tsx` — React component test for group selection validation
- [ ] `features/workflows/__tests__/WorkflowGuard.test.tsx` — Guard component unit tests
- [ ] `tests/integration/workflowGroups.test.ts` — DB round-trip tests for multi-group register/login

Update `tests/integration/schema.test.ts` to assert `workflow_groups` and `active_workflow_group` columns exist on `profiles`.

---

## Environment Availability

Step 2.6: External dependency audit.

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| PostgreSQL (Docker) | Integration tests | ✓ (docker configured) | 16-alpine | — |
| Node.js | Server + test runner | ✓ | system | — |
| postgres.js `sql.array()` | Array column writes | ✓ | 3.4.8 | — |

No new external dependencies. All tools available.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Unit config | `vitest.config.ts` (jsdom) |
| Integration config | `vitest.integration.config.ts` (node, Docker PG) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Integration command | `npm run test:integration` |

### Sampling Rate

- **Per task commit:** `npx vitest run` (unit tests only, <10s)
- **Per wave merge:** `npm run test:all` (unit + integration)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `server/routes/__tests__/auth.register.test.ts` — ROLE-01 Zod validation
- [ ] `components/__tests__/RegisterPage.test.tsx` — ROLE-01 UI validation
- [ ] `features/workflows/__tests__/WorkflowGuard.test.tsx` — ROLE-05 guard
- [ ] `tests/integration/workflowGroups.test.ts` — ROLE-02 DB + JWT round-trip
- [ ] Update `tests/integration/schema.test.ts` — ROLE-02 column presence

---

## Open Questions

1. **`/specialist` redirect vs extract**
   - What we know: Existing `/meeting` logic is embedded inline in `App.tsx` (large component).
   - What's unclear: Phase 4 decides whether to extract or redirect.
   - Recommendation: Redirect `/specialist` → `/meeting` in Phase 8 (Option B). Document extraction as follow-up.

2. **Group switcher placement**
   - What we know: App header already has navigation buttons + `QuotaBadge`. Sidebar does not exist.
   - What's unclear: Visual weight — single user with 1 group shouldn't see a noisy switcher.
   - Recommendation: Conditionally render switcher only when `user.workflowGroups.length > 1`. Place in header next to existing nav buttons.

3. **Settings page route**
   - What we know: No user-facing `/settings` route exists yet. Admin settings are at `/admin/email-settings`.
   - What's unclear: Should a new `/settings` route be created, or should workflow group editing be added inline somewhere.
   - Recommendation: Add `/settings` as a new route with a `WorkflowGroupsSection` component. Keep it minimal (just the groups section in Phase 8).

---

## State of the Art

| Old Approach (pre-Phase 8) | Phase 8 Approach | Impact |
|----------------------------|------------------|--------|
| Single `role` field in JWT | `role` + `workflowGroups[]` + `activeWorkflowGroup` in JWT | JWT payload grows ~80 bytes — negligible |
| Single `/meeting` route for all users | Per-group routes `/reporter`, `/specialist`, `/officer` | Route guard replaces implicit single-path routing |
| `workflowGroup` as single enum in `profiles` (from old RESEARCH.md) | `text[]` + separate `active_workflow_group` text column | Supports D-05 multi-group requirement |
| No register group selection | Multi-select toggle buttons + Zod array validation | ROLE-01 fulfilled |

**Superseded:** The old `08-RESEARCH.md` recommended a single `workflow_group` column (singular). This was written before D-05 was locked. The new design uses `workflow_groups text[]` + `active_workflow_group text` to honor the multi-group decision.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `server/auth.ts` — `AuthUser` interface, `signToken`, `requireAuth` implementation
- `server/routes/auth.ts` — `RegisterSchema`, register/login handler patterns
- `db/schema.sql` — current `profiles` table structure
- `db/migrations/006_add_free_tier.sql`, `008_add_app_settings.sql` — migration file patterns
- `App.tsx` — routing pattern (`route` state, `navigate()`, lazy imports, guard structure)
- `components/RegisterPage.tsx` — existing form pattern + Tailwind classes
- `.planning/STATE.md` — Zod v4 `.issues`, `tx: any` cast, `PopStateEvent` patterns

### Secondary (MEDIUM confidence — npm registry verified)

- `npm view postgres version` → 3.4.8 (postgres.js `sql.array()` available since v3)
- `npm view zod version` → 4.3.6 (`z.enum` + `z.array().min()` confirmed in API)
- `npm view jsonwebtoken version` → 9.0.3 (payload extensibility confirmed)

### Tertiary (LOW confidence — general knowledge, not codebase-verified)

- postgres.js `sql.array()` behavior for `text[]` columns — well-documented but not verified against a live query in this project's test DB. Flag for validation in Wave 0 integration test.

---

## Metadata

**Confidence breakdown:**
- DB schema approach: HIGH — verified existing migration files and schema.sql directly
- JWT extension: HIGH — verified `server/auth.ts` interface and call sites
- Frontend routing: HIGH — verified App.tsx route pattern directly
- postgres.js array syntax: MEDIUM — confirmed from package docs, not a live query
- Test infrastructure: HIGH — verified vitest configs and existing test files

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable stack; no fast-moving dependencies)
