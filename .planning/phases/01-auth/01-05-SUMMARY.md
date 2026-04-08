---
phase: 01-auth
plan: 05
completed: 2026-04-08
tags: [auth, resend, admin-settings, app_settings, phase-1]
---

# 01-05 Summary — Resend + DB cấu hình trong Phase 1

## One-liner

Thống nhất Resend qua env hoặc `app_settings`; admin UI Resend thay Gmail stub; email xác nhận và gửi biên bản dùng cùng nguồn cấu hình.

## Delivered

- `server/lib/getResendConfig.ts`: `getResendConfig()` (env → `resend_api_key` / `resend_from`), `getMaxEmailRecipients()` (env → `email_max_recipients`).
- `sendVerificationEmail` + `POST /email/send-minutes` gọi helpers; thông báo 503 rõ env vs admin.
- `admin` ALLOWED_KEYS + mask `resend_api_key`; `EmailSettingsSection` form Resend + max recipients.
- `.env.example` ghi chú; `ROADMAP` Phase 1 mở rộng success criteria; tests `email.test.ts` (mockSql default, DB fallback, PUT resend).

## Verification

- `npm test -- --run` — PASS (2026-04-08).
