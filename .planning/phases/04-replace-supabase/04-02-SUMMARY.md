---
phase: 04-replace-supabase
plan: "02"
subsystem: auth
tags: [jwt, fetch, vite-proxy, react, typescript, localStorage]

requires:
  - phase: 04-01
    provides: Express backend with /api/auth, /api/transcriptions, /api/summaries, /api/token-logs, /api/user-settings

provides:
  - lib/api.ts with authFetch, getToken, setToken, clearToken (localStorage JWT helpers)
  - lib/auth.ts with login(), logout(), getMe(), loadApiKeyFromAccount(), saveApiKeyToAccount()
  - lib/supabase.ts re-exporting from lib/auth.ts for backward compat (supabase=null)
  - App.tsx using getMe() on mount instead of onAuthStateChange, authFetch for DB saves
  - LoginPage.tsx calling login() from lib/auth instead of signInWithEmail from supabase
  - tokenUsageService.ts using authFetch POST /api/token-logs
  - useTokenUsageLogs.ts using authFetch GET /api/token-logs with URLSearchParams
  - vite.config.ts proxy /api -> http://localhost:3001

affects:
  - Any future frontend feature that needs authenticated API calls (use authFetch from lib/api.ts)
  - Admin features reading token logs (already updated)

tech-stack:
  added: []
  patterns:
    - "authFetch: all authenticated API calls go through lib/api.ts authFetch() which injects Bearer header from localStorage"
    - "JWT stored in localStorage under key 'auth_token'"
    - "AuthUser type uses userId (not id) matching server JWT payload"
    - "getMe() called on mount to restore session from localStorage JWT"
    - "Vite server.proxy routes /api/* to http://localhost:3001 in dev"

key-files:
  created:
    - lib/api.ts
    - lib/auth.ts
  modified:
    - lib/supabase.ts
    - App.tsx
    - components/LoginPage.tsx
    - services/tokenUsageService.ts
    - features/token-usage-admin/hooks/useTokenUsageLogs.ts
    - vite.config.ts

key-decisions:
  - "AuthUser.userId (not .id) — matches server JWT payload field name, used consistently throughout App.tsx"
  - "lib/supabase.ts kept as re-export shim so any remaining imports dont break"
  - "App.tsx state changed from AuthState{session,user} to AuthUser|null — simpler, no Supabase Session type needed"
  - "Admin check uses role from JWT (getMe() response) instead of separate profiles query"
  - "onLoginSuccess callback in LoginPage now calls getMe() to hydrate user state after login"
  - "vendor-supabase chunk removed from vite manualChunks since Supabase SDK no longer imported"

patterns-established:
  - "API calls pattern: authFetch('/path') — no full URL, no explicit auth header, proxy handles routing"
  - "Token storage: localStorage key 'auth_token', accessed via getToken()/setToken()/clearToken()"

requirements-completed: [REPLACE-SUPABASE-FRONTEND]

duration: 25min
completed: 2026-03-13
---

# Phase 04 Plan 02: Frontend Supabase Replacement Summary

**Frontend fully migrated from Supabase SDK to fetch-based JWT auth — lib/api.ts + lib/auth.ts replace all Supabase client usage, Vite proxies /api to Express backend**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-13T00:00:00Z
- **Completed:** 2026-03-13T00:25:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Created lib/api.ts (authFetch with Bearer JWT, getToken/setToken/clearToken for localStorage)
- Created lib/auth.ts (login, logout, getMe, loadApiKeyFromAccount, saveApiKeyToAccount using authFetch)
- Replaced lib/supabase.ts with backward-compat re-exports (supabase=null, isSupabaseConfigured=false)
- App.tsx: replaced onAuthStateChange with getMe() on mount, all DB saves use authFetch, user state is AuthUser|null
- Admin role check now uses JWT role field directly (no extra profiles query)
- tokenUsageService and useTokenUsageLogs fully migrated to authFetch
- Vite dev proxy added (/api -> localhost:3001), Supabase vendor chunk removed
- Build passes cleanly (npm run build: 221 modules, no errors)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lib/api.ts, lib/auth.ts, update lib/supabase.ts** - `10da99b` (feat)
2. **Task 2: Update App.tsx, LoginPage, tokenUsageService, useTokenUsageLogs, vite.config.ts** - `84827e3` (feat)

## Files Created/Modified

- `lib/api.ts` - fetch wrapper with JWT auth header, localStorage token helpers
- `lib/auth.ts` - login/logout/getMe/loadApiKeyFromAccount/saveApiKeyToAccount
- `lib/supabase.ts` - backward-compat re-exports, supabase=null
- `App.tsx` - AuthUser state, getMe() on mount, authFetch for transcription/summary, admin from JWT role
- `components/LoginPage.tsx` - import login from lib/auth, remove Supabase branding text
- `services/tokenUsageService.ts` - authFetch POST /api/token-logs
- `features/token-usage-admin/hooks/useTokenUsageLogs.ts` - authFetch GET /api/token-logs with query params
- `vite.config.ts` - server.proxy /api -> localhost:3001, removed vendor-supabase chunk

## Decisions Made

- AuthUser uses `userId` not `id` — matches the JWT payload shape from the Express server
- app state type simplified to `AuthUser | null` instead of `AuthState { session, user }` — no Supabase Session needed
- Admin check from JWT role (user.role === 'admin') removes the extra profiles DB query that was in the old init flow
- onLoginSuccess in LoginPage now async — calls getMe() and loads API key immediately after login

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The Vite proxy handles routing /api to localhost:3001 during dev.

## Next Phase Readiness

- Frontend is fully decoupled from Supabase SDK
- All API calls go through lib/api.ts authFetch (proxied to Express in dev, direct URL in prod)
- Ready for production deployment configuration (set API base URL for non-proxy environments)

---
*Phase: 04-replace-supabase*
*Completed: 2026-03-13*
