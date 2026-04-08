---
plan: 01-01
phase: 01-auth
status: complete
completed: 2026-04-08
---

## Summary

- Added migration `017_email_verification_and_google_oauth.sql`: `auth.users.email_verified_at`, `google_sub`, partial unique index on `google_sub`, table `auth.email_verification_tokens` with unique `token_hash`, indexes, and backfill for existing password users.
- Synced `db/schema.sql` and `db/seed.sql` (admin seed sets `email_verified_at`).

## key-files

- created: db/migrations/017_email_verification_and_google_oauth.sql
- modified: db/schema.sql, db/seed.sql
