---
status: awaiting_human_verify
trigger: "App đã deploy lên Railway, SMTP env vars đã set, nhưng gửi email vẫn bị lỗi 500"
created: 2026-03-31T00:00:00Z
updated: 2026-03-31T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED — Railway blocks outbound TCP to SMTP ports (465 and 587). Direct nodemailer SMTP cannot connect.
test: Verified via Railway app service logs showing `ETIMEDOUT code: 'CONN'`
expecting: Fix by switching to Resend HTTP API (already installed as package) which uses port 443 (not blocked)
next_action: Rewrite server/routes/email.ts to use Resend SDK instead of nodemailer; set RESEND_API_KEY in Railway env

## Symptoms

expected: Email biên bản gửi thành công đến người nhận sau khi deploy lên Railway
actual: POST /api/email/send-minutes trả về 500 khi gọi từ Railway deployment
errors: 500 Internal Server Error — SMTP connection timeout (ETIMEDOUT, command: CONN)
reproduction: Login as admin → tạo biên bản → bước hoàn thành → nhập email → click gửi
started: Sau khi deploy lên Railway, chưa từng hoạt động trên production

## Eliminated

- hypothesis: SMTP credentials are wrong (wrong user/password)
  evidence: Error is ETIMEDOUT at TCP CONN phase — never reaches auth. Credentials are irrelevant.
  timestamp: 2026-03-31T00:05:00Z

- hypothesis: Port 465 + SSL is wrong config (should be 587 + STARTTLS)
  evidence: Railway env vars already show SMTP_PORT=587 and SMTP_SECURE=false. Still ETIMEDOUT. Both 465 and 587 are blocked.
  timestamp: 2026-03-31T00:05:00Z

## Evidence

- timestamp: 2026-03-31T00:03:00Z
  checked: Railway app service logs (service ID 2558db68-5ffa-4088-bcb2-2a7bb5df678e)
  found: "Email send error: Error: Connection timeout ... code: 'ETIMEDOUT', command: 'CONN'"
  implication: Railway blocks outbound TCP to SMTP ports before TCP handshake completes

- timestamp: 2026-03-31T00:04:00Z
  checked: Local nc test to hfn44-22268.azdigihost.com:587 and :465
  found: Both ports reachable from local machine (nc exits 0)
  implication: The SMTP server is fine. The block is Railway-side network policy, not server-side.

- timestamp: 2026-03-31T00:04:30Z
  checked: Railway env vars for app service
  found: SMTP_PORT=587, SMTP_SECURE=false — already on the "better" port config, still failing
  implication: Railway blocks ALL outbound SMTP (465 and 587). Port change alone cannot fix this.

- timestamp: 2026-03-31T00:05:00Z
  checked: package.json for email libraries
  found: resend@6.9.4 already installed as a dependency
  implication: Can switch to Resend HTTP API (uses HTTPS/443) with minimal code change. No new package install needed.

## Resolution

root_cause: Railway blocks all outbound TCP connections to SMTP ports (465, 587) from containers. nodemailer's direct SMTP connection hits a network-level block and times out before the TCP handshake completes (code: ETIMEDOUT, command: CONN). This is a Railway platform network policy — not a config error. Railway env already had SMTP_PORT=587 SMTP_SECURE=false (correct config), yet still failed because port 587 is also blocked.
fix: Replaced nodemailer SMTP transport with Resend SDK HTTP API in server/routes/email.ts. Resend communicates over HTTPS (port 443) which Railway does not block. Code reads RESEND_API_KEY and optional RESEND_FROM from env vars. The resend package (v6.9.4) was already a project dependency — no new install needed.
verification: Awaiting user to add RESEND_API_KEY to Railway env vars and confirm email sends successfully.
files_changed: [server/routes/email.ts]
