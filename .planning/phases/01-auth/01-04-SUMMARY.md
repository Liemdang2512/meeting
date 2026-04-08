---
plan: 01-04
phase: 01-auth
status: complete
completed: 2026-04-08
---

## Summary

- `lib/api.ts`: exported `getApiBasePath()` for consistent `/api` base.
- `lib/auth.ts`: `register()` returns `{ ok, message }` without `setToken`; `getGoogleOAuthStartUrl()`.
- `RegisterPage`: inbox success state, `onGoToLogin` only; Google CTA enabled.
- `LoginPage`: Google CTA; query banners for `verified`, `oauth_error`, `google=1`.
- `App.tsx` + `SharedMeetingWorkflow.tsx`: dropped post-register auto-login wiring.
- Tests updated: `RegisterPage.test.tsx`, `LoginPage.test.tsx`.

## key-files

- modified: lib/api.ts, lib/auth.ts, components/RegisterPage.tsx, components/LoginPage.tsx, App.tsx, features/workflows/shared/SharedMeetingWorkflow.tsx, components/__tests__/RegisterPage.test.tsx, components/__tests__/LoginPage.test.tsx, .env.example
