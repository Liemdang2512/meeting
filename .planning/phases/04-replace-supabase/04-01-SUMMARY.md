---
phase: 04-replace-supabase
plan: "01"
subsystem: api
tags: [express, jwt, postgres, bcryptjs, jsonwebtoken, tsx, cors, concurrently]

# Dependency graph
requires: []
provides:
  - "Express server on port 3001 with full REST API"
  - "JWT auth middleware (signToken, requireAuth)"
  - "postgres.js connection to Docker PostgreSQL port 5433"
  - "POST /api/auth/login with bcrypt password verification"
  - "POST /api/auth/logout (stateless)"
  - "GET /api/auth/me (token verification)"
  - "GET/PUT /api/user-settings (gemini_api_key)"
  - "POST /api/transcriptions"
  - "POST /api/summaries"
  - "GET /api/profiles/role"
  - "POST/GET /api/token-logs (admin guard on GET)"
  - "password_hash column in auth.users (schema + migration-safe ADD COLUMN IF NOT EXISTS)"
affects:
  - 04-02-frontend
  - 04-03-migration

# Tech tracking
tech-stack:
  added:
    - express@^4.21.2
    - cors@^2.8.5
    - bcryptjs@^2.4.3
    - jsonwebtoken@^9.0.2
    - tsx@^4.19.4 (devDependency)
    - concurrently@^9.1.2 (devDependency)
    - "@types/express, @types/cors, @types/bcryptjs, @types/jsonwebtoken (devDependencies)"
  patterns:
    - "All routes wrapped with requireAuth middleware at router level"
    - "postgres.js tagged template literals for safe parameterized queries"
    - "JWT payload carries userId, email, role — no DB lookup needed for role checks"
    - "Admin-only routes check req.user.role === admin (no extra DB query)"

key-files:
  created:
    - server/index.ts
    - server/db.ts
    - server/auth.ts
    - server/routes/auth.ts
    - server/routes/users.ts
    - server/routes/transcriptions.ts
    - server/routes/summaries.ts
    - server/routes/profiles.ts
    - server/routes/tokenLogs.ts
    - tsconfig.server.json
  modified:
    - package.json
    - db/schema.sql

key-decisions:
  - "Used tsx (not ts-node) to run TypeScript server directly — simpler, no separate build step needed"
  - "password_hash added to auth.users via ADD COLUMN IF NOT EXISTS at login time — idempotent, no migration script required"
  - "JWT payload embeds role so protected routes can check admin without extra DB query"
  - "tsconfig.server.json uses CommonJS module (not ESM) because tsx runs in Node.js context outside Vite's ESM environment"

patterns-established:
  - "Express route files export Router, mounted in server/index.ts under /api prefix"
  - "requireAuth middleware reads Authorization: Bearer header and attaches AuthUser to req.user"
  - "All DB queries use postgres.js tagged template literals (never string concatenation)"

requirements-completed:
  - REPLACE-SUPABASE-BACKEND

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 04 Plan 01: Express Backend Summary

**Express REST API server (port 3001) with JWT auth, bcrypt login, postgres.js connection to Docker PostgreSQL, and all 10 endpoints spanning auth/users/transcriptions/summaries/profiles/token-logs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T07:40:31Z
- **Completed:** 2026-03-13T07:44:50Z
- **Tasks:** 2 (Tasks 1 and 2 executed as one cohesive unit)
- **Files modified:** 12

## Accomplishments

- Express server starts on port 3001, /api/health returns {"ok":true}
- JWT auth middleware signs 7-day tokens and verifies Bearer headers
- All 10 REST endpoints implemented and responding with correct HTTP status codes
- postgres.js connects to Docker PostgreSQL port 5433, confirmed with SELECT 1
- admin-only GET /api/token-logs returns 403 for non-admin JWT tokens
- password_hash column handled safely with ADD COLUMN IF NOT EXISTS

## Task Commits

Each task was committed atomically:

1. **Tasks 1+2: Setup Express + all route handlers** - `e48c3bd` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `server/index.ts` - Express app, CORS middleware, JSON body parser, all 6 route mounts + /api/health
- `server/db.ts` - postgres.js connection pool to Docker PostgreSQL port 5433
- `server/auth.ts` - JWT signToken and requireAuth middleware, AuthUser interface, Express Request augmentation
- `server/routes/auth.ts` - POST /api/auth/login (bcrypt verify), POST /api/auth/logout, GET /api/auth/me
- `server/routes/users.ts` - GET/PUT /api/user-settings with upsert on conflict
- `server/routes/transcriptions.ts` - POST /api/transcriptions with RETURNING clause
- `server/routes/summaries.ts` - POST /api/summaries with RETURNING clause
- `server/routes/profiles.ts` - GET /api/profiles/role
- `server/routes/tokenLogs.ts` - POST (all users) + GET (admin only) with pagination and dynamic filters
- `tsconfig.server.json` - CommonJS TypeScript config for server (editor hints only, tsx runs directly)
- `package.json` - Added dependencies, devDependencies, server:dev and dev:full scripts
- `db/schema.sql` - Added password_hash column to auth.users CREATE TABLE definition

## Decisions Made

- Used `tsx` instead of `ts-node` — faster startup, no tsconfig resolution issues with Vite's ESM project
- Added `password_hash` column to `auth.users` via `ADD COLUMN IF NOT EXISTS` at login time (idempotent), also added to schema.sql for clean db:reset runs
- JWT payload embeds `role` field so GET /api/token-logs can check admin without an extra DB query per request
- `tsconfig.server.json` uses `"module": "CommonJS"` to work correctly in Node.js context (not ESM like the frontend)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

PostgreSQL emits a NOTICE (not error) when `ADD COLUMN IF NOT EXISTS` finds the column already exists. This is expected and harmless — the HTTP response is still correct. The notice prints to server console during login only when the column already exists in the running DB.

## User Setup Required

None - no external service configuration required. The server connects to the local Docker PostgreSQL container (meeting_postgres_test) which should be running via `npm run db:up`.

Environment variable defaults (no .env required for local dev):
- `DB_HOST=localhost`, `DB_PORT=5433`, `DB_NAME=meeting_test`, `DB_USER=postgres`, `DB_PASS=postgres`
- `API_JWT_SECRET=dev-secret-change-me` (change in production)
- `PORT=3001`

## Next Phase Readiness

- Express backend fully operational, all endpoints verified
- Frontend (plan 04-02) can now replace Supabase client calls with fetch() to localhost:3001
- Migration (plan 04-03) can insert test users with bcrypt-hashed passwords

## Self-Check: PASSED

All files verified present on disk. Commit e48c3bd confirmed in git log. Package.json contains all required dependencies and scripts. db/schema.sql contains password_hash column. Server starts and all endpoints verified during execution.

---
*Phase: 04-replace-supabase*
*Completed: 2026-03-13*
