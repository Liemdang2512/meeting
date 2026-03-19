---
phase: 07-email-sending-after-minutes
plan: "03"
subsystem: email-backend
tags: [email, pdf, resend, jspdf, express, admin-settings]
dependency_graph:
  requires: ["07-00", "07-01"]
  provides: ["POST /api/email/send-minutes", "GET /api/admin/settings", "PUT /api/admin/settings"]
  affects: ["server/index.ts", "server/routes/admin.ts"]
tech_stack:
  added: ["resend@^6.9.4 (already in package.json)"]
  patterns: ["jsPDF Node.js Buffer generation (doc.text, no DOM)", "Resend SDK Buffer attachment", "admin key-value settings with allowlist", "API key masking (first 8 chars)"]
key_files:
  created:
    - server/lib/pdfGenerator.ts
    - server/lib/emailTemplate.ts
    - server/routes/email.ts
  modified:
    - server/routes/admin.ts
    - server/index.ts
decisions:
  - "jsPDF doc.text() API used exclusively (no doc.html()) — Node.js compatible, no DOM required"
  - "Resend API key read from DB on every request (not cached) — allows admin key rotation without restart"
  - "API key masking returns first 8 chars + '...' for admin UI display"
  - "503 returned when resend_api_key not configured — clear service-unavailable signal to frontend"
  - "Buffer.from(doc.output('arraybuffer')) passed directly to Resend SDK — not base64 string"
metrics:
  duration: "3min"
  completed: "2026-03-19"
  tasks_completed: 2
  files_created: 3
  files_modified: 2
---

# Phase 07 Plan 03: Email Backend Infrastructure Summary

**One-liner:** Express email route sending HTML body + jsPDF Buffer attachment via Resend SDK with DB-backed API key and admin settings endpoints.

## What Was Built

Full server-side email pipeline: PDF generation using jsPDF Node build (doc.text, no DOM), HTML email template with inline styles and indigo header, Express route POST /api/email/send-minutes that reads Resend API key from DB, generates PDF, builds HTML, and sends via Resend SDK. Admin GET/PUT /api/admin/settings endpoints with ALLOWED_KEYS allowlist and API key masking.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | PDF generator and HTML email template modules | 4f20093 | server/lib/pdfGenerator.ts, server/lib/emailTemplate.ts |
| 2 | Email route, admin settings endpoints, register router | fb8f1b6 | server/routes/email.ts, server/routes/admin.ts, server/index.ts |

## Success Criteria Verification

1. POST /api/email/send-minutes accepts recipients, subject, minutesMarkdown, meetingInfo — PASS
2. Route reads Resend API key from app_settings DB, returns 503 if not configured — PASS
3. Route generates PDF via jsPDF (doc.text, no DOM), sends as Buffer attachment — PASS
4. Route builds HTML email with inline styles via buildEmailHtml — PASS
5. Route sends via Resend SDK with HTML body + PDF attachment — PASS
6. Admin GET /settings returns masked API key (first 8 chars + '...') — PASS
7. Admin PUT /settings upserts only ALLOWED_KEYS — PASS
8. Email router mounted at /api/email in server — PASS
9. TypeScript compiles without errors — PASS

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

Files verified:
- FOUND: server/lib/pdfGenerator.ts
- FOUND: server/lib/emailTemplate.ts
- FOUND: server/routes/email.ts

Commits verified:
- FOUND: 4f20093 (feat(07-03): create PDF generator and HTML email template modules)
- FOUND: fb8f1b6 (feat(07-03): create email route, admin settings endpoints, register router)
