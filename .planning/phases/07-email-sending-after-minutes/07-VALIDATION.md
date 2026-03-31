---
phase: 7
slug: email-sending-after-minutes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler (`tsc --noEmit`) — no test framework currently installed |
| **Config file** | `tsconfig.json` |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 07-01 | 1 | EMAIL-01 | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 7-01-02 | 07-01 | 1 | EMAIL-01 | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 7-02-01 | 07-02 | 1 | EMAIL-02 | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 7-02-02 | 07-02 | 1 | EMAIL-02, EMAIL-03 | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 7-03-01 | 07-03 | 2 | EMAIL-02, EMAIL-04 | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 7-03-02 | 07-03 | 2 | EMAIL-02, EMAIL-04 | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 7-03-03 | 07-03 | 2 | EMAIL-04 | manual | — (checkpoint) | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/markdownUtils.ts` — extracted `markdownToHtml()` with zero browser deps (required for server-side PDF)
- [ ] `server/db/migrations/008_add_app_settings.sql` — `app_settings` key/value table for Resend config
- [ ] `server/routes/email.ts` — new file stub
- [ ] `server/routes/admin.ts` — email settings endpoint stub
- [ ] `lib/emailHtmlTemplate.ts` — HTML template builder stub
- [ ] `components/EmailChipsInput.tsx` — chips input component stub

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email thực sự được gửi đến hộp thư người nhận | EMAIL-02 | Cần Resend API key thật và tài khoản email | Nhập email của mình vào chips input, click "Gửi email", kiểm tra hộp thư |
| Email HTML hiển thị đúng trên các email clients | EMAIL-03 | Không thể tự động hóa rendering cross-client | Kiểm tra trên Gmail, Outlook, Apple Mail |
| PDF đính kèm mở được và hiển thị nội dung biên bản | EMAIL-03 | Cần kiểm tra thủ công file PDF | Tải PDF từ email đính kèm, kiểm tra nội dung |
| Thông báo gửi thành công/thất bại hiển thị đúng | EMAIL-04 | Cần test cả 2 trường hợp: API key hợp lệ và không hợp lệ | 1) Gửi với API key hợp lệ → thấy thông báo thành công. 2) Gửi với API key sai → thấy thông báo lỗi |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
