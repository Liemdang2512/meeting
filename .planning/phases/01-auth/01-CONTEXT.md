# Phase 1: Đăng nhập - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Thêm hệ thống xác thực người dùng vào app Meeting Scribe Pro. Người dùng phải đăng nhập mới có thể sử dụng app. Chỉ admin mới tạo được tài khoản. Quản lý user, phân quyền nâng cao, và lịch sử transcription theo user là các phase riêng.

</domain>

<decisions>
## Implementation Decisions

### Phương thức đăng nhập
- Email + mật khẩu (không có Google OAuth, magic link)
- Sử dụng Supabase Auth (đã có sẵn trong project)

### Đăng ký tài khoản
- Invite-only: chỉ admin mới tạo được tài khoản
- Không có form đăng ký tự do cho người dùng mới

### Session
- Duy trì 30 ngày (persistent login)
- Người dùng không cần đăng nhập lại mỗi lần mở app

### Bảo vệ app
- Chặn toàn bộ app khi chưa đăng nhập
- Chỉ hiển thị trang login, không dùng được tính năng nào

### Claude's Discretion
- Thiết kế UI trang login (layout, màu sắc, form style)
- Xử lý error messages (wrong password, user not found)
- Loading states khi đang xác thực

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/supabase.ts`: Supabase client đã được khởi tạo, có `isSupabaseConfigured()` helper
- Modal pattern trong `App.tsx` (API Key modal): có thể tham khảo style cho login form
- Tailwind CSS utility classes đã được thiết lập đồng nhất

### Established Patterns
- State management: React `useState` + `useEffect` (không có Redux/Zustand)
- Styling: Tailwind CSS với indigo color scheme
- Modal: overlay `fixed inset-0 bg-black bg-opacity-50` + card `bg-white rounded-2xl`

### Integration Points
- `App.tsx`: Cần bọc toàn bộ app trong auth guard
- `lib/supabase.ts`: Thêm auth helpers (signIn, signOut, getSession)
- Supabase Dashboard: Cần bật Email Auth và tạo tài khoản admin đầu tiên

</code_context>

<specifics>
## Specific Ideas

- Toàn bộ app bị chặn khi chưa đăng nhập — không có trạng thái "guest"
- Admin tạo user trực tiếp từ Supabase Dashboard (không cần UI quản lý user trong app)

</specifics>

<deferred>
## Deferred Ideas

- Google OAuth / đăng nhập mạng xã hội — có thể thêm phase sau
- Quản lý user trong app (danh sách user, disable account) — phase riêng
- Lịch sử transcription theo từng user — phase riêng
- Đặt lại mật khẩu qua email — có thể thêm vào phase này hoặc phase sau

</deferred>

---

*Phase: 01-auth*
*Context gathered: 2026-03-05*
