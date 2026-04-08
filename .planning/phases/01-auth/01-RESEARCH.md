# Phase 1: Auth — Research

**Researched:** 2026-04-08  
**Domain:** Email verification after self-registration + Google OAuth 2.0, integrated with custom JWT + PostgreSQL (no Supabase Auth client)  
**Confidence:** HIGH (codebase + CONTEXT locked; Google flow per official docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Nội dung dưới đây trích từ `.planning/phases/01-auth/01-CONTEXT.md` (phần quyết định đã khóa).

#### Stack (canonical)

- Backend: Express, `server/routes/auth.ts`, JWT (`server/auth.ts` hoặc tương đương), Postgres `auth.users` + `public.profiles` (`db/schema.sql`).
- Frontend: `lib/auth.ts`, `components/LoginPage.tsx`, `components/RegisterPage.tsx`, routing trong `App.tsx`.
- Gửi email: Resend đã dùng cho biên bản (`server/routes/email.ts`, `RESEND_API_KEY`, `RESEND_FROM`) — tái sử dụng cho email xác nhận.

#### Đăng ký email/password

- Sau khi đăng ký thành công: **không** trả JWT / không đăng nhập tự động cho đến khi email được xác nhận (trừ user được đánh dấu đã verify bởi hệ thống, ví dụ seed/admin).
- Gửi một email chứa link xác nhận (token có thời hạn, one-time hoặc idempotent theo best practice).

#### Đăng nhập

- Email/password: chỉ cho phép nếu tài khoản đã xác nhận email (trừ legacy/admin bypass nếu plan ghi rõ).
- Google OAuth: sau callback hợp lệ, coi email từ Google là đã verified; tạo hoặc liên kết user và cấp JWT giống luồng login thường.

#### Bảo mật & cấu hình

- Biến môi trường cho Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, redirect URI khớp Google Cloud Console.
- URL frontend cho redirect sau OAuth (ví dụ `VITE_APP_URL` hoặc đã có biến tương đương) phải nhất quán với cấu hình server.

### Claude's Discretion

- Cơ chế lưu token xác nhận (bảng riêng vs cột trên `auth.users`), độ dài TTL, copy UI tiếng Việt.
- Có thêm dependency OAuth tối thiểu (ví dụ client OAuth2) hay dùng `fetch` thuần — ưu tiên đúng chuẩn và dễ test.

### Deferred Ideas (OUT OF SCOPE)

- Magic link đăng nhập không mật khẩu
- Apple / Microsoft OAuth
- Đổi email đã verify (re-verify)

</user_constraints>

## Summary

Hệ thống hiện có đăng ký/đăng nhập JWT qua Express + `jsonwebtoken`, cookie `session`/`refresh_token` (`server/routes/auth.ts`, `server/auth.ts`), client lưu Bearer token trong `localStorage` và gọi API kèm `credentials: 'include'` (`lib/api.ts`, `lib/auth.ts`). Schema Postgres (`db/schema.sql`) chưa có trạng thái verify email hay khóa OAuth — cần migration và chỉnh `login`/`register`/`refresh` để user tự đăng ký không nhận phiên cho đến khi xác nhận email.

Google OAuth nên theo luồng **Authorization Code** dành cho web server (client secret chỉ trên server). Google khuyến nghị dùng client library để đổi code lấy token và xử lý chi tiết protocol ([Using OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)). Với Node/TypeScript, **`google-auth-library`** là lựa chọn chuẩn, gọn cho `getToken` + `verifyIdToken` khi dùng scope OpenID.

**Primary recommendation:** Thêm cột `email_verified_at` (và tùy chọn `google_sub`) trên `auth.users`, bảng token xác nhận (hash + hết hạn + dùng một lần), endpoint verify; chặn `login`/`refresh` nếu chưa verify; triển khai OAuth bằng `google-auth-library` với `state` chống CSRF và chính sách liên kết email rõ ràng để tránh account takeover.

## Standard Stack

### Core

| Library / piece | Version (verified 2026-04-08) | Purpose | Why Standard |
|-----------------|--------------------------------|---------|--------------|
| `express` | ^4.21.2 (project) | HTTP API | Đã là stack auth hiện tại |
| `jsonwebtoken` | ^9.0.2 (project); registry latest 9.0.3 | Access + refresh JWT | Đã dùng trong `server/auth.ts` |
| `bcryptjs` | ^2.4.3 (project) | Password hash | Đã dùng register/login/admin |
| `zod` | ^4.3.6 (project) | Request validation | `RegisterSchema` và pattern hiện có |
| `postgres` | ^3.4.8 (devDependency, server) | DB access | `server/db` pattern hiện có |
| `resend` | ^6.9.4 (project) | Transactional email | Đã dùng `server/routes/email.ts`; tái dụng cho mail verify |
| `google-auth-library` | **10.6.2** (`npm view`, 2026-04-08) | OAuth2 code exchange + verify `id_token` | Google khuyến nghị client libraries cho web server OAuth; ít lỗi hơn so với tự parse endpoint |

### Supporting

| Piece | Purpose | When to Use |
|-------|---------|-------------|
| `node:crypto` (`randomBytes`, `createHash`, `timingSafeEqual`) | Token ngẫu nhiên, hash token verify, so sánh an toàn | Luôn — không cần thêm package |
| `express-rate-limit` | Giới hạn register/login | Đã có trên login/register — giữ và áp dụng tương tự endpoint verify/OAuth nếu cần |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `google-auth-library` | Raw `fetch` tới `https://oauth2.googleapis.com/token` + `userinfo` | Ít dependency nhưng phải tự xử lý lỗi, refresh edge cases, và kiểm chứng JWT thủ công — CONTEXT cho phép thư viện tối thiểu; **chọn `google-auth-library`** |
| Bảng token verify | Signed JWT trong link only | Khó revoke/thống kê; bảng DB + hash phù hợp audit và one-time use |

**Installation (OAuth only — nếu planner chốt dùng library):**

```bash
npm install google-auth-library
```

**Version verification:** `npm view google-auth-library version` → 10.6.2; `npm view jsonwebtoken version` → 9.0.3.

## Architecture Patterns

### Recommended shape (server)

```
server/
├── auth.ts                 # JWT sign/verify, requireAuth (giữ nguyên contract)
├── routes/
│   └── auth.ts             # login, register, refresh, me + verify-email + google start/callback
└── lib/                    # (optional) emailVerification.ts, googleOAuth.ts — tách để test
```

### Pattern 1: Email verification token (hash trong DB)

**What:** Tạo secret ngẫu nhiên gửi qua email; trong DB chỉ lưu `SHA-256(secret)` hoặc tương đương, `expires_at`, `used_at`.  
**When to use:** Self-service register — khớp yêu cầu one-time / idempotent (đánh dấu `used_at` sau khi verify thành công).  
**Example:**

```typescript
// Pattern: hash raw token before persist; compare with timingSafeEqual
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

const raw = randomBytes(32).toString('base64url');
const tokenHash = createHash('sha256').update(raw).digest();
// store tokenHash, user_id, expires_at; send link ?token=${raw}
```

### Pattern 2: Google OAuth 2.0 Authorization Code (server-side)

**What:** `GET` bắt đầu → redirect Google với `scope=openid email profile` + `state`; callback nhận `code` → `OAuth2Client.getToken(code)` → `verifyIdToken` với `audience = GOOGLE_CLIENT_ID` → đọc `sub`, `email`, `email_verified`.  
**When to use:** Đăng nhập/đăng ký bằng Google sau khi user consent.  
**Example:**

```typescript
// Source: https://developers.google.com/identity/protocols/oauth2/web-server
import { OAuth2Client } from 'google-auth-library';

const redirectUri = `${process.env.API_PUBLIC_URL}/api/auth/google/callback`;
const client = new OAuth2Client(clientId, clientSecret, redirectUri);
const { tokens } = await client.getToken(code);
const ticket = await client.verifyIdToken({
  idToken: tokens.id_token!,
  audience: clientId,
});
const payload = ticket.getPayload();
// payload.sub, payload.email, payload.email_verified
```

### Pattern 3: Frontend callback handling

**What:** SPA nhận redirect về route cố định (ví dụ `/auth/callback?code=&state=` hoặc chỉ `code` nếu backend là redirect URI — **redirect URI của Google phải trỏ tới URL mà backend hoặc frontend xử lý được**; thông thường SPA dùng frontend URL làm redirect rồi frontend POST code lên server, hoặc backend callback rồi redirect SPA kèm fragment/session).  
**When to use:** Sau OAuth, thống nhất với JWT hiện có: server set cookie + trả JSON token giống `login`.  
**Prescriptive note cho planner:** Chốt một luồng: **(A)** redirect URI = backend `.../api/auth/google/callback` → server đổi code, set cookie, redirect browser tới `APP_URL/?logged_in=1` hoặc tương đương; hoặc **(B)** redirect URI = frontend → frontend gọi `POST /api/auth/google/exchange` với `code`. **(A)** giữ `client_secret` khỏi trình duyệt và đơn giản hóa CORS cho bước đổi code.

### Anti-Patterns to Avoid

- **Trả JWT ngay trong `POST /register`:** Trái CONTEXT; phải trả message + hướng dẫn kiểm tra email.
- **Lưu token verify dạng plaintext:** Rò rỉ DB = compromise hàng loạt.
- **OAuth không có `state`:** Mở CSRF đăng nhập/chèn session.
- **Tự động liên kết Google với user email/password chỉ vì trùng email:** Nguy cơ account takeover nếu email Google không thuộc cùng người — cần policy rõ (ví dụ chỉ link khi đã đăng nhập password, hoặc chỉ tạo user mới nếu email chưa tồn tại).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Đổi authorization code → tokens + verify chữ ký `id_token` | Custom fetch-only stack không có test | `google-auth-library` (`OAuth2Client`, `verifyIdToken`) | Google document hướng tới client libraries; giảm sai lệch OIDC |
| So sánh token verify từ URL | `===` trên string có thể leak timing | `crypto.timingSafeEqual` trên buffer sau hash | Best practice chống timing attacks |
| Gửi email HTML | SMTP tùy chỉnh mới | Resend SDK như `server/routes/email.ts` | Đã có `RESEND_*` và pattern gửi mail |

**Key insight:** Phần “dễ tưởng đơn giản” là OAuth exchange + JWT claims Google — hand-roll dễ sai `aud`/`iss`/clock skew; thư viện chính thức giảm rủi ro.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Mọi user hiện tại trong `auth.users` không có cờ verify | Migration: thêm cột; **gán `email_verified_at` cho user hiện có** (hoặc policy legacy rõ trong plan) để không khóa toàn bộ production |
| Stored data | User tạo qua `POST /api/admin/users` (`server/routes/admin.ts`) | Set verify ngay khi insert (admin-created = trusted theo CONTEXT) |
| Live service config | Google Cloud Console: Authorized redirect URIs, client ID/secret | Đăng ký URI khớp path thực tế (dev/staging/prod) |
| Secrets/env vars | Thiếu `GOOGLE_*` trong `.env.example` hiện tại | Thêm biến + `API_PUBLIC_URL` hoặc dùng `APP_URL`/PORT để build redirect URI chính xác |
| Build artifacts | Không có artifact tên chứa auth | None — verified: không áp dụng |

## Common Pitfalls

### Pitfall 1: `POST /auth/refresh` cấp JWT cho user chưa verify

**What goes wrong:** User đăng ký, không verify, nhưng nếu từng có refresh token (bug regression) vẫn vào app.  
**Why it happens:** Refresh chỉ kiểm tra `verifyRefreshToken` + tồn tại user, không đọc verify.  
**How to avoid:** Sau khi có `email_verified_at`, từ chối refresh khi `email_verified_at IS NULL` (trừ bypass legacy đã ghi trong plan).  
**Warning signs:** Test chỉ cover login, không cover refresh.

### Pitfall 2: Cookie `session` + Bearer token lệch trạng thái verify

**What goes wrong:** Client có token cũ trong `localStorage` trong khi server đã revoke/đổi rule.  
**Why it happens:** Hai kênh auth song song.  
**How to avoid:** Sau verify email, yêu cầu login lại hoặc invalidate refresh; `getMe` đã refresh token — đảm bảo payload luôn sync với DB.  
**Warning signs:** User “đã verify” nhưng UI vẫn báo lỗi quyền.

### Pitfall 3: Resend `from` domain chưa verify

**What goes wrong:** Email xác nhận không gửi được production.  
**Why it happens:** Dùng `onboarding@resend.dev` chỉ phù hợp test.  
**How to avoid:** Document `RESEND_FROM` giống phase email biên bản; 503/fail rõ ràng khi thiếu key.  
**Warning signs:** Register 201 nhưng không có mail, log Resend error.

### Pitfall 4: Redirect URI mismatch

**What goes wrong:** Google trả `redirect_uri_mismatch`.  
**Why it happens:** `http` vs `https`, port, trailing slash, hoặc path khác một ký tự.  
**How to avoid:** Một hằng số `GOOGLE_REDIRECT_URI` trong env, dùng chốt cho cả Google Console và code.  
**Warning signs:** OAuth chỉ fail trên production URL.

## Code Examples

### Resend — tái sử dụng pattern hiện có

```typescript
// Source: server/routes/email.ts (pattern)
const resend = new Resend(process.env.RESEND_API_KEY!);
await resend.emails.send({
  from: process.env.RESEND_FROM ?? 'Meeting Scribe <onboarding@resend.dev>',
  to: [email],
  subject: 'Xác nhận email',
  html: `<p><a href="${verifyUrl}">Xác nhận</a></p>`,
});
```

### requireAuth — không đổi contract payload

JWT payload hiện tại: `userId`, `email`, `role`, `plans`, `features` (`server/auth.ts`). Giữ nguyên; verify email là **điều kiện gate** tại login/refresh, không nhất thiết thêm claim mới.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase Auth client (AGENTS.md mô tả SPA cũ) | Custom JWT + Postgres trong repo này | Trước phase này (Phase 4 DB) | Planner chỉ mở rộng `auth.users`, không quay lại Supabase Auth |
| Register trả JWT ngay | Register pending verify | Phase 01 (planned) | Breaking change API response — cập nhật `lib/auth.ts` + `RegisterPage` |

**Deprecated/outdated:** Coi tài liệu AGENTS.md phần “Supabase làm DB/auth” là **lịch sử** cho auth JWT hiện tại; source of truth là `server/routes/auth.ts` + `db/schema.sql`.

## Open Questions

1. **`.planning/REQUIREMENTS.md` không tồn tại trong workspace** — requirement ID chưa map.
   - What we know: CONTEXT + success criteria trong objective.
   - What's unclear: REQ-XX chính thức.
   - Recommendation: Planner tạo/ghi requirement ID trong PLAN hoặc khôi phục file REQUIREMENTS.

2. **Liên kết tài khoản Google với user đã có cùng email**
   - What we know: CONTEXT yêu cầu “tạo hoặc liên kết”.
   - What's unclear: Cho phép auto-link hay bắt buộc đăng nhập password trước.
   - Recommendation: **Default an toàn:** nếu `auth.users` đã có email với `password_hash` NOT NULL và chưa có `google_sub`, **không** auto-link qua OAuth; trả lỗi hướng dẫn đăng nhập password hoặc flow link sau đăng nhập (ghi rõ trong PLAN).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Server + vitest | ✓ | v22.22.1 (local); `package.json` engines `20.x` | Dùng Node 20+ theo engines khi CI |
| Docker | `docker-compose.test.yml` / integration DB | ✓ | 29.1.3 | — |
| `psql` | Manual migration / debug | ✓ | 18.3 (Homebrew) | Dùng `docker exec` như script seed |
| Google Cloud project | OAuth | — human | — | Không có fallback; cần tạo OAuth Web client |
| Resend | Email verify | Env | — | Dev có thể log link ra console nếu policy cho phép (chỉ non-prod) |

**Missing dependencies with no fallback:**

- OAuth credentials (client ID/secret) và redirect URI đã đăng ký.

**Missing dependencies with fallback:**

- None cho production email — nếu không có `RESEND_API_KEY`, coi verify email là không khả dụng và trả 503 hoặc queue (planner quyết định).

## Validation Architecture

| Dimension | Approach |
|-----------|----------|
| **Contract / schema** | Mở rộng `RegisterSchema` tests; thêm tests cho response register (không có `token`). |
| **Unit** | Vitest (`npm run test:unit`): logic verify token hash, OAuth payload mapping (mock `google-auth-library`). File hiện có: `server/routes/__tests__/auth.register-workflow.test.ts` — mở rộng cùng thư mục. |
| **Integration** | `npm run test:integration` với Postgres test (`vitest.integration.config.ts`, pattern các `*.integration.test.ts`): login fail khi `email_verified_at` null; verify flow cập nhật DB; admin create user có verified. |
| **Security** | Rate limit; `state` OAuth; không log raw verify token / authorization code; `timingSafeEqual` cho so khớp hash. |
| **Manual / E2E** | Luồng đầy đủ: đăng ký → email (hoặc copy token dev) → verify → login; Google staging. |

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `vite` default + `vitest.integration.config.ts` |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test:all` |

### Phase Requirements → Test Map

| ID | Behavior | Test Type | Automated Command | File Exists? |
|----|----------|-----------|-------------------|--------------|
| — | Chưa có REQ-ID (REQUIREMENTS.md missing) | — | — | ❌ |

### Sampling Rate

- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test:all`
- **Phase gate:** Full suite xanh trước verify

### Wave 0 Gaps

- [ ] `server/routes/__tests__/auth.verify.integration.test.ts` (hoặc tương đương) — DB + verify endpoint
- [ ] `server/routes/__tests__/auth.google.test.ts` — mock OAuth client
- [ ] Cập nhật `components/__tests__` cho Register/Login nếu có — kiểm tra `RegisterPage` không gọi `onRegisterSuccess` như đăng nhập thành công

## Project Constraints (from .cursor/rules/)

**Không có file trong `.cursor/rules/`** — không có rule bổ sung từ thư mục này.

Ghi nhận từ `AGENTS.md` (workspace): không sửa file chưa đọc; **tests phải pass** (`npm test`); không commit `.env`; **tránh dependency mới không cần thiết** — ngoại lệ: CONTEXT “Claude's discretion” cho phép thêm OAuth client tối thiểu → **`google-auth-library` là hợp lệ**.

## Sources

### Primary (HIGH confidence)

- [Google — Using OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server) — authorization code, client libraries recommendation
- Codebase: `server/routes/auth.ts`, `server/auth.ts`, `db/schema.sql`, `lib/auth.ts`, `server/routes/email.ts`, `server/routes/admin.ts`, `.env.example`
- `.planning/phases/01-auth/01-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)

- `npm view google-auth-library version` → 10.6.2

### Tertiary (LOW confidence)

- None bổ sung — không dùng WebSearch chưa đối chiếu cho claim kỹ thuật cốt lõi

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — align với repo + npm registry + Google docs
- Architecture: **HIGH** — map trực tiếp file hiện có
- Pitfalls: **HIGH** — suy ra từ code paths (`refresh`, cookies, Resend)

**Research date:** 2026-04-08  
**Valid until:** ~2026-05-08 (OAuth/libs); sớm hơn nếu Google đổi policy OIDC

## RESEARCH COMPLETE
