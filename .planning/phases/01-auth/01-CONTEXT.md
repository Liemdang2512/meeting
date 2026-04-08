# Phase 1: Auth — Context (cập nhật)

**Gathered:** 2026-04-08  
**Status:** Ready for planning  
**Ghi chú:** Bổ sung theo yêu cầu — xác nhận email khi đăng ký và đăng nhập Google OAuth. Codebase đã hoàn thành Phase 4 (PostgreSQL tự quản); auth hiện là JWT + `auth.users` trong Postgres, **không** dùng Supabase Auth client.

<domain>
## Phase boundary

Mở rộng hệ thống auth hiện có:

1. **Xác nhận email sau đăng ký:** Người đăng ký tự do (`POST /api/auth/register`) chỉ được coi là kích hoạt sau khi xác nhận qua link/email; trước đó không cấp phiên đăng nhập đầy đủ (hoặc không cho đăng nhập).
2. **Google OAuth:** Người dùng có thể đăng nhập (và khi cần thì tạo tài khoản) bằng Google; phiên JWT thống nhất với luồng email/password sau khi xác thực Google thành công.

Admin tạo user / invite-only có thể vẫn tồn tại song song (tùy implementation hiện tại); các quyết định chi tiết về user do admin tạo (auto-verified hay không) ghi rõ trong plan.

</domain>

<decisions>
## Implementation decisions (locked)

### Stack (canonical)

- Backend: Express, `server/routes/auth.ts`, JWT (`server/auth.ts` hoặc tương đương), Postgres `auth.users` + `public.profiles` (`db/schema.sql`).
- Frontend: `lib/auth.ts`, `components/LoginPage.tsx`, `components/RegisterPage.tsx`, routing trong `App.tsx`.
- Gửi email: Resend đã dùng cho biên bản (`server/routes/email.ts`, `RESEND_API_KEY`, `RESEND_FROM`) — tái sử dụng cho email xác nhận.

### Đăng ký email/password

- Sau khi đăng ký thành công: **không** trả JWT / không đăng nhập tự động cho đến khi email được xác nhận (trừ user được đánh dấu đã verify bởi hệ thống, ví dụ seed/admin).
- Gửi một email chứa link xác nhận (token có thời hạn, one-time hoặc idempotent theo best practice).

### Đăng nhập

- Email/password: chỉ cho phép nếu tài khoản đã xác nhận email (trừ legacy/admin bypass nếu plan ghi rõ).
- Google OAuth: sau callback hợp lệ, coi email từ Google là đã verified; tạo hoặc liên kết user và cấp JWT giống luồng login thường.

### Bảo mật & cấu hình

- Biến môi trường cho Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, redirect URI khớp Google Cloud Console.
- URL frontend cho redirect sau OAuth (ví dụ `VITE_APP_URL` hoặc đã có biến tương đương) phải nhất quán với cấu hình server.

### Claude's discretion

- Cơ chế lưu token xác nhận (bảng riêng vs cột trên `auth.users`), độ dài TTL, copy UI tiếng Việt.
- Có thêm dependency OAuth tối thiểu (ví dụ client OAuth2) hay dùng `fetch` thuần — ưu tiên đúng chuẩn và dễ test.

</decisions>

<code_context>
## Existing code insights

- `server/routes/auth.ts` — register hiện insert user + profile và trả JWT ngay; cần thay đổi cho luồng verify.
- `lib/auth.ts` — `register()` hiện lưu token; cần điều chỉnh theo response mới.
- `db/schema.sql` — `auth.users` có `email`, `password_hash`, `created_at`; cần migration cho verify + Google subject.
- Email: pattern Resend trong `server/routes/email.ts`.

</code_context>

<canonical_refs>
## Canonical references

**Executor/planner phải đọc trước khi sửa.**

- `db/schema.sql` — schema `auth.users`, `profiles`
- `server/routes/auth.ts` — login, register, refresh, me
- `server/auth.ts` (hoặc file ký JWT tương ứng) — claims, middleware
- `lib/auth.ts` — client auth
- `components/LoginPage.tsx`, `components/RegisterPage.tsx`, `App.tsx`
- `server/routes/email.ts` — Resend
- `.env.example` — biến môi trường document

</canonical_refs>

<specifics>
## Ý tưởng cụ thể

- Trang đăng ký: sau submit thành công hiển thị hướng dẫn “Kiểm tra hộp thư” thay vì gọi `onRegisterSuccess` đăng nhập ngay.
- Trang login: nút “Tiếp tục với Google” + xử lý callback (query param `code` hoặc route riêng `/auth/callback`).

</specifics>

<deferred>
## Deferred

- Magic link đăng nhập không mật khẩu
- Apple / Microsoft OAuth
- Đổi email đã verify (re-verify)

</deferred>

---

*Phase: 01-auth*  
*Context: 2026-04-08 — bổ sung email verify + Google OAuth*
