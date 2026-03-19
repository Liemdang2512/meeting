# Phase 7: Email Sending After Minutes - Research

**Researched:** 2026-03-19
**Domain:** Email delivery (Resend), server-side PDF generation (jsPDF Node.js build), Express route, React chips/tags input
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Nhập email (UX)**
- Chips/tags input: gõ email rồi Enter hoặc dấu phẩy → xuất hiện dưới dạng tag có nút xóa
- Validate định dạng email hợp lệ trước khi tạo tag, hiện lỗi rõ ràng nếu sai
- Không lưu recipients vào localStorage draft (khác với các field khác trong form)
- Giới hạn tối đa 20 email recipients; admin có thể tùy chỉnh giới hạn này

**Thời điểm gửi (trigger)**
- Button "Gửi email" chỉ xuất hiện ở bước Hoàn thành (bước cuối)
- Nếu danh sách email trống: button hiển thị nhưng disabled, có tooltip giải thích
- Sau khi gửi thành công: button đổi thành "Gửi lại"
- Trạng thái gửi (loading, success, error) hiển thị inline dưới button

**Nội dung email**
- Định dạng: HTML body đẹp + PDF đính kèm
- Subject: tự động tạo từ thông tin cuộc họp nhưng user có thể chỉnh sửa — field "Tiêu đề email" inline tại bước Hoàn thành
- HTML body bao gồm: tiêu đề, tên công ty, ngày giờ, địa điểm, danh sách tham dự, nội dung biên bản đầy đủ
- PDF đính kèm: reuse logic `downloadAsPdf` hiện có, gửi file dưới dạng base64 attachment

**Email service**
- Sử dụng Resend (resend.com)
- API key lưu trong DB, admin cấu hình qua trang admin UI (không hardcode vào .env)
- From email: cấu hình sẵn trong server (RESEND_FROM_EMAIL trong .env hoặc settings DB)
- Gửi qua server-side API endpoint (POST /api/email/send-minutes) — không expose API key ra client

### Claude's Discretion
- Thiết kế HTML email template (màu sắc, layout)
- Schema DB lưu Resend API key trong admin settings
- Error handling chi tiết (bounce, invalid domain, rate limit)
- Loading state animation cho button Gửi email

### Deferred Ideas (OUT OF SCOPE)
- Premium from-email: Gửi email nhân danh địa chỉ email của user (cần Resend domain verification flow)
- Email template tùy chỉnh: Cho user chọn màu sắc/logo trong email
- Lịch sử gửi email: Log lịch sử email đã gửi cho từng biên bản
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EMAIL-01 | Chips/tags email input in MeetingInfoForm, validated, max 20, not saved to draft | Chips UI pattern documented below; MeetingInfo type extension identified |
| EMAIL-02 | "Gửi email" button on Hoàn thành step, disabled when no recipients, resend after success, inline status | Button state machine documented; integration point in App.tsx confirmed |
| EMAIL-03 | Email sent via POST /api/email/send-minutes with HTML body + PDF attachment | Resend SDK pattern documented; jsPDF Node.js Buffer approach confirmed |
| EMAIL-04 | Admin UI to configure Resend API key; stored in DB app_settings table | DB migration pattern documented; admin route pattern confirmed |
</phase_requirements>

---

## Summary

Phase 7 adds email sending of meeting minutes (HTML body + PDF attachment) via the Resend API. The implementation spans frontend (chips input in MeetingInfoForm, send button in Hoàn thành step) and backend (new Express route, Resend SDK integration, admin settings for API key).

The critical technical problem is PDF attachment generation. The existing `downloadAsPdf()` in `lib/minutesDocxExport.ts` uses `window.open()` and `window.print()` — browser-only APIs that cannot run server-side. However, **jsPDF is already installed** (`jspdf: ^4.2.0` in package.json). jsPDF v4 ships a Node.js-specific build (`jspdf.node.*.js`) that uses file operations instead of browser APIs and works without a DOM. The correct server-side approach: use jsPDF directly in the Express route to generate a PDF Buffer, then pass it as attachment content to the Resend SDK.

The existing `markdownToHtml()` function in `lib/minutesDocxExport.ts` is shared between client and server (pure TypeScript, no browser deps) and can be imported directly into the Express route to render the HTML email body.

**Primary recommendation:** Use jsPDF Node.js build for PDF Buffer generation server-side + Resend SDK for email delivery. No new libraries needed for PDF — jsPDF is already installed.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | 6.9.4 (latest) | Email delivery with attachment support | Official SDK, simple API, up to 40MB attachments as Buffer or base64 |
| jspdf | 4.2.1 (already installed) | Server-side PDF Buffer generation | Already in package.json; v4 Node.js build runs without DOM |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| postgres (already installed) | ^3.4.8 | Store Resend API key in app_settings DB table | New migration for key-value settings table |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsPDF Node build | Puppeteer | Puppeteer is 300MB+ and requires Chrome binary — overkill for this project; jsPDF is already installed |
| jsPDF Node build | pdf-lib | pdf-lib builds from scratch (not HTML-aware); would need to replicate existing markdown parsing |
| jsPDF Node build | @react-pdf/renderer | Adds React dependency server-side; unnecessary complexity |
| Resend SDK | nodemailer + SMTP | More config overhead; Resend is simpler and already chosen by user |

**Installation:**
```bash
npm install resend
```
(jsPDF is already installed — no additional PDF library needed)

**Version verification (confirmed 2026-03-19):**
- `resend`: 6.9.4
- `jspdf`: already at 4.2.1 in package.json

---

## Architecture Patterns

### Recommended Project Structure
```
server/routes/email.ts          # New Express router for POST /api/email/send-minutes
server/lib/pdfGenerator.ts      # Server-side PDF generation using jsPDF Node build
server/lib/emailTemplate.ts     # HTML email template builder (inline styles)
features/minutes/components/
  EmailRecipientsInput.tsx       # Chips/tags input component
  SendEmailButton.tsx            # Send button + status display
```

### Pattern 1: jsPDF Node.js Server-Side PDF Buffer

**What:** Import jsPDF in Node.js context — it automatically loads the Node build. Use `doc.output('arraybuffer')` then `Buffer.from()`.
**When to use:** Whenever PDF bytes are needed server-side for email attachment.
**Example:**
```typescript
// Source: jsPDF README (github.com/parallax/jsPDF)
// jsPDF auto-detects Node.js and loads jspdf.node.*.js (no DOM needed)
import { jsPDF } from 'jspdf';

export function generateMinutesPdfBuffer(htmlContent: string): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  // jsPDF text API works in Node without DOM
  // For structured text: use doc.text() with parsed lines
  // For rich layout: use doc.html() which requires jsdom polyfill (avoid)
  // RECOMMENDED: use doc.text() with the markdownToPlainLines() helper
  doc.setFont('helvetica');
  doc.setFontSize(11);
  // ... add text content from parsed markdown
  return Buffer.from(doc.output('arraybuffer'));
}
```

**Critical constraint:** `doc.html()` requires a real DOM and will fail server-side without jsdom. Do NOT use `doc.html()`. Instead, parse the markdown to plain text/lines and use `doc.text()` / `doc.setFont()` / `doc.addPage()`.

### Pattern 2: Resend SDK — HTML body + PDF Buffer attachment

**What:** Send email with Resend SDK passing Buffer directly to `attachments[].content`.
**When to use:** POST /api/email/send-minutes route handler.
**Example:**
```typescript
// Source: resend.com/docs/api-reference/emails/send-email (verified 2026-03-19)
import { Resend } from 'resend';

const resend = new Resend(apiKey);

const { data, error } = await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com',
  to: recipients,           // string[]
  subject: emailSubject,
  html: htmlBody,           // string — inline styles required for email clients
  attachments: [
    {
      filename: 'bien-ban-cuoc-hop.pdf',
      content: pdfBuffer,   // Buffer — Resend accepts Buffer directly
    },
  ],
});

if (error) throw error;
```

### Pattern 3: Admin Settings — app_settings DB Table

**What:** Key-value table in public schema for storing Resend API key. Follows existing patterns in schema.sql.
**When to use:** Admin UI to configure RESEND_API_KEY and RESEND_FROM_EMAIL.
**Example (migration):**
```sql
-- db/migrations/008_add_app_settings.sql
CREATE TABLE IF NOT EXISTS public.app_settings (
  key   text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

**Read API key in route:**
```typescript
const [row] = await sql`SELECT value FROM public.app_settings WHERE key = 'resend_api_key'`;
if (!row) return res.status(503).json({ error: 'Email service not configured' });
const resend = new Resend(row.value);
```

### Pattern 4: Chips/Tags Email Input Component

**What:** Controlled React component. State: `string[]` for confirmed tags, `string` for current input.
**When to use:** `MeetingInfoForm.tsx` — add after participants section.
**Example:**
```typescript
// Pattern: Enter/comma → validate → push to tags array
function EmailRecipientsInput({ value, onChange, maxRecipients = 20 }: Props) {
  const [inputVal, setInputVal] = useState('');
  const [error, setError] = useState('');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const addTag = (raw: string) => {
    const email = raw.trim().replace(/,+$/, '');
    if (!EMAIL_RE.test(email)) { setError('Email không hợp lệ'); return; }
    if (value.includes(email)) { setError('Email đã được thêm'); return; }
    if (value.length >= maxRecipients) { setError(`Tối đa ${maxRecipients} email`); return; }
    setError('');
    onChange([...value, email]);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    }
    if (e.key === 'Backspace' && inputVal === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };
  // ... render tags + input
}
```

### Pattern 5: MeetingInfo Type Extension

**What:** Add `recipientEmails: string[]` to `MeetingInfo` without breaking existing storage. Storage must NOT persist `recipientEmails` to localStorage (CONTEXT.md decision).
**Example:**
```typescript
// features/minutes/types.ts
export interface MeetingInfo {
  companyName: string;
  companyAddress: string;
  meetingDatetime: string;
  meetingLocation: string;
  participants: MeetingParticipant[];
  recipientEmails: string[];   // NEW — not persisted to localStorage
}

// features/minutes/storage.ts — saveMeetingInfoDraft MUST exclude recipientEmails
export function saveMeetingInfoDraft(info: MeetingInfo): void {
  const { recipientEmails: _, ...persistable } = info;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(persistable));
}
```

### Pattern 6: HTML Email Template (Inline Styles)

**What:** Email HTML must use inline CSS only — no `<style>` blocks, no external stylesheets. Gmail, Outlook strip external styles.
**When to use:** Build `htmlBody` string in the email route.
**Example:**
```typescript
// server/lib/emailTemplate.ts
export function buildEmailHtml(opts: {
  companyName: string;
  meetingDatetime: string;
  meetingLocation: string;
  participants: MeetingParticipant[];
  minutesHtml: string;   // from markdownToHtml()
}): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fa;margin:0;padding:24px">
  <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#4f46e5;padding:32px 40px">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700">Biên bản cuộc họp</h1>
      <p style="color:#c7d2fe;margin:8px 0 0;font-size:14px">${opts.companyName}</p>
    </div>
    <div style="padding:32px 40px">
      <!-- meta, participants, minutesHtml -->
      ${opts.minutesHtml}
    </div>
  </div>
</body>
</html>`;
}
```

### Anti-Patterns to Avoid

- **Using `downloadAsPdf()` server-side:** It calls `window.open()` — will crash Node.js immediately.
- **Using `doc.html()` in jsPDF server-side:** Requires real DOM; will throw "document is not defined" without jsdom polyfill.
- **Calling `markdownToHtml()` from `lib/minutesDocxExport.ts` directly in server code:** The file also contains `downloadAsPdf()` which calls `window.open()`. Importing the whole module in Node.js will fail. **Copy or re-export only `markdownToHtml` to a shared `lib/markdownUtils.ts`** that has no browser deps.
- **Exposing Resend API key to client:** Route must be server-side only, key read from DB on every request.
- **Using `<style>` blocks in email HTML:** Gmail strips them. All styles must be inline.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery with attachments | Custom SMTP client | Resend SDK (`resend` npm package) | Rate limiting, bounce handling, delivery tracking built-in |
| PDF generation server-side | Browser-based PDF via Puppeteer | jsPDF Node build (already installed) | 300MB vs ~3MB; no Chrome binary needed |
| Email address validation | Custom regex | Standard RFC-5322 regex (simple pattern sufficient for UX) | Resend API will reject truly invalid addresses; client validation is UX only |

**Key insight:** The entire PDF generation problem is solved by the jsPDF Node build that's already installed. The only missing piece is the Resend npm package.

---

## Common Pitfalls

### Pitfall 1: Importing Browser-Only Code in Node.js Route

**What goes wrong:** `server/routes/email.ts` imports from `lib/minutesDocxExport.ts`. That module's top-level scope calls nothing browser-specific, but `downloadAsPdf()` references `window` at call time — safe to import. However, if the bundler ever tree-shakes aggressively or if new code is added, this can break.

**Why it happens:** `lib/minutesDocxExport.ts` was written as a client-only file. It imports `document.createElement` patterns inside function bodies (safe), but `downloadAsPdf` explicitly calls `window.open()`.

**How to avoid:** Extract `markdownToHtml()` into a new file `lib/markdownUtils.ts` with zero browser dependencies. Import only from there in the server route.

**Warning signs:** `ReferenceError: window is not defined` in server logs on startup.

### Pitfall 2: jsPDF `doc.html()` Requires DOM

**What goes wrong:** Attempting to use `doc.html(htmlString)` in Node.js throws `document is not defined` or `HTMLElement is not defined`.

**Why it happens:** `doc.html()` uses the browser's DOM to parse and render HTML into canvas elements.

**How to avoid:** Use `doc.text()` with parsed markdown content. The existing `markdownToDocxParagraphs()` logic shows how to parse markdown to structured blocks — apply the same logic to build jsPDF text calls. Accept that server-side PDF will be plain text layout (not pixel-perfect HTML rendering). The HTML body carries the visual presentation; the PDF attachment is for archive/printing.

**Warning signs:** Empty PDF, error in console, or server crash on `doc.html()` call.

### Pitfall 3: jsPDF in Node.js Requires No Special Import — Auto-Detects

**What goes wrong:** Developer tries to find `jspdf/node` or special import path.

**Why it happens:** Docs are unclear; some older guides suggest manual patching.

**How to avoid:** Simply `import { jsPDF } from 'jspdf'` in Node.js context. The library detects `typeof window === 'undefined'` and loads the Node-specific build automatically.

### Pitfall 4: Resend `attachments[].content` Must Be Buffer, Not Base64 String (in Node.js SDK)

**What goes wrong:** Passing a base64 string when SDK expects a Buffer causes malformed PDF.

**Why it happens:** The API docs show both formats are valid at the HTTP level, but the Node.js SDK's `send()` method processes the `content` field differently.

**How to avoid:** Use `Buffer.from(doc.output('arraybuffer'))` and pass the Buffer directly. Do NOT call `.toString('base64')` before passing to Resend SDK.

### Pitfall 5: Resend Domain Verification

**What goes wrong:** Emails go to spam or are rejected because the `from` domain isn't verified in Resend.

**Why it happens:** Resend requires domain verification (SPF, DKIM records) for custom `from` domains.

**How to avoid:** The `RESEND_FROM_EMAIL` setting should use a domain that has been verified in the Resend dashboard. During development, the Resend test address `onboarding@resend.dev` can be used but only delivers to the account owner's verified email.

### Pitfall 6: Vietnamese Characters in PDF (jsPDF font support)

**What goes wrong:** Vietnamese diacritics (ả, ờ, ề, etc.) render as rectangles or are missing in the PDF.

**Why it happens:** jsPDF's built-in fonts (Helvetica, Times, Courier) are Latin-only. They do not include Vietnamese Unicode glyphs.

**How to avoid:** For the PDF attachment, consider using only the Helvetica font and accepting that Vietnamese characters may render as substitutes, OR embed a Unicode font (Noto Sans) using `doc.addFileToVFS()` + `doc.addFont()`. The font file must be available as base64 on the server.

**Recommendation (Claude's discretion):** Use the approach of embedding Noto Sans Vietnamese as a base64 string in a constant file — this is the standard jsPDF pattern for CJK/diacritic character support. If this adds too much complexity, fall back to a note in the PDF saying "see HTML body for full formatting."

**Alternative:** Skip rich PDF with Vietnamese chars entirely and make the PDF a simple ASCII/Latin summary with a message "Full minutes in email body". The HTML body carries the full content beautifully.

### Pitfall 7: `recipientEmails` Must Not Be Saved to localStorage Draft

**What goes wrong:** `saveMeetingInfoDraft(value)` in `MeetingInfoForm.tsx` is called in a `useEffect` on every state change. Adding `recipientEmails` to `MeetingInfo` without modifying `saveMeetingInfoDraft` will silently persist emails.

**How to avoid:** In `storage.ts`, destructure `recipientEmails` out of the object before `JSON.stringify`. Per CONTEXT.md decision: email recipients do NOT persist.

---

## Code Examples

### Express Email Route — Full Pattern

```typescript
// server/routes/email.ts
// Source: resend.com/docs + jsPDF README (verified 2026-03-19)
import { Router } from 'express';
import { Resend } from 'resend';
import { jsPDF } from 'jspdf';
import { requireAuth } from '../auth';
import sql from '../db';
import { markdownToHtml } from '../../lib/markdownUtils';   // extracted, no browser deps

const router = Router();

router.post('/send-minutes', requireAuth, async (req, res) => {
  const { recipients, subject, minutesMarkdown, meetingInfo } = req.body;

  // 1. Load Resend API key from DB
  const [setting] = await sql`SELECT value FROM public.app_settings WHERE key = 'resend_api_key'`;
  if (!setting) return res.status(503).json({ error: 'Email chưa được cấu hình. Admin cần thêm Resend API key.' });

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com';

  // 2. Generate PDF Buffer using jsPDF Node build
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  // ... add text content using doc.text()
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  // 3. Build HTML email body
  const minutesHtml = markdownToHtml(minutesMarkdown);
  const htmlBody = buildEmailHtml({ ...meetingInfo, minutesHtml });

  // 4. Send via Resend
  const resend = new Resend(setting.value);
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: recipients,
    subject,
    html: htmlBody,
    attachments: [{ filename: 'bien-ban-cuoc-hop.pdf', content: pdfBuffer }],
  });

  if (error) return res.status(502).json({ error: error.message });
  return res.json({ ok: true, id: data?.id });
});

export default router;
```

### Admin Route — GET/PUT app_settings

```typescript
// Thêm vào server/routes/admin.ts — pattern matches existing PUT /api/admin/users/:id
router.get('/settings', requireAuth, requireAdmin, async (req, res) => {
  const rows = await sql`SELECT key, value FROM public.app_settings`;
  // Mask API key: return only first 8 chars
  const masked = rows.map(r =>
    r.key === 'resend_api_key'
      ? { key: r.key, value: r.value.slice(0, 8) + '…' }
      : r
  );
  res.json({ settings: masked });
});

router.put('/settings', requireAuth, requireAdmin, async (req, res) => {
  const { key, value } = req.body;
  const ALLOWED_KEYS = ['resend_api_key', 'resend_from_email', 'email_max_recipients'];
  if (!ALLOWED_KEYS.includes(key)) return res.status(400).json({ error: 'Unknown setting key' });
  await sql`
    INSERT INTO public.app_settings (key, value, updated_at)
    VALUES (${key}, ${value}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
  `;
  res.json({ ok: true });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| window.print() for PDF | jsPDF Node.js build, `doc.output('arraybuffer')` | jsPDF v2+ | Enables server-side PDF without browser |
| nodemailer + SMTP | Resend SDK | 2023-present | Simpler API, no SMTP config, built-in analytics |
| Storing secrets in .env only | DB-backed admin settings | Standard for multi-tenant apps | Admin can rotate keys without redeployment |

**Deprecated/outdated:**
- `window.print()` for PDF generation: browser-only, cannot be used server-side
- `node-jspdf` (separate npm package): was a fork for older jsPDF; jsPDF v2+ includes Node support natively
- Sending API keys from frontend: always a security anti-pattern

---

## Open Questions

1. **Vietnamese font support in PDF attachment**
   - What we know: jsPDF built-in fonts are Latin-only; Vietnamese diacritics will not render
   - What's unclear: Whether embedding Noto Sans (~2MB base64) is acceptable for this project's bundle
   - Recommendation: Plan should include a decision point. Default to: embed Noto Sans if file size acceptable; otherwise make the PDF English-only with a note. The HTML email body renders Vietnamese perfectly.

2. **`markdownToHtml()` extraction**
   - What we know: This function lives in `lib/minutesDocxExport.ts` alongside `downloadAsPdf()` (browser-only)
   - What's unclear: Whether importing `lib/minutesDocxExport.ts` in Node.js will cause startup errors
   - Recommendation: Extract `markdownToHtml()` to a new `lib/markdownUtils.ts` as a safe refactor in Wave 0 of the plan.

3. **Resend domain verification for production**
   - What we know: The `from` email must use a Resend-verified domain
   - What's unclear: Whether the project owner has a domain configured in Resend
   - Recommendation: Plan should include a note for the operator: verify domain in Resend dashboard before going live. The feature will work in development with `onboarding@resend.dev`.

---

## Validation Architecture

> `workflow.nyquist_validation` is absent from config.json — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.x |
| Config file | vitest.config.ts (inferred from package.json scripts) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test:all` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EMAIL-01 | EmailRecipientsInput validates and caps at 20 | unit | `npx vitest run features/minutes/components/EmailRecipientsInput.test.tsx` | Wave 0 |
| EMAIL-01 | saveMeetingInfoDraft does not persist recipientEmails | unit | `npx vitest run features/minutes/storage.test.ts` | Wave 0 |
| EMAIL-02 | SendEmailButton disabled when recipients empty | unit | `npx vitest run features/minutes/components/SendEmailButton.test.tsx` | Wave 0 |
| EMAIL-03 | POST /api/email/send-minutes calls Resend with correct payload | integration | `npm run test:integration` | Wave 0 |
| EMAIL-04 | GET/PUT /api/admin/settings stores and masks Resend API key | integration | `npm run test:integration` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test:all`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `lib/markdownUtils.ts` — extract `markdownToHtml` from minutesDocxExport.ts (no browser deps)
- [ ] `db/migrations/008_add_app_settings.sql` — app_settings table
- [ ] `features/minutes/components/EmailRecipientsInput.test.tsx` — covers EMAIL-01
- [ ] `features/minutes/storage.test.ts` — covers EMAIL-01 (recipientEmails not persisted)
- [ ] `features/minutes/components/SendEmailButton.test.tsx` — covers EMAIL-02
- [ ] Integration test for email route — covers EMAIL-03, EMAIL-04

---

## Sources

### Primary (HIGH confidence)
- resend.com/docs/api-reference/emails/send-email — attachment format (`content: Buffer | string`, `filename`, `content_type`)
- github.com/parallax/jsPDF README — Node.js auto-detection, `doc.output('arraybuffer')`, no DOM required for basic text API
- /Users/tanliem/Desktop/meeting-main/package.json — confirmed jspdf@^4.2.0 already installed, resend NOT installed
- /Users/tanliem/Desktop/meeting-main/lib/minutesDocxExport.ts — confirmed `markdownToHtml()` is pure TS; `downloadAsPdf()` calls `window.open()`
- /Users/tanliem/Desktop/meeting-main/server/routes/admin.ts — admin route pattern with `requireAuth` + `requireAdmin`
- /Users/tanliem/Desktop/meeting-main/db/schema.sql — no existing app_settings table; migration needed

### Secondary (MEDIUM confidence)
- npm registry: `resend` latest version 6.9.4 (verified via `npm view resend version` 2026-03-19)
- npm registry: `jspdf` latest version 4.2.1 (verified via `npm view jspdf version` 2026-03-19)
- jsPDF GitHub issues #2248, #2226 — Node.js server-side usage patterns confirmed working

### Tertiary (LOW confidence)
- Medium / dev.to articles on jsPDF Node.js Buffer pattern — corroborates jsPDF README but secondary sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — jsPDF Node.js support verified from official README; Resend SDK verified from official docs; versions verified from npm registry
- Architecture patterns: HIGH — all patterns derived from reading actual project source files and official docs
- Pitfalls: HIGH — window.print() issue confirmed from source code analysis; jsPDF DOM limitation confirmed from official GitHub issues; Vietnamese font issue is a known jsPDF limitation
- markdownToHtml extraction: HIGH — confirmed by reading minutesDocxExport.ts directly

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (Resend API is stable; jsPDF v4 is current)
