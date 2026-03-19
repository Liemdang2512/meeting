# Phase 7: Email Sending After Minutes - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Sau khi biên bản cuộc họp được tạo, user có thể gửi email đến danh sách người nhận đã nhập sẵn ở bước "Thông tin cuộc họp". Email chứa HTML đẹp + PDF đính kèm. Tính năng gửi email từ địa chỉ của user (premium) là phase sau.

</domain>

<decisions>
## Implementation Decisions

### Nhập email (UX)
- Chips/tags input: gõ email rồi Enter hoặc dấu phẩy → xuất hiện dưới dạng tag có nút xóa
- Validate định dạng email hợp lệ trước khi tạo tag, hiện lỗi rõ ràng nếu sai
- Không lưu recipients vào localStorage draft (khác với các field khác trong form — email recipients thay đổi theo từng cuộc họp)
- Giới hạn tối đa 20 email recipients; admin có thể tùy chỉnh giới hạn này

### Thời điểm gửi (trigger)
- Button "Gửi email" chỉ xuất hiện ở bước **Hoàn thành** (bước cuối)
- Nếu danh sách email trống: button hiển thị nhưng disabled, có tooltip giải thích cần nhập email ở bước Thông tin cuộc họp
- Sau khi gửi thành công: button đổi thành "Gửi lại" — user có thể resend
- Trạng thái gửi (loading, success, error) hiển thị inline dưới button

### Nội dung email
- Định dạng: HTML body đẹp + PDF đính kèm
- Subject: tự động tạo từ thông tin cuộc họp (VD: "Biên bản cuộc họp - [Tên công ty] - [Thời gian]") nhưng user có thể chỉnh sửa trước khi gửi — thêm field "Tiêu đề email" inline tại bước Hoàn thành
- HTML body bao gồm: tiêu đề, tên công ty, ngày giờ, địa điểm, danh sách tham dự, nội dung biên bản đầy đủ
- PDF đính kèm: reuse logic `downloadAsPdf` hiện có, gửi file dưới dạng base64 attachment

### Email service
- Sử dụng **Resend** (resend.com)
- API key lưu trong DB, admin cấu hình qua trang admin UI (không hardcode vào .env)
- From email: cấu hình sẵn trong server (RESEND_FROM_EMAIL trong .env hoặc settings DB)
- Gửi qua server-side API endpoint (POST /api/email/send-minutes) — không expose API key ra client

### Claude's Discretion
- Thiết kế HTML email template (màu sắc, layout)
- Schema DB lưu Resend API key trong admin settings
- Error handling chi tiết (bounce, invalid domain, rate limit)
- Loading state animation cho button Gửi email

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Existing code to read
- `features/minutes/components/MeetingInfoForm.tsx` — Form hiện tại cần thêm email chips input
- `features/minutes/types.ts` — MeetingInfo type cần thêm `recipientEmails: string[]`
- `features/minutes/storage.ts` — Draft storage pattern (email không lưu draft)
- `lib/minutesDocxExport.ts` — PDF generation logic để reuse cho attachment
- `server/index.ts` — Express server setup, cần thêm email router
- `server/routes/admin.ts` — Pattern admin route để thêm email settings endpoint
- `lib/api.ts` — authFetch pattern cho frontend API calls

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/minutesDocxExport.ts` (`downloadAsPdf`): PDF generation — reuse để tạo PDF attachment cho email
- `server/routes/admin.ts`: Pattern lưu admin settings trong DB
- `lib/api.ts` (`authFetch`): Frontend authenticated API calls

### Established Patterns
- Express routes trong `server/routes/` — thêm `server/routes/email.ts` theo pattern này
- Tailwind CSS + React state cho UI components
- `MeetingInfo` type trong `features/minutes/types.ts` — thêm `recipientEmails: string[]`
- Form fields trong `MeetingInfoForm.tsx` — thêm chips input section sau danh sách tham dự

### Integration Points
- `MeetingInfoForm.tsx`: thêm email chips input, pass recipients qua `MeetingInfo`
- Bước Hoàn thành trong `App.tsx`: thêm email subject field và button Gửi email
- `server/index.ts`: đăng ký `/api/email` router
- Admin page: thêm section cấu hình Resend API key và From email

</code_context>

<specifics>
## Specific Ideas

- Subject email: tự động điền nhưng user chỉnh được — "Biên bản cuộc họp - [Tên công ty] - [Thời gian]"
- Giới hạn 20 email recipients, admin có thể tùy chỉnh con số này
- Premium tier (deferred): cho phép user dùng email của họ làm From address

</specifics>

<deferred>
## Deferred Ideas

- **Premium from-email**: Gửi email nhân danh địa chỉ email của user (cần Resend domain verification flow) — phase sau
- **Email template tùy chỉnh**: Cho user chọn màu sắc/logo trong email — phase sau
- **Lịch sử gửi email**: Log lịch sử email đã gửi cho từng biên bản — phase sau

</deferred>

---

*Phase: 07-email-sending-after-minutes*
*Context gathered: 2026-03-19*
