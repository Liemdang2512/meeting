# Phase 06: Free Registration + Daily Limit + Payment UI - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Thêm luồng đăng ký tự do cho free users, giới hạn 1 file convert/ngày với free tier, và trang pricing/payment UI (demo - không kết nối payment gateway). Admin tạo user vẫn hoạt động như cũ.

</domain>

<decisions>
## Implementation Decisions

### Registration flow
- Tự động login sau đăng ký, redirect vào app ngay — không cần verify email
- Form: Email + Password + Confirm password (3 fields)
- Validation mật khẩu: tối thiểu 8 ký tự (không yêu cầu số/ký tự đặc biệt)
- Login page có link "Chưa có tài khoản? Đăng ký" → /register
- Register page có link "Đã có tài khoản? Đăng nhập" → /login

### Quota UI/UX
- Quota counter hiển thị ở header/navbar: "Hôm nay: 0/1 lượt"
- Admin và paid user ('user' role) hiển thị "Unlimited"
- Khi free user hết quota (đã dùng 1 lượt): hiện modal upgrade với nội dung thông báo + link đến /pricing
- Quota reset lúc 00:00 GMT+7 (17:00 UTC ngày hôm trước)

### Pricing page
- 3 gói: Free / Pro ($9/tháng) / Enterprise (liên hệ)
- Feature list của mỗi gói: Claude's Discretion (dựa trên tính năng hiện có của app)
- Truy cập từ nhiều điểm: tab "Nâng cấp" trên navbar + link từ modal hết quota + route /pricing
- "Upgrade" button Pro → mở payment modal (demo UI)
- Enterprise → nút "Liên hệ" (mailto hoặc text chỉ dẫn liên hệ)

### Payment form (demo)
- Claude's Discretion cho layout và fields
- Cần có: card number, expiry, CVV (field names Stripe-compatible cho tương lai)
- Mock flow: form → processing (2s animation) → success state
- Sau "thanh toán thành công": hiển thị thông báo demo ("Tính năng đang phát triển")

### Role system
- Role 'free': user tự đăng ký → bị giới hạn 1 file/ngày
- Role 'user': admin tạo → unlimited, không bị giới hạn (backward compatible)
- Role 'admin': unlimited
- Admin có thể đổi role user trong admin panel (free → user để cấp unlimited)
- Quota check logic: chỉ áp dụng khi role === 'free'

### Anti-spam
- Rate limit endpoint POST /api/auth/register: 5 requests/IP/giờ
- Dùng express-rate-limit (đã có trong plan)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/routes/auth.ts`: Login endpoint — thêm /register tương tự pattern này
- `server/auth.ts`: `signToken()`, `requireAuth()` — tái dùng cho register flow
- `server/routes/admin.ts`: `requireAdmin` middleware, user management patterns
- Login page component (LoginPage.tsx) — tham khảo form style cho RegisterPage
- Tailwind indigo color scheme đã thiết lập

### Established Patterns
- State management: React `useState` + `useEffect` (không Redux/Zustand)
- Styling: Tailwind CSS, indigo accent
- JWT stateless 7 ngày, lưu localStorage
- Express route pattern: `Router()`, async/await, `sql` template literal (postgres.js)

### Integration Points
- `server/routes/auth.ts`: Thêm POST /api/auth/register
- `server/routes/admin.ts`: Thêm PUT /api/admin/users/:id/role (free → user upgrade)
- `App.tsx`: Thêm /register route, /pricing route, quota badge trong navbar
- DB: Thêm bảng `daily_conversion_usage` (user_id, usage_date, count)
- Quota check: middleware hoặc inline trong transcription/convert route
- Bug fix cần thiết: `server/routes/auth.ts` dòng 35 — đổi `profile?.role ?? 'user'` thành `profile?.role ?? 'free'` để user tự đăng ký (không có profile row) không được unlimited

</code_context>

<specifics>
## Specific Ideas

- Quota badge trên navbar nhỏ gọn, không intrusive — chỉ free user mới thấy count, paid/admin thấy "Unlimited"
- Modal hết quota cần rõ CTA: nút "Xem các gói" dẫn đến /pricing
- Demo payment flow phải có animation "Đang xử lý..." để cảm giác realistic dù không kết nối gateway

</specifics>

<deferred>
## Deferred Ideas

- Email verification flow — có thể thêm ở phase sau khi có email service
- Google OAuth / đăng nhập mạng xã hội — đã defer từ Phase 01
- Thực tế tích hợp Stripe/PayPal — phase riêng sau
- Scheduled email reminder khi gần hết quota — phase sau

</deferred>

---

*Phase: 06-free-registration-daily-limit-payment-ui*
*Context gathered: 2026-03-16*
