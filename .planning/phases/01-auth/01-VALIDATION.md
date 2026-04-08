---
phase: 01
slug: auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 01 — Validation Strategy

> Validation contract cho phase bổ sung email verification + Google OAuth.

---

## Test infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vite.config.ts` / `vitest` trong `package.json` |
| **Quick run** | `npm test -- --run server/routes/__tests__/auth` |
| **Full suite** | `npm test` |
| **Estimated runtime** | ~1–3 phút (tùy máy) |

---

## Sampling rate

- Sau mỗi task chỉnh auth: chạy **quick run** (hoặc subset file test đã đụng).
- Sau mỗi wave plan: `npm test`.
- Trước merge: full suite xanh.

---

## Per-task verification map

| Task ID | Plan | Wave | Requirement | Test type | Automated command | Status |
|---------|------|------|---------------|-----------|-------------------|--------|
| TBD | 01 | 1 | Schema migration | integration / migrate | `npm test` includes migration tests if added | ⬜ |
| TBD | 01 | 1 | Register no JWT until verify | unit | grep + vitest auth register | ⬜ |
| TBD | 02 | 1 | Verify email endpoint | unit/integration | vitest | ⬜ |
| TBD | 02 | 2 | Login blocked unverified | unit | vitest | ⬜ |
| TBD | 03 | 2 | Google OAuth callback | unit (mocked) | vitest | ⬜ |
| TBD | 04 | 3 | Frontend Register/Login | unit | vitest `LoginPage` / `RegisterPage` | ⬜ |

*Cập nhật task ID sau khi PLAN.md được tạo.*

---

## Wave 0 requirements

- Không bắt buộc wave 0 riêng — infrastructure Vitest đã có.

---

## Manual-only verifications

| Behavior | Why manual | Steps |
|----------|------------|-------|
| Email thật từ Resend | Cần API key + inbox | Đăng ký trên staging; kiểm tra link hoạt động. |
| Google OAuth end-to-end | Cần Google project + browser | Login bằng Google trên staging. |

---

## Validation sign-off

- [ ] Mọi task có verify tự động hoặc manual được ghi trong PLAN
- [ ] `nyquist_compliant: true` sau khi execute xong

**Approval:** pending
