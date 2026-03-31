---
status: awaiting_human_verify
trigger: "Gửi email biên bản cuộc họp bị lỗi 500 Internal Server Error tại endpoint POST /api/email/send-minutes"
created: 2026-03-19T00:00:00Z
updated: 2026-03-19T00:45:00Z
---

## Current Focus

hypothesis: handleSave in EmailSettingsSection always POSTs resend_from_email even when empty → server rejects value='' with 400
test: Read handleSave logic — confirmed fromEmail and maxRecipients are sent unconditionally; server rejects empty value
expecting: Guarding each PUT call with a non-empty check will allow save to succeed when only API key is set
next_action: Fix handleSave to only send settings with non-empty values, similar to how apiKey is already guarded

## Symptoms

expected: Email được gửi thành công đến người nhận, UI hiển thị thành công
actual: POST http://localhost:3000/api/email/send-minutes trả về 500 Internal Server Error, UI hiển thị "Loi gui email" và nút "Thử lại"
errors: "Failed to load resource: the server responded with a status of 500 (Internal Server Error)" tại :3000/api/email/send-minutes
reproduction: Truy cập localhost:3000, upload file, tạo biên bản, đến bước hoàn thành, nhập email và click gửi email biên bản
started: 2026-03-19, chưa rõ khi nào bắt đầu

## Eliminated

- hypothesis: Resend API key chưa được cấu hình
  evidence: Route kiểm tra key từ DB trước, nếu thiếu trả 503 không phải 500 — nhưng DB không chạy nên không đến được check này
  timestamp: 2026-03-19T00:08:00Z

- hypothesis: jsPDF generateMinutesPdfBuffer crash
  evidence: npx tsx test xác nhận PDF generation OK, size 4157 bytes
  timestamp: 2026-03-19T00:06:00Z

- hypothesis: markdownToHtml import path sai
  evidence: import từ ./lib/markdownUtils.ts hoạt động bình thường
  timestamp: 2026-03-19T00:05:00Z

- hypothesis: Resend v6 API không nhận Buffer attachment
  evidence: Type definitions của resend@6.9.4 cho phép content?: string | Buffer — API đúng
  timestamp: 2026-03-19T00:07:00Z

## Evidence

- timestamp: 2026-03-19T00:30:00Z
  checked: db/migrations/ directory
  found: Migration file 008_add_app_settings.sql exists but was never applied to meeting_test DB
  implication: Root cause confirmed — "relation does not exist" error came from missing table, not missing DB

- timestamp: 2026-03-19T00:31:00Z
  checked: docker exec meeting_postgres_test psql → CREATE TABLE IF NOT EXISTS public.app_settings
  found: "CREATE TABLE" — migration applied successfully
  implication: Table now exists; route can query it without error

- timestamp: 2026-03-19T00:32:00Z
  checked: SELECT * FROM public.app_settings
  found: 0 rows — table is empty, no resend_api_key seeded
  implication: Route will now return 503 (key not configured) instead of 500 — this is correct behavior

- timestamp: 2026-03-19T00:03:00Z
  checked: curl POST /api/email/send-minutes với dev JWT token
  found: Response {"error":"Loi gui email"} — đây là fallback khi err.message là falsy
  implication: err.message === "" hoặc undefined, không phải lỗi logic code

- timestamp: 2026-03-19T00:09:00Z
  checked: Direct postgres connection test đến localhost:5433
  found: AggregateError { message: "", errors: ["ECONNREFUSED ::1:5433", "ECONNREFUSED 127.0.0.1:5433"] }
  implication: PostgreSQL Docker container (meeting_postgres_test) không đang chạy

- timestamp: 2026-03-19T00:09:30Z
  checked: lsof -i :5432 -i :5433
  found: Không có process nào listen trên cả hai port
  implication: DB hoàn toàn offline

- timestamp: 2026-03-19T00:10:00Z
  checked: server/routes/email.ts catch block
  found: `return res.status(500).json({ error: err.message || 'Loi gui email' })` — AggregateError.message="" là falsy → fallback
  implication: Code bug: AggregateError từ postgres library có message rỗng, bị swallow mất

- timestamp: 2026-03-19T00:45:00Z
  checked: App.tsx EmailSettingsSection.handleSave (lines 131-152)
  found: fromEmail and maxRecipients are always sent unconditionally; only apiKey is guarded by `if (apiKey)`. Server PUT /api/admin/settings rejects value==='' with 400. If resend_from_email is not set in DB yet, fromEmail state stays '' and save always fails with 400.
  implication: Root cause of 400 — unconditional send of empty values. Fix: guard each setting send with non-empty value check.

- timestamp: 2026-03-19T00:45:00Z
  checked: server/routes/admin.ts PUT /api/admin/settings (lines 190-209)
  found: Validation `if (value === undefined || value === null || value === '')` returns 400. Route path is /api/admin/settings — correct. Frontend uses authFetch('/admin/settings') → /api/admin/settings — correct path. Route mismatch is NOT the issue.
  implication: The 400 is purely from empty value being sent, not from route mismatch.

## Resolution

root_cause: Ba vấn đề chồng chéo: (1) Migration 008_add_app_settings.sql chưa được apply → postgres ném "relation does not exist" → AggregateError.message="" → catch block swallow → 500 "Loi gui email". (2) catch block trong email.ts kiểm tra err.message trước khi kiểm tra AggregateError — bị swallow. (3) EmailSettingsSection.handleSave gửi resend_from_email và email_max_recipients unconditionally — khi fromEmail="" thì server trả 400 "Value la bat buoc".
fix: (1) Applied migration 008 via docker exec psql. (2) Fixed catch block trong server/routes/email.ts để extract AggregateError.errors[0].message. (3) Fixed handleSave trong App.tsx: thêm guard `if (fromEmail)` và `if (maxRecipients)` trước mỗi PUT call — chỉ gửi setting khi có value.
verification: Migration confirmed. Catch block fixed. handleSave fix applied — chỉ PUT settings có non-empty value. Awaiting human verify.
files_changed: [server/routes/email.ts, App.tsx]
