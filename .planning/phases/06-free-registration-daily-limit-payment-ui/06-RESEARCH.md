# Phase 06: Free Registration + Daily Conversion Limit + Payment UI (Demo) - Research

**Researched:** 2026-03-16
**Domain:** Auth extension (self-register), per-user daily quota enforcement, SaaS pricing UI
**Confidence:** HIGH (stack and patterns verified against codebase; library APIs checked against official docs)

---

## Summary

Phase 06 extends the current invite-only Express/JWT/PostgreSQL app in three coordinated areas. First, it opens self-registration so anyone can create a "free" tier account via `POST /api/auth/register`. Second, it adds a per-user per-day conversion quota enforced at the DB layer (a dedicated table with date-keyed rows), exposed to the frontend through a quota API response field. Third, it adds a pricing/upgrade UI in React that is purely cosmetic — no Stripe or payment gateway wiring — but structured so real Stripe integration can be dropped in later without changing component structure.

The three pieces share one critical design decision: the role column on `public.profiles` must be extended from the binary `user | admin` set to the three-tier `free | user | admin` set. "free" replaces the implied default for self-registered accounts. Existing admin-created accounts that carry role = 'user' keep their unlimited access. This is a non-breaking DB migration using a simple `ALTER TABLE … ADD CONSTRAINT CHECK` loosening — existing 'user' rows remain valid.

**Primary recommendation:** Add `express-rate-limit` (v8, already available pattern — install needed) for the registration endpoint's IP-based brute-force protection, and use a lightweight DB-native daily quota table (no Redis needed at this scale). Do NOT install Stripe or any payment library for this phase.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express-rate-limit | ^8.x | IP rate limiting on `/api/auth/register` | De-facto standard for Express; zero deps; memory store sufficient for single-server Railway deployment |
| bcryptjs | ^2.4.3 (already installed) | Password hashing for new registrations | Already in codebase; 12 rounds matches admin route |
| zod | ^4.3.6 (already installed) | Server-side validation of register body | Already in codebase; consistent with project validation pattern |
| postgres (sql tag) | ^3.4.8 (already installed) | Daily quota table queries | Already in codebase; no new ORM needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new for frontend) | — | Pricing UI built with existing Tailwind CSS | Project already uses Tailwind; no component library needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DB-native daily quota table | Redis + ioredis | Redis adds infra cost and complexity; single-server Railway deployment doesn't justify it |
| express-rate-limit memory store | rate-limit-postgresql | Overkill; registration abuse is IP-level concern not user-level; memory store sufficient |
| Custom pricing components | shadcn/ui pricing blocks | shadcn not installed in project; Tailwind + plain React JSX matches existing component style |

**Installation:**
```bash
npm install express-rate-limit
```

(All other dependencies are already present in package.json.)

---

## Architecture Patterns

### Recommended Project Structure

```
server/
├── routes/
│   ├── auth.ts              # Add POST /register here (alongside existing /login)
│   └── conversions.ts       # New: daily quota check middleware + counter endpoint
├── middleware/
│   └── quotaGuard.ts        # New: requireFreeQuota middleware
├── auth.ts                  # Extend AuthUser type: role now "free" | "user" | "admin"

db/
├── schema.sql               # Add daily_conversion_quota table
├── migrations/
│   └── 006_add_free_tier.sql  # Migration: extend role check + add quota table

features/
├── pricing/                 # New feature folder
│   ├── PricingPage.tsx      # Plans comparison (Free vs Pro)
│   ├── UpgradeModal.tsx     # Demo payment form modal
│   └── QuotaBanner.tsx      # Inline banner: "X conversions left today"

components/
└── LoginPage.tsx            # Add "Đăng ký" tab/link → RegistrationPage
```

### Pattern 1: Self-Registration Endpoint

**What:** Add `POST /api/auth/register` to the existing `server/routes/auth.ts` router. Mirror the admin create-user flow but auto-assign `role = 'free'` and remove the admin auth requirement.

**When to use:** Public endpoint; no `requireAuth` middleware; rate-limited by IP.

**Example:**
```typescript
// server/routes/auth.ts — add after existing /login route
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,                  // 5 attempts per IP per 15 min
  message: { error: 'Quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau.' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

router.post('/register', registerLimiter, async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  const { email, password } = parsed.data;
  try {
    const [existing] = await sql`SELECT id FROM auth.users WHERE email = ${email}`;
    if (existing) {
      return res.status(409).json({ error: 'Email đã được sử dụng' });
    }
    const password_hash = await bcrypt.hash(password, 12);
    const [newUser] = await sql`
      INSERT INTO auth.users (email, password_hash, created_at)
      VALUES (${email}, ${password_hash}, NOW())
      RETURNING id, email, created_at
    `;
    await sql`
      INSERT INTO public.profiles (user_id, role, created_at, updated_at)
      VALUES (${newUser.id}, 'free', NOW(), NOW())
    `;
    const token = signToken({ userId: newUser.id, email: newUser.email, role: 'free' });
    return res.status(201).json({ token, user: { id: newUser.id, email: newUser.email, role: 'free' } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
```

### Pattern 2: Daily Conversion Quota — DB Table Design

**What:** A dedicated `public.daily_conversion_usage` table stores one row per (user_id, date). The date column uses `CURRENT_DATE AT TIME ZONE 'UTC'` so midnight UTC is the reset boundary. The quota check is a single UPSERT: increment count, check against limit, return remaining.

**When to use:** On every audio conversion request from a `free` role user.

**DB Schema:**
```sql
-- db/migrations/006_add_free_tier.sql

-- 1. Extend role constraint to allow 'free'
-- The profiles table has no CHECK constraint currently, so 'free' is immediately valid.
-- Update the admin route validation to also accept 'free' for completeness.

-- 2. Daily conversion quota table
CREATE TABLE IF NOT EXISTS public.daily_conversion_usage (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date  date NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC'),
  count       integer NOT NULL DEFAULT 0,
  CONSTRAINT daily_conversion_usage_user_date_key UNIQUE (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_conversion_usage_user_date
  ON public.daily_conversion_usage(user_id, usage_date DESC);
```

**Quota check + increment (atomic UPSERT):**
```sql
-- Returns new count after increment
INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
VALUES ($user_id, CURRENT_DATE AT TIME ZONE 'UTC', 1)
ON CONFLICT (user_id, usage_date)
DO UPDATE SET count = daily_conversion_usage.count + 1
RETURNING count;
```

**Pattern 3: Express Middleware — Quota Guard**

**What:** A middleware that runs before conversion processing. Reads current usage, compares against tier limit, blocks with 429 and remaining quota info if at limit.

```typescript
// server/middleware/quotaGuard.ts
import { Request, Response, NextFunction } from 'express';
import sql from '../db';

const FREE_DAILY_LIMIT = 1;

export async function requireFreeQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = req.user!;
  if (user.role !== 'free') {
    next(); // paid/admin users: unlimited
    return;
  }
  // Check today's count WITHOUT incrementing (peek-only, increment happens in route)
  const [row] = await sql`
    SELECT count FROM public.daily_conversion_usage
    WHERE user_id = ${user.userId}
      AND usage_date = (CURRENT_DATE AT TIME ZONE 'UTC')
  `;
  const usedToday = row?.count ?? 0;
  if (usedToday >= FREE_DAILY_LIMIT) {
    res.status(429).json({
      error: 'Bạn đã đạt giới hạn chuyển đổi hôm nay.',
      quota: { used: usedToday, limit: FREE_DAILY_LIMIT, remaining: 0 },
      upgradeRequired: true,
    });
    return;
  }
  next();
}
```

**The transcription route increments only on success:**
```typescript
// In server/routes/transcriptions.ts — after successful transcription save
if (req.user!.role === 'free') {
  await sql`
    INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
    VALUES (${req.user!.userId}, CURRENT_DATE AT TIME ZONE 'UTC', 1)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET count = daily_conversion_usage.count + 1
  `;
}
```

### Pattern 4: Quota API Endpoint for Frontend

**What:** A dedicated `GET /api/quota` endpoint so the UI can show "X conversions remaining today" without needing to embed that logic in every transcription response.

```typescript
// server/routes/quota.ts
router.get('/', requireAuth, async (req, res) => {
  const user = req.user!;
  if (user.role !== 'free') {
    return res.json({ role: user.role, unlimited: true });
  }
  const [row] = await sql`
    SELECT count FROM public.daily_conversion_usage
    WHERE user_id = ${user.userId}
      AND usage_date = (CURRENT_DATE AT TIME ZONE 'UTC')
  `;
  const used = row?.count ?? 0;
  const limit = 1;
  return res.json({ role: 'free', used, limit, remaining: Math.max(0, limit - used) });
});
```

### Pattern 5: Pricing Page + Upgrade Modal (React, Demo Only)

**What:** Two new React components. `PricingPage.tsx` shows Free vs Pro feature cards. `UpgradeModal.tsx` shows a mock payment form that simulates a 2-second processing animation then shows a "success" state without any real gateway call.

**Stripe-ready structure (no Stripe installed):**
```typescript
// features/pricing/UpgradeModal.tsx
// Structure mirrors what Stripe's CardElement replaces — swap later without restructuring
interface PaymentFormData {
  cardNumber: string;  // display only, never sent to backend
  expiry: string;
  cvv: string;
}

type PaymentState = 'idle' | 'processing' | 'success' | 'error';
```

**QuotaBanner component:**
```typescript
// features/pricing/QuotaBanner.tsx
// Shows inline: "Bạn còn 0 lần chuyển đổi hôm nay. Nâng cấp để tiếp tục."
// Triggers when remaining === 0 or user hits 429 from transcription API
```

### Anti-Patterns to Avoid

- **Storing quota in JWT:** JWTs are issued at login and are stateless — daily count changes every conversion. Never put quota state in the token itself; always query DB.
- **Decrementing from a pre-set daily credit:** Count UP from 0 and compare against limit. Counting down creates negative edge cases on concurrent requests.
- **Blocking registration if profile insert fails:** Use a DB transaction (`sql.begin()`) so that if the profile insert fails, the auth.users row is also rolled back. Otherwise orphaned auth.users rows exist without profiles.
- **Rate-limiting registration by user (not IP):** The user doesn't have a JWT yet. Rate limiting must be by IP at the route level.
- **Installing Stripe for the demo UI:** No real payment gateway. Stripe Elements cannot be mocked safely without their library. Instead, use plain `<input type="text">` fields with client-side formatting only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IP rate limiting for /register | Custom counter in memory | `express-rate-limit` | Handles distributed resets, standard 429 headers, skip logic, trust proxy |
| Password hashing | Custom crypto | `bcryptjs` (already installed) | Constant-time comparison, adaptive cost factor, widely audited |
| Input validation on register body | Manual if/else checks | `zod` (already installed) | Type-safe, composable, refine for cross-field checks (confirmPassword) |
| Daily quota as cron job | Scheduled cleanup job | `ON CONFLICT DO UPDATE` UPSERT with date column | DB-native atomicity; date column auto-resets by design |

**Key insight:** The daily quota system requires no cron job or background worker. Using a date-keyed unique constraint means yesterday's rows simply don't match today's `CURRENT_DATE` — they expire by being irrelevant, not by being deleted. Old rows can be cleaned up asynchronously with a weekly `DELETE WHERE usage_date < NOW() - INTERVAL '30 days'` if storage is a concern.

---

## Common Pitfalls

### Pitfall 1: Role Validation in admin.ts Breaks on 'free'

**What goes wrong:** `server/routes/admin.ts` line 44 has `if (!['user', 'admin'].includes(role))` — this blocks admin from setting a user to 'free' tier if they want to downgrade a paid user.
**Why it happens:** The 'free' role didn't exist when that code was written.
**How to avoid:** Extend the allowed roles array in admin.ts to `['free', 'user', 'admin']` as part of the migration.
**Warning signs:** 400 error when admin tries to set role to 'free'.

### Pitfall 2: Race Condition on Concurrent Conversion Requests

**What goes wrong:** Two concurrent conversion requests from the same free user both pass the quota check (count = 0 < 1), then both increment, resulting in count = 2 with both conversions processed.
**Why it happens:** Peek-then-act is not atomic.
**How to avoid:** Use a single atomic UPSERT that increments and returns new count. If new count > limit, return an error and optionally undo with a decrement. Alternatively, decrement in the UPSERT: increment first, check the returned count; if over limit, decrement and reject.

**Safer atomic pattern:**
```sql
-- Increment first, then check
INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
VALUES ($user_id, CURRENT_DATE AT TIME ZONE 'UTC', 1)
ON CONFLICT (user_id, usage_date)
DO UPDATE SET count = daily_conversion_usage.count + 1
RETURNING count;
-- If returned count > FREE_DAILY_LIMIT: decrement and return 429
```

### Pitfall 3: Orphaned auth.users on Profile Insert Failure

**What goes wrong:** `auth.users` row is created, then profile insert fails. User exists in auth system but has no role profile, causing login to default to `role = 'user'` (the fallback in auth.ts line 35: `profile?.role ?? 'user'`).
**Why it happens:** Registration uses two separate INSERT statements without a transaction.
**How to avoid:** Wrap both inserts in `sql.begin(sql => [...])` using the postgres.js transaction API.

```typescript
// postgres.js transaction pattern
const [newUser] = await sql.begin(async sql => {
  const [u] = await sql`INSERT INTO auth.users ... RETURNING id, email`;
  await sql`INSERT INTO public.profiles (user_id, role, ...) VALUES (${u.id}, 'free', ...)`;
  return [u];
});
```

### Pitfall 4: JWT role='user' Fallback Gives Free Users Unlimited Access

**What goes wrong:** If a free user's profile row is missing (or the login route fallback `profile?.role ?? 'user'` fires), they get role='user' in their JWT, bypassing the quota guard which only checks `user.role === 'free'`.
**Why it happens:** The fallback was designed for the two-tier system where 'user' was the lowest tier.
**How to avoid:** Change the fallback in `server/routes/auth.ts` line 35 from `'user'` to `'free'`: `const role = profile?.role ?? 'free'`.

### Pitfall 5: Timezone Mismatch Between Server and DB

**What goes wrong:** Node server uses local timezone, PostgreSQL uses another. `new Date().toISOString().split('T')[0]` in Node.js may give a different date than `CURRENT_DATE AT TIME ZONE 'UTC'` in Postgres if the server is not UTC.
**Why it happens:** Railway deployments default to UTC but Railway Postgres may differ.
**How to avoid:** Always compute the date boundary in SQL using `CURRENT_DATE AT TIME ZONE 'UTC'`, never in application code. This is verified server-side only.

### Pitfall 6: Registration Form's "Đăng ký" Tab Loses Existing Login Form State

**What goes wrong:** Switching between Login/Register tabs resets form state or causes layout shift.
**Why it happens:** Conditional rendering unmounts the form.
**How to avoid:** Use a tab state variable at the `LoginPage` level; conditionally render two separate form components. Don't use a single form with changing fields.

---

## Code Examples

Verified patterns from official sources and project conventions:

### Registration Endpoint Zod Validation

```typescript
// Source: zod.dev official docs + project's existing zod usage in services
import { z } from 'zod';

const RegisterSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .regex(/[A-Z]/, 'Phải có ít nhất 1 chữ hoa')
    .regex(/[0-9]/, 'Phải có ít nhất 1 số'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});
```

### express-rate-limit v8 Configuration

```typescript
// Source: express-rate-limit official docs (mintlify.app/reference/configuration)
import rateLimit from 'express-rate-limit';

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
```

### Postgres Transaction (postgres.js v3 pattern)

```typescript
// Source: postgres.js documentation — sql.begin() for transactions
// Already used pattern in project (postgres ^3.4.8)
const result = await sql.begin(async sql => {
  const [user] = await sql`
    INSERT INTO auth.users (email, password_hash, created_at)
    VALUES (${email}, ${hash}, NOW())
    RETURNING id, email
  `;
  await sql`
    INSERT INTO public.profiles (user_id, role, created_at, updated_at)
    VALUES (${user.id}, 'free', NOW(), NOW())
  `;
  return user;
});
```

### Quota UPSERT Pattern

```typescript
// Source: PostgreSQL 16 ON CONFLICT docs
const [quota] = await sql`
  INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
  VALUES (
    ${userId},
    (CURRENT_DATE AT TIME ZONE 'UTC'),
    1
  )
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET count = daily_conversion_usage.count + 1
  RETURNING count
`;
// If quota.count > FREE_DAILY_LIMIT: undo and return 429
```

### PricingPage Component Structure (Tailwind, no external library)

```typescript
// Pattern: matches existing Tailwind component style in project
const PLANS = [
  {
    name: 'Free',
    price: '0',
    currency: 'VND',
    features: ['1 file/ngày', 'Phiên âm cơ bản', 'Xuất văn bản'],
    cta: 'Gói hiện tại',
    disabled: true,
  },
  {
    name: 'Pro',
    price: '199.000',
    currency: 'VND/tháng',
    features: ['Không giới hạn file', 'Phiên âm nâng cao', 'Xuất PDF/DOCX', 'Ưu tiên xử lý'],
    cta: 'Nâng cấp ngay',
    disabled: false,
    highlight: true,
  },
];
```

### Mock Payment Form State Machine

```typescript
// No Stripe, no payment library — pure UI state
type PaymentStep = 'form' | 'processing' | 'success' | 'error';

const [step, setStep] = useState<PaymentStep>('form');

const handleSubmit = async () => {
  setStep('processing');
  await new Promise(resolve => setTimeout(resolve, 2000)); // mock delay
  setStep('success'); // always success in demo
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Invite-only auth | Self-registration with role tiers | Phase 06 | Enables user growth without admin bottleneck |
| Binary roles (user/admin) | Tiered roles (free/user/admin) | Phase 06 | Enables monetization gating |
| express-rate-limit `max` param | `limit` param (renamed in v7) | express-rate-limit v7.0 | `max` still works but `limit` is canonical |
| Cron job for quota reset | Date-keyed DB row | Phase 06 | No infrastructure dependency |

**Deprecated/outdated:**
- `standardHeaders: true` in express-rate-limit: Replaced by `standardHeaders: 'draft-7'` for the IETF standard. The boolean `true` still works in v8 but triggers a deprecation warning.
- `legacyHeaders: true` (default): Set to `false` for cleaner response headers; legacy `X-RateLimit-*` headers are not needed for new endpoints.

---

## Open Questions

1. **Email verification for registration**
   - What we know: Requirements do not mandate email verification.
   - What's unclear: Whether unverified accounts are acceptable business risk.
   - Recommendation: Skip email verification for Phase 06. Add it in a future phase. Document this decision in the plan.

2. **Quota enforcement point: middleware vs. route handler**
   - What we know: Race condition exists in any peek-then-act pattern.
   - What's unclear: How much concurrent usage a free tier user would realistically generate.
   - Recommendation: Use the atomic UPSERT-then-check pattern (increment first, reject if over limit) in the route handler, not a pre-check middleware. This eliminates the race entirely.

3. **Admin upgrading a 'free' user to 'user' role**
   - What we know: `admin.ts` currently only allows 'user' | 'admin'.
   - What's unclear: Whether Phase 06 should expose 'free' → 'user' upgrade path in admin UI.
   - Recommendation: Update the role validation array in admin.ts to `['free', 'user', 'admin']` to future-proof. No admin UI changes needed in Phase 06.

4. **Quota banner placement in main app**
   - What we know: The main transcription interface is in `App.tsx` (large file).
   - What's unclear: Where to mount the `QuotaBanner` without significant App.tsx refactor.
   - Recommendation: Render `QuotaBanner` inside the `FileUpload` section, conditionally on `user.role === 'free'`. It receives remaining count from a `useQuota` hook that calls `GET /api/quota`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.0.18 |
| Config file | vitest.config in package.json scripts |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test:all` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REG-01 | POST /api/auth/register creates free user | integration | `npm run test:integration -- --grep "register"` | Wave 0 |
| REG-02 | Duplicate email returns 409 | integration | `npm run test:integration -- --grep "duplicate"` | Wave 0 |
| REG-03 | Weak password rejected (< 8 chars) | integration | `npm run test:integration -- --grep "password"` | Wave 0 |
| REG-04 | Rate limiter blocks after 5 attempts | integration | manual (IP-based, hard to unit test) | manual-only |
| QUOTA-01 | Free user blocked after 1 conversion/day | integration | `npm run test:integration -- --grep "quota"` | Wave 0 |
| QUOTA-02 | Admin/user role bypasses quota | integration | `npm run test:integration -- --grep "quota bypass"` | Wave 0 |
| QUOTA-03 | Quota resets on next UTC day | integration | `npm run test:integration -- --grep "quota reset"` | Wave 0 |
| QUOTA-04 | GET /api/quota returns correct remaining | integration | `npm run test:integration -- --grep "quota endpoint"` | Wave 0 |
| UI-01 | PricingPage renders Free and Pro plans | unit | `npm run test:unit -- --grep "PricingPage"` | Wave 0 |
| UI-02 | UpgradeModal shows processing then success | unit | `npm run test:unit -- --grep "UpgradeModal"` | Wave 0 |
| UI-03 | QuotaBanner shows correct remaining count | unit | `npm run test:unit -- --grep "QuotaBanner"` | Wave 0 |
| UI-04 | RegisterPage form validates and submits | unit | `npm run test:unit -- --grep "RegisterPage"` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test:all`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/integration/auth.test.ts` — covers REG-01, REG-02, REG-03
- [ ] `tests/integration/quota.test.ts` — covers QUOTA-01 through QUOTA-04
- [ ] `components/__tests__/PricingPage.test.tsx` — covers UI-01
- [ ] `components/__tests__/UpgradeModal.test.tsx` — covers UI-02
- [ ] `components/__tests__/QuotaBanner.test.tsx` — covers UI-03
- [ ] `components/__tests__/RegisterPage.test.tsx` — covers UI-04

---

## Sources

### Primary (HIGH confidence)

- Codebase direct read — `server/routes/auth.ts`, `server/routes/admin.ts`, `server/auth.ts`, `db/schema.sql`, `lib/auth.ts` — current state of auth flow and DB schema
- express-rate-limit official docs (mintlify.app/reference/configuration) — windowMs, limit, standardHeaders options; v8 is current version
- PostgreSQL 16 ON CONFLICT docs (built-in knowledge, consistent with schema.sql usage) — UPSERT pattern for quota table

### Secondary (MEDIUM confidence)

- betterstack.com/community/guides/scaling-nodejs/rate-limiting-express/ — verified rate limiter config against official docs
- neon.com/guides/rate-limiting — DB-native daily quota design pattern (advisory lock + UPSERT approach); aligned with project's single-server deployment
- express-rate-limit GitHub releases — confirms v7.5.0 (Dec 2024) and v8.x series; `limit` param rename from `max` in v7

### Tertiary (LOW confidence)

- WebSearch results on SaaS pricing UI patterns — no single authoritative source; patterns consistent across multiple Tailwind CSS pricing examples
- WebSearch on demo payment form patterns — confirmed no standard library for mock payment UIs; plain React state machine is the correct approach

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — express-rate-limit, bcryptjs, zod, postgres.js are all verified in package.json; only express-rate-limit is a new install
- Architecture: HIGH — patterns derived from direct codebase read of existing auth routes; DB UPSERT verified against PostgreSQL 16 syntax already used in schema.sql
- Pitfalls: HIGH — transaction atomicity, role fallback bug, and race condition are code-verified from the actual auth.ts and admin.ts source
- Pricing UI: MEDIUM — no authoritative "correct" pattern; Tailwind-only approach is appropriate given project conventions

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable stack; express-rate-limit v8 API unlikely to change in 30 days)
