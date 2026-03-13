# Phase 2: Token Usage Logging & Admin View – Context

**Gathered:** 2026-03-13  
**Status:** Ready for planning

<domain>
## Phase Boundary

Thêm hệ thống theo dõi và quản lý **token Gemini** cho từng người dùng trong app Meeting Scribe Pro.

- Track số token tiêu tốn mỗi lần gọi Gemini (phân theo user, feature, action).
- Chuẩn bị dữ liệu nền tảng để **billing/thu phí khách** trong tương lai.
- Lưu log trong Supabase để admin xem được lịch sử và tổng quan usage.
- Người dùng thường **có thể xem usage của chính mình** ở mức cơ bản (My token usage), nhưng **chưa có quota/chặn** trong phase này.
- Quota cứng, cảnh báo tự động, và billing chi tiết sẽ là các phase riêng.

</domain>

<decisions>
## Implementation Decisions

### Phạm vi phase này
- Log token usage cho các luồng chính đang dùng Gemini (minutes, và các feature khác khi cần).
- Tạo **trang Admin Token Usage** để:
  - Xem bảng log chi tiết (theo từng request, có thể drill-down).
  - Có overview cơ bản: tổng token theo **ngày/tháng**, breakdown theo **user** và **feature**.
- Không thay đổi business flow chính của người dùng cuối (tạo biên bản, cắt file, v.v.).
- Chỉ **quan sát & phân tích log**, chưa áp dụng quota/chặn request.

### Lưu trữ & phân quyền
- Sử dụng **Supabase Postgres + RLS**:
  - Bảng mới `token_usage_logs` lưu từng lần gọi Gemini.
  - Bảng `profiles` dùng để đánh dấu `role` (`user` / `admin`).
  - Function `public.is_admin()` để phân biệt admin trong RLS.
- User thường:
  - Chỉ insert/select log của chính họ (nếu cần).
- Admin:
  - Có thể xem toàn bộ token usage của mọi user.

### Nguồn dữ liệu token
- Sử dụng `usageMetadata` từ response Gemini (nếu SDK/model hỗ trợ) để lấy:
  - `inputTokens`, `outputTokens`, `totalTokens`, `model`.
- Nếu một số call/model không trả đủ usage:
  - Vẫn log row nhưng có thể để một phần token `null` hoặc 0 (được document rõ).

### UX & scope UI
- Thêm **một trang Admin riêng** (VD: `/admin/token-usage`) trong app:
  - Chỉ hiển thị nếu user là admin.
  - UI đơn giản, ưu tiên bảng + số tổng hợp, chưa cần chart phức tạp.
- Không hiển thị màn “My token usage” cho user thường trong phase này.

### Claude's / Executor's Discretion
- Cách thiết kế UI chi tiết cho admin page (layout, grouping, style).
- Cách tối ưu query Supabase ở mức vừa phải (filter, pagination).
- Cách đặt tên `feature` / `actionType` sao cho dễ đọc trong UI (miễn tuân theo conventions chung).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `services/geminiService.ts`: Trung tâm gọi Gemini, là nơi tự nhiên để gắn logging token.
- `lib/supabase.ts` hoặc client Supabase hiện tại: dùng để insert/select vào Postgres.
- Patterns UI admin / layout nếu đã có (navigation, guard theo role).

### Established Patterns
- Kiến trúc SPA React + TypeScript + Vite, không backend riêng.
- State management: React hooks (`useState`, `useEffect`), không có global store phức tạp.
- Styling: Tailwind CSS với style nhất quán theo `AGENTS.md`.
- Mỗi feature tách thư mục riêng trong `src/features/`.

### Integration Points
- `services/geminiService.ts`:
  - Cần refactor nhẹ để mỗi call Gemini có thể nhận `loggingContext` và đọc `usageMetadata`.
- Supabase:
  - Bảng `profiles` (đã có) để lưu role user.
  - Thêm bảng `token_usage_logs` + RLS + function `public.is_admin()`.
- Routing / App shell:
  - `App.tsx` hoặc nơi định nghĩa routes sẽ thêm route `/admin/token-usage`.

</code_context>

<specifics>
## Specific Ideas

- Định nghĩa `TokenUsageFeature` và `TokenUsageActionType` để:
  - Phân biệt rõ: minutes, file-split, các feature khác.
  - Hiển thị human-readable trong admin UI (có thể mapping sang label sau).
- Tạo `services/tokenUsageService.ts`:
  - Chỉ phụ trách insert log vào Supabase + swallow lỗi (không ảnh hưởng UX).
- Hook `useTokenUsageLogs` trong feature admin:
  - Query log theo khoảng thời gian + filter, trả về `summary` để tính tổng token, theo user/feature.
- Cho phép admin lọc theo:
  - Thời gian: 7/30 ngày gần nhất.
  - Feature: minutes / file-split / other.
  - (Optional) User: chọn từ dropdown nếu cần.

</specifics>

<deferred>
## Deferred Ideas

- **User-facing “My token usage” page**:
  - Trang riêng để user xem lịch sử token usage của chính họ.
  - Progress bar hiển thị quota đã dùng / còn lại.
- **Quota & billing**:
  - Đặt quota token theo gói tài khoản.
  - Chặn call Gemini khi vượt quota cứng, cảnh báo khi gần quota.
- **Alerts & monitoring**:
  - Alert khi token usage tăng đột biến (theo user hoặc toàn hệ thống).
  - Email/Slack integration cho admin.
- **Advanced analytics dashboards**:
  - Biểu đồ usage theo ngày/tuần/tháng, breakdown theo feature, model, segment user.
  - Tối ưu model/UX dựa trên cost-per-value.

</deferred>

---

*Phase: 02-token-usage*  
*Context gathered: 2026-03-13*

