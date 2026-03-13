# Phase 03: Docker PostgreSQL Testing - Research

**Researched:** 2026-03-13
**Domain:** Docker PostgreSQL local testing, Vitest integration tests, SQL schema migration, auth simulation
**Confidence:** HIGH (core stack), MEDIUM (auth.uid() simulation), HIGH (Docker/Vitest patterns)

---

## Summary

This phase rebuilds the database schema from scratch, runs it in Docker PostgreSQL for local testing, and wires Vitest to execute real integration tests against it — replacing the current mock-supabase unit test approach for DB-touching code.

The project is a pure SPA (React 19 + Vite + TypeScript) with no backend. It currently talks to Supabase cloud via `lib/supabase.ts`. The Vitest stack (`vitest@4`, `jsdom`) is already installed. There is NO existing docker-compose.yml in the project root, and no `pg` or `postgres` npm package installed yet.

The main challenge is that Supabase uses a special `auth` schema with `auth.uid()` and `auth.users` that do not exist in plain PostgreSQL. Integration tests must either: (a) create a stub `auth` schema in the local DB, or (b) bypass RLS entirely and test service logic without RLS. Option (a) is recommended for correctness.

**Primary recommendation:** Use `postgres:16-alpine` in Docker Compose, write a single `schema.sql` migration file, create a stub `auth` schema with `auth.uid()` simulation, configure a separate `vitest.integration.config.ts` using `environment: 'node'`, use transaction rollback for test isolation, and connect with the `postgres` npm package (postgres.js).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `postgres` (postgres.js) | ^3.4 | PostgreSQL client for Node.js | Fastest, modern, native ESM, async/await API, no callback hell |
| `docker` / `docker compose` | v29+ (already installed) | Run PostgreSQL container | Already available on this machine |
| `postgres:16-alpine` image | 16-alpine | PostgreSQL Docker image | Current stable LTS, matches Supabase's Postgres 15/16 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dotenv` | (already in Vite) | Load `.env.test` for DB URL | Integration test env vars |
| `@types/pg` | (not needed for postgres.js) | — | Only if using `pg` package |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `postgres` (postgres.js) | `pg` (node-postgres) | `pg` is older, callback-based, needs `pg-promise` for ergonomics |
| `postgres` (postgres.js) | Supabase local CLI | Supabase CLI spins up 8+ services; massive overkill for DB schema testing |
| Transaction rollback isolation | Schema-per-test isolation | Schema-per-test is slower; transactions are faster but cannot test DDL |
| Plain PostgreSQL | Testcontainers | Testcontainers starts Docker programmatically; docker-compose.yml is simpler and more controllable |

**Installation:**
```bash
npm install --save-dev postgres dotenv
```

---

## Architecture Patterns

### Recommended Project Structure
```
/
├── docker-compose.test.yml          # PostgreSQL container for testing
├── db/
│   ├── schema.sql                   # Full DDL: all tables + indexes + stub auth
│   ├── reset.sql                    # DROP all tables in correct order
│   └── seed.test.sql                # Optional: seed test fixtures
├── scripts/
│   └── db-reset.sh                  # Shell: drop + recreate from schema.sql
├── tests/
│   └── integration/
│       ├── helpers/
│       │   └── db.ts                # Shared pg client + transaction helpers
│       ├── tokenUsageService.test.ts
│       └── supabase.test.ts
├── vitest.config.ts                 # Existing: unit tests (jsdom)
└── vitest.integration.config.ts    # New: integration tests (node env)
```

### Pattern 1: Separate Vitest Configs (Unit vs Integration)

**What:** Two config files — existing `vitest.config.ts` for jsdom unit tests, new `vitest.integration.config.ts` for node-environment DB tests.

**When to use:** Always. Mixing jsdom and node environments in one run causes conflicts. Integration tests need real DB access; unit tests should stay fast with mocks.

**Example:**
```typescript
// vitest.integration.config.ts
// Source: https://vitest.dev/guide/projects (Vitest 4 docs)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['./tests/integration/helpers/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run serially to avoid transaction conflicts on shared DB
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
```

```json
// package.json scripts additions
{
  "test:unit": "vitest run",
  "test:integration": "vitest run --config vitest.integration.config.ts",
  "test:all": "vitest run && vitest run --config vitest.integration.config.ts"
}
```

> **Note on Vitest 4 projects API:** Vitest >= 3.2 deprecates `workspace` file in favor of `test.projects` in root config. For simplicity in this project, two separate config files (one per `--config` flag) is cleaner and avoids the projects API complexity.

### Pattern 2: Transaction Rollback for Test Isolation

**What:** Each test wraps DB operations in a transaction that is rolled back in `afterEach`. The table data is always clean. No `TRUNCATE` needed.

**When to use:** When tests only do INSERT/SELECT/UPDATE/DELETE (no DDL). This is the case here — all service functions are DML only.

**Example:**
```typescript
// tests/integration/helpers/db.ts
import postgres from 'postgres';

const TEST_DB_URL = process.env.TEST_DATABASE_URL
  ?? 'postgres://postgres:postgres@localhost:5433/meeting_test';

// Module-level client — shared across all tests in a file
export const sql = postgres(TEST_DB_URL);

// Per-test transaction client
export async function withTestTransaction<T>(
  fn: (tx: postgres.TransactionSql) => Promise<T>
): Promise<T> {
  return sql.begin(async (tx) => {
    try {
      const result = await fn(tx);
      // Always rollback — throw a sentinel to abort
      throw Object.assign(new Error('__rollback__'), { __rollback__: true });
      return result; // unreachable, for type inference
    } catch (e: any) {
      if (e.__rollback__) return undefined as unknown as T;
      throw e;
    }
  });
}
```

> **Caution:** The pattern above using throw-to-rollback is one approach. An alternative is to expose `BEGIN`/`ROLLBACK` as manual SQL calls using `postgres.js`'s `sql.unsafe()`. The simplest reliable pattern for postgres.js is:

```typescript
// Simpler: manual BEGIN + ROLLBACK per test
let tx: postgres.ReservedSql;

beforeEach(async () => {
  tx = await sql.reserve();
  await tx`BEGIN`;
});

afterEach(async () => {
  await tx`ROLLBACK`;
  tx.release();
});
```

### Pattern 3: Stub `auth` Schema for auth.uid() Simulation

**What:** Create a minimal `auth` schema in the local PostgreSQL with `auth.users` table and `auth.uid()` function. `auth.uid()` reads from `request.jwt.claims` (a PostgreSQL config variable), just like real Supabase.

**When to use:** When testing RLS policies. If testing only service logic (no RLS), this can be skipped and RLS disabled.

**SQL for auth stub (add to schema.sql):**
```sql
-- Stub auth schema to simulate Supabase auth
CREATE SCHEMA IF NOT EXISTS auth;

-- Stub auth.users table (referenced by FK in token_usage_logs)
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text,
    created_at timestamptz DEFAULT now()
);

-- auth.uid() reads from JWT claims config variable — same as real Supabase
-- Source: https://github.com/supabase/supabase/issues/4244
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid
$$;

-- auth.role() stub
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
  )
$$;
```

**How to simulate a logged-in user in tests:**
```sql
-- In a transaction, set the JWT context before running queries:
SET LOCAL "request.jwt.claims" TO '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';
SET LOCAL ROLE authenticated;
-- Now auth.uid() returns the UUID above
```

Or in TypeScript test helper:
```typescript
async function setAuthUser(tx: postgres.ReservedSql, userId: string) {
  await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
  await tx`SET LOCAL ROLE authenticated`;
}
```

> **MEDIUM confidence note:** The exact PostgreSQL role name `authenticated` must be created in the local DB (Supabase creates it automatically; in our stub we must CREATE ROLE authenticated). If skipping RLS testing, this complexity is unnecessary.

### Pattern 4: DB Reset Script

**What:** A shell script + SQL file that drops all tables in correct dependency order and recreates from `schema.sql`.

```bash
#!/bin/bash
# scripts/db-reset.sh
set -e

DB_URL="${TEST_DATABASE_URL:-postgres://postgres:postgres@localhost:5433/meeting_test}"

echo "Resetting database..."
psql "$DB_URL" -f db/reset.sql
psql "$DB_URL" -f db/schema.sql
echo "Database reset complete."
```

```sql
-- db/reset.sql — drop in dependency order (FK children first)
DROP TABLE IF EXISTS public.token_usage_logs CASCADE;
DROP TABLE IF EXISTS public.summaries CASCADE;
DROP TABLE IF EXISTS public.transcriptions CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS auth.users CASCADE;
DROP SCHEMA IF EXISTS auth CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
```

### Anti-Patterns to Avoid

- **Sharing one Vitest config for both jsdom and node environments:** Causes subtle failures because `window`/`document` do not exist in node environment.
- **Pointing integration tests at the Supabase cloud DB:** Risk of polluting production data. Always use a local Docker DB for integration tests.
- **Using `TRUNCATE` instead of transaction rollback:** `TRUNCATE` is slower and requires knowing table order. Transaction rollback is cleaner.
- **Forgetting `CASCADE` in DROP TABLE:** Tables with FK references will fail to drop without `CASCADE`.
- **Not creating the `authenticated` role:** RLS policies that `SET LOCAL ROLE authenticated` will fail if the role doesn't exist in local PostgreSQL.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PostgreSQL client | Custom fetch-based SQL | `postgres` npm package | Connection pooling, parameterized queries, transaction API |
| Container lifecycle | Custom Docker subprocess management | docker-compose.yml + npm scripts | Declarative, reliable, reproducible |
| Schema migrations | Custom migration runner | Single `schema.sql` file (for this phase) | Project has no migration framework; flat SQL file is sufficient |
| Test DB URL management | Hardcoded connection strings | `dotenv` + `.env.test` file | Different devs, different ports |

**Key insight:** The project does not use Prisma or any ORM. Raw SQL via postgres.js is the correct approach for integration tests. Do not introduce an ORM just for testing.

---

## Common Pitfalls

### Pitfall 1: auth.users FK Constraint Blocks INSERT
**What goes wrong:** `token_usage_logs.user_id` has `REFERENCES auth.users(id) ON DELETE CASCADE`. Inserting a test token log row fails because there's no matching row in `auth.users`.
**Why it happens:** The stub `auth.users` table is empty. The FK constraint is enforced.
**How to avoid:** In `schema.sql`, either (a) create the FK without REFERENCES to auth.users in test mode, or (b) insert a test user row into `auth.users` in the test setup before inserting into `token_usage_logs`.
**Warning signs:** `ERROR: insert or update on table "token_usage_logs" violates foreign key constraint`

### Pitfall 2: Port Conflict with Local PostgreSQL
**What goes wrong:** Docker PostgreSQL fails to start because port 5432 is already in use by a native PostgreSQL installation.
**Why it happens:** macOS often has PostgreSQL installed via Homebrew.
**How to avoid:** Use port `5433` (not 5432) in `docker-compose.test.yml` for the test container.
**Warning signs:** `Error: port is already allocated` when running `docker compose up`

### Pitfall 3: Vitest Runs Integration Tests in jsdom Environment
**What goes wrong:** `postgres.js` uses Node.js-specific APIs (`net`, `tls`) that don't exist in jsdom. Tests crash with `Cannot find module 'net'`.
**Why it happens:** The existing `vitest.config.ts` has `environment: 'jsdom'`.
**How to avoid:** Use a separate `vitest.integration.config.ts` with `environment: 'node'`. Never merge the two.
**Warning signs:** `Error: The "net" module cannot be loaded in a browser environment`

### Pitfall 4: Concurrent Tests Share Transaction State
**What goes wrong:** Two parallel test workers operate on the same DB connection, causing transaction conflicts.
**Why it happens:** Vitest defaults to parallel test execution.
**How to avoid:** Set `pool: 'forks', poolOptions: { forks: { singleFork: true } }` in the integration vitest config. Or use `--pool=forks --poolOptions.forks.singleFork=true`.
**Warning signs:** `ERROR: current transaction is aborted, commands ignored until end of transaction block`

### Pitfall 5: gen_random_uuid() Not Available
**What goes wrong:** `CREATE TABLE ... id uuid DEFAULT gen_random_uuid()` fails on older PostgreSQL.
**Why it happens:** `gen_random_uuid()` was added to core in PostgreSQL 13. Before 13 it required `pgcrypto` extension.
**How to avoid:** Use `postgres:16-alpine` image. PostgreSQL 16 includes `gen_random_uuid()` natively. Do NOT add `CREATE EXTENSION pgcrypto` if using pg 13+.
**Warning signs:** `ERROR: function gen_random_uuid() does not exist`

### Pitfall 6: `import.meta.env` Not Available in Node Test Environment
**What goes wrong:** `lib/supabase.ts` uses `import.meta.env.VITE_SUPABASE_URL` which is Vite-specific. This is undefined in Node environment.
**Why it happens:** Integration tests bypass Vite's dev server; they run directly in Node.
**How to avoid:** Integration tests should NOT import `lib/supabase.ts`. Instead, create a `tests/integration/helpers/db.ts` that uses `process.env.TEST_DATABASE_URL` with `postgres.js` directly. The integration tests test service logic with their own DB client.
**Warning signs:** `import.meta is not defined` or `supabaseUrl is undefined`

---

## Code Examples

### docker-compose.test.yml (complete)
```yaml
# Source: standard docker compose V2 pattern (Docker 29+)
services:
  postgres-test:
    image: postgres:16-alpine
    container_name: meeting_postgres_test
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: meeting_test
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d meeting_test"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 5s
    volumes:
      - postgres_test_data:/var/lib/postgresql/data

volumes:
  postgres_test_data:
```

### Full schema.sql (all 5 tables + auth stub)
```sql
-- Source: lib/database.types.ts + setup_token_usage_logs.sql

-- ==================== AUTH STUB ====================
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid
$$;

-- Role used by RLS policies
DO $$ BEGIN
  CREATE ROLE authenticated;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==================== PUBLIC SCHEMA ====================

CREATE TABLE IF NOT EXISTS public.transcriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now() NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    transcription_text text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.summaries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now() NOT NULL,
    transcription_id uuid REFERENCES public.transcriptions(id) ON DELETE SET NULL,
    summary_text text NOT NULL,
    prompt_used text
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text DEFAULT 'user',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.user_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gemini_api_key text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT user_settings_user_id_key UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.token_usage_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL,
    action_type text NOT NULL,
    feature text NOT NULL,
    input_tokens integer,
    output_tokens integer,
    total_tokens integer,
    model text NOT NULL,
    metadata jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_user_id ON public.token_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_created_at ON public.token_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_feature ON public.token_usage_logs(feature);

-- is_admin() function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE user_id = auth.uid();
  RETURN coalesce(v_role, '') = 'admin';
END;
$$;

-- RLS (enable but policies only matter when testing with auth context)
ALTER TABLE public.token_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own token logs"
    ON public.token_usage_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own token logs"
    ON public.token_usage_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all token logs"
    ON public.token_usage_logs FOR SELECT
    USING (public.is_admin());
```

### Integration test helper (db.ts)
```typescript
// tests/integration/helpers/db.ts
import postgres from 'postgres';

export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://postgres:postgres@localhost:5433/meeting_test';

export const sql = postgres(TEST_DB_URL, {
  max: 1, // single connection for serial tests
  onnotice: () => {}, // suppress NOTICE messages
});

// Insert a test auth user and return their ID
export async function createTestUser(
  tx: postgres.TransactionSql,
  email = 'test@example.com'
): Promise<string> {
  const [row] = await tx`
    INSERT INTO auth.users (email) VALUES (${email}) RETURNING id
  `;
  return row.id;
}

// Set auth context for the current transaction (simulates Supabase JWT)
export async function setAuthContext(
  tx: postgres.TransactionSql,
  userId: string
): Promise<void> {
  await tx`
    SELECT set_config(
      'request.jwt.claims',
      ${JSON.stringify({ sub: userId, role: 'authenticated' })},
      true
    )
  `;
}

export async function closeDb(): Promise<void> {
  await sql.end();
}
```

### Sample integration test
```typescript
// tests/integration/tokenUsageService.test.ts
import { describe, it, beforeEach, afterEach, afterAll } from 'vitest';
import { expect } from 'vitest';
import { sql, createTestUser, setAuthContext, closeDb } from './helpers/db';
import type postgres from 'postgres';

// Note: logTokenUsage uses lib/supabase.ts which uses import.meta.env.
// Integration tests call the DB directly via postgres.js, not via the service.
// To test the service function, extract DB logic into a testable unit.

afterAll(async () => {
  await closeDb();
});

describe('token_usage_logs table', () => {
  let tx: postgres.ReservedSql;
  let userId: string;

  beforeEach(async () => {
    tx = await sql.reserve();
    await tx`BEGIN`;
    userId = await createTestUser(tx);
  });

  afterEach(async () => {
    await tx`ROLLBACK`;
    tx.release();
  });

  it('inserts a token log row', async () => {
    await tx`
      INSERT INTO public.token_usage_logs
        (user_id, action_type, feature, model, total_tokens)
      VALUES
        (${userId}, 'transcribe', 'transcription', 'gemini-1.5-flash', 1500)
    `;
    const rows = await tx`
      SELECT * FROM public.token_usage_logs WHERE user_id = ${userId}
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].total_tokens).toBe(1500);
  });

  it('RLS blocks another user from reading logs', async () => {
    // Insert as user A
    await tx`
      INSERT INTO public.token_usage_logs
        (user_id, action_type, feature, model)
      VALUES (${userId}, 'transcribe', 'transcription', 'gemini-1.5-flash')
    `;
    // Set auth context to user B
    const otherUserId = await createTestUser(tx, 'other@example.com');
    await setAuthContext(tx, otherUserId);

    const rows = await tx`
      SELECT * FROM public.token_usage_logs
    `;
    // User B should not see User A's logs
    expect(rows.filter((r: any) => r.user_id === userId)).toHaveLength(0);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `workspace` file in Vitest | `test.projects` in vitest config | Vitest 3.2 (2025) | `workspace` is deprecated; use `projects` or separate config files |
| `pg` (node-postgres) callbacks | `postgres.js` async/await | 2020+ | postgres.js is faster, ESM-native, cleaner API |
| Separate DB per test | Transaction rollback per test | Standard practice | 10-100x faster than creating new databases |
| `pgcrypto` for `gen_random_uuid()` | Built-in `gen_random_uuid()` | PostgreSQL 13+ | No extension needed on pg 13+ |

**Deprecated/outdated:**
- `vitest.workspace.ts` file: deprecated in Vitest 3.2, replaced by `test.projects` in root config or separate `--config` invocations.
- `pg` package: still maintained but `postgres.js` is the modern choice for new projects.

---

## Open Questions

1. **Should we test RLS or skip it?**
   - What we know: RLS testing requires creating the `authenticated` role and simulating JWT context. This adds ~20 lines of setup SQL.
   - What's unclear: Does the team need RLS correctness verified in CI, or is it sufficient to test just the service data logic?
   - Recommendation: Include auth stub and RLS in schema.sql. It mirrors production. Skip RLS tests in the first pass by using superuser connection (bypasses RLS by default).

2. **How to call `logTokenUsage()` (from tokenUsageService.ts) in integration tests?**
   - What we know: `tokenUsageService.ts` imports `lib/supabase.ts` which uses `import.meta.env` (Vite-only). This breaks in Node test environment.
   - What's unclear: Should we refactor `tokenUsageService.ts` to accept a DB client as a parameter (dependency injection), or only test the DB schema directly?
   - Recommendation: For this phase, test the schema correctness directly with postgres.js. Refactoring services for testability is a separate phase.

3. **Port 5433 vs 5432 for test container**
   - What we know: The machine may have a native PostgreSQL on 5432.
   - Recommendation: Default to 5433 for the test container to avoid conflicts.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 (already installed) |
| Unit config | `vitest.config.ts` (existing, jsdom) |
| Integration config | `vitest.integration.config.ts` (new, node) |
| Quick run (unit) | `npm test` |
| Integration run | `npm run test:integration` |
| Full suite | `npm test && npm run test:integration` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | All 5 tables created correctly | integration | `vitest run --config vitest.integration.config.ts` | Wave 0 |
| DB-02 | FK constraints enforced | integration | `vitest run --config vitest.integration.config.ts` | Wave 0 |
| DB-03 | Indexes created on token_usage_logs | integration | `vitest run --config vitest.integration.config.ts` | Wave 0 |
| DB-04 | auth.uid() function returns correct UUID | integration | `vitest run --config vitest.integration.config.ts` | Wave 0 |
| DB-05 | DB reset script drops and recreates cleanly | manual + integration | `bash scripts/db-reset.sh` | Wave 0 |
| DB-06 | is_admin() function returns correct boolean | integration | `vitest run --config vitest.integration.config.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` (unit tests only, fast)
- **Per wave merge:** `docker compose -f docker-compose.test.yml up -d && npm run test:integration`
- **Phase gate:** Full suite green (unit + integration) before marking phase complete

### Wave 0 Gaps
- [ ] `db/schema.sql` — full schema including auth stub
- [ ] `db/reset.sql` — drop-all script
- [ ] `docker-compose.test.yml` — PostgreSQL test container
- [ ] `scripts/db-reset.sh` — orchestration script
- [ ] `vitest.integration.config.ts` — separate Vitest config for node env
- [ ] `tests/integration/helpers/db.ts` — shared DB client + test helpers
- [ ] `tests/integration/schema.test.ts` — schema verification tests
- [ ] `package.json` scripts: `test:integration`, `db:up`, `db:down`, `db:reset`
- [ ] `.env.test` — test DB connection string
- [ ] Framework install: `npm install --save-dev postgres dotenv`

---

## Sources

### Primary (HIGH confidence)
- Docker Hub `postgres:16-alpine` — current stable image
- Vitest docs (vitest.dev/guide/projects) — projects/workspace configuration in Vitest 4
- PostgreSQL 16 docs — `gen_random_uuid()`, `set_config()`, `current_setting()`

### Secondary (MEDIUM confidence)
- [Integration Testing Node.js Postgres with Vitest & Testcontainers](https://nikolamilovic.com/posts/2025-4-15-integration-testing-node-vitest-testcontainers/) — snapshot/restore pattern
- [Creating a complete Node.js test environment with Vitest, PostgreSQL and Prisma](https://www.douglasgoulart.com/writings/creating-a-complete-nodejs-test-environment-with-vitest-postgresql-and-prisma) — separate config pattern
- [Supabase Discussion: How to mock/test auth.uid()](https://github.com/orgs/supabase/discussions/4799) — SET LOCAL JWT claims approach
- [postgres.js GitHub](https://github.com/porsager/postgres) — postgres.js API reference

### Tertiary (LOW confidence — needs validation)
- [Simulate Supabase Postgres RLS](https://medium.com/@karan.sakhuja/simulate-supabase-postgres-rls-e427e7479416) — auth stub SQL pattern (couldn't fetch, content summarized from search)
- [Supabase issue #4244: auth.uid() function DDL](https://github.com/supabase/supabase/issues/4244) — exact SQL for auth.uid() stub

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Docker 29 confirmed installed, postgres.js is current standard, Vitest 4 confirmed in package.json
- Architecture: HIGH — two-config Vitest pattern is well-documented; transaction rollback is industry standard
- auth.uid() simulation: MEDIUM — multiple sources confirm the `SET LOCAL request.jwt.claims` approach, but the exact role setup needs local validation
- Pitfalls: HIGH — port conflict, import.meta.env, FK violation are all concrete issues observed in the codebase

**Research date:** 2026-03-13
**Valid until:** 2026-06-13 (stable domain; Docker + PostgreSQL + Vitest change slowly)
