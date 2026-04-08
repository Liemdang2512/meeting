---
plan: 01-02
phase: 01-auth
status: complete
completed: 2026-04-08
---

## Summary

- `POST /api/auth/register`: 201 `{ ok, message }`, no cookies/token; stores verification token (sha256) with 24h expiry; `email_verified_at` NULL for self-service rows.
- `GET /api/auth/verify-email`: validates token, sets `email_verified_at`, marks token used; redirects to `APP_URL/login?verified=1|0`.
- `POST /api/auth/login`: 403 with fixed Vietnamese copy when password OK but email unverified.
- `POST /api/auth/refresh`: clears cookies and 401 `{ error: "Email chưa được xác nhận" }` when unverified.
- `server/lib/sendVerificationEmail.ts` (Resend, dev-safe without key).
- Admin `POST /users` sets `email_verified_at = NOW()`.
- `.env.example`: `API_PUBLIC_URL`.
- Integration tests: `auth.verification.integration.test.ts`.

## key-files

- created: server/lib/sendVerificationEmail.ts, server/routes/__tests__/auth.verification.integration.test.ts
- modified: server/routes/auth.ts, server/routes/admin.ts, .env.example
