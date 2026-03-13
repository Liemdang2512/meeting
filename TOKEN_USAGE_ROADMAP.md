## Token Usage Logging & Admin View – Roadmap

### OVERVIEW

- **Mục tiêu chung**: Theo dõi và quản lý việc sử dụng token Gemini cho từng user và toàn hệ thống, giúp:
  - Hiểu chi phí theo user / feature / thời gian.
  - Cho phép admin giám sát, phát hiện lạm dụng.
  - Tạo nền tảng cho quota, cảnh báo và analytics nâng cao.
- **Ràng buộc kiến trúc**:
  - SPA React 19 + TypeScript + Vite, **không backend riêng**.
  - Dùng **Supabase** cho auth + DB + RLS.
  - Dùng **Gemini API** cho AI, logic tập trung trong `services/geminiService.ts`.
  - Mỗi feature tách riêng trong `features/`.

---

## PHASE 1 – TOKEN USAGE LOGGING & ADMIN VIEW (HIỆN TẠI)

### 1. Mục tiêu business / product

- **Minh bạch chi phí**: Admin xem được chi tiết token usage theo user, feature, model, thời gian.
- **Kiểm soát rủi ro**: Phát hiện user/feature tiêu thụ bất thường để can thiệp thủ công.
- **Nền tảng cho quota/billing**: Dữ liệu đủ chi tiết để sau này implement quota / pricing.

**Success criteria:**

1. Mỗi lần gọi Gemini (có logging) sinh **1 row** trong `token_usage_logs`.
2. RLS đảm bảo user thường chỉ truy cập log của chính họ, admin xem được tất cả.
3. Admin có 1 trang UI xem bảng log + overview cơ bản (tổng token, breakdown theo user/feature).
4. Lỗi logging **không** làm hỏng flow gọi Gemini.

### 2. Phạm vi kỹ thuật Phase 1

**Trong scope:**

- Thiết kế và tạo bảng Supabase `token_usage_logs`:
  - Cột chính: `id`, `user_id`, `created_at`, `action_type`, `feature`, `input_tokens`, `output_tokens`, `total_tokens`, `model`, `metadata`.
  - Index: `(user_id, created_at desc)` và các index phụ cần thiết (VD: theo `feature`).
- Thiết lập **RLS**:
  - User thường: chỉ `insert`/`select` row có `user_id = auth.uid()`.
  - Admin: `select` mọi row thông qua function `public.is_admin()` đọc `profiles.role`.
- Tạo `tokenUsageService` trong `services/`:
  - Hàm `logTokenUsage(...)` insert vào `token_usage_logs`, **fire-and-forget**, swallow lỗi (log `console.warn`).
- Tích hợp logging vào `services/geminiService.ts`:
  - Mỗi hàm gọi Gemini nhận thêm `loggingContext` (feature, actionType, metadata).
  - Đọc `usageMetadata` (input/output/total tokens, model) từ response Gemini.
  - Lấy `userId` từ Supabase auth.
  - Gọi `logTokenUsage(...)` sau khi call Gemini thành công.
- Tạo feature admin UI (vd. `features/token-usage-admin/`):
  - Hook fetch log từ Supabase (filter thời gian, feature, user, pagination).
  - Admin page `/admin/token-usage`:
    - Bảng log chi tiết.
    - Overview cơ bản: tổng token, breakdown theo user/feature.

**Ngoài scope Phase 1:**

- Quota cứng / soft limit.
- Alert tự động (email/Slack, cron…).
- Dashboard analytics phức tạp (chart nhiều chiều).
- Trang “My token usage” cho user thường.

### 3. Các bước triển khai (high-level)

1. **Chuẩn hóa types/enums cho logging**
   - Thêm vào `types.ts`:
     - `TokenUsageFeature`, `TokenUsageActionType`, `TokenUsageMetadata`, `TokenUsageLog`, `TokenLoggingContext`.
   - Mục tiêu: dùng chung giữa `geminiService`, `tokenUsageService`, UI admin, không dùng `any`.

2. **Supabase schema & RLS**
   - Đảm bảo bảng `profiles` có cột `role` (`'user' | 'admin'`).
   - Tạo function `public.is_admin()`:
     - Dùng `auth.uid()` để đọc `profiles` và trả về `true` nếu `role = 'admin'`.
   - Tạo bảng `public.token_usage_logs`:
     - Cột: `id uuid PK`, `user_id uuid`, `created_at timestamptz default now()`, `action_type text`, `feature text`, `input_tokens int`, `output_tokens int`, `total_tokens int`, `model text`, `metadata jsonb`.
     - Index theo `user_id`, `created_at`, (optional) `feature`.
   - Bật RLS:
     - Policy user: `insert/select` chỉ khi `user_id = auth.uid()`.
     - Policy admin: `select` mọi row khi `public.is_admin()` true.

3. **Tạo `services/tokenUsageService.ts`**
   - Hàm `logTokenUsage(params)` với các field:
     - `userId`, `feature`, `actionType`, `model`, `inputTokens`, `outputTokens`, `totalTokens`, `metadata?`.
   - Gọi `supabase.from('token_usage_logs').insert(...)`.
   - Không throw lỗi ra ngoài; chỉ `console.warn` nếu insert fail.

4. **Tích hợp logging trong `services/geminiService.ts`**
   - Mỗi hàm public gọi Gemini:
     - Thêm param optional `loggingContext?: TokenLoggingContext`.
   - Sau khi nhận response Gemini:
     - Đọc `usageMetadata` (`inputTokens`, `outputTokens`, `totalTokens`, `model`).
     - Lấy `userId` từ Supabase auth.
     - Nếu có đầy đủ `userId`, `usageMetadata`, `loggingContext`:
       - Gọi `void logTokenUsage({ ... })` (fire-and-forget).
   - Có thể trích helper nội bộ `runGeminiWithLogging(...)` để tránh lặp code.

5. **Hook đọc log cho Admin UI**
   - Trong `features/token-usage-admin/hooks/useTokenUsageLogs.ts`:
     - Input: `fromDate`, `toDate`, `feature?`, `userId?`, `page`, `pageSize`.
     - Dùng Supabase client query `token_usage_logs` theo filter, order by `created_at desc`.
     - Trả về:
       - `logs`, `isLoading`, `error`, `refetch`.
       - `summary` (tính trên client): tổng token, breakdown theo user/feature.

6. **Admin UI + routing**
   - `features/token-usage-admin/`:
     - `TokenUsageAdminPage.tsx`:
       - Check `isAdmin` (từ profile / auth).
       - Dùng `useTokenUsageLogs` để render:
         - `TokenUsageOverview` (cards: tổng token, theo feature, theo user).
         - `TokenUsageTable` (bảng log chi tiết, pagination).
   - Thêm route `/admin/token-usage` trong `App.tsx`:
     - Chỉ cho phép admin truy cập (UI guard).

7. **Test & validation**
   - Với **user thường**:
     - Gọi vài action dùng Gemini → kiểm tra `token_usage_logs` chỉ có row của chính user đó.
     - Không truy cập được `/admin/token-usage`.
   - Với **admin**:
     - Thấy toàn bộ log (nhiều user).
     - Filter + overview hoạt động đúng.
   - Đảm bảo:
     - Logging không làm chậm UX.
     - Không lỗi RLS trong network.

8. **Tài liệu hoá**
   - Tạo file docs ngắn (hoặc dùng chính file này):
     - Cách truyền `loggingContext` khi gọi `geminiService`.
     - Cách thêm action/feature mới vào enums.
     - Tóm tắt bảng `token_usage_logs`, `public.is_admin()`, RLS.

---

## PHASE 2 – USER QUOTA & SOFT LIMITS (TƯƠNG LAI)

### Mục tiêu

- Đặt quota token theo user/plan/feature để:
  - Tránh user free lạm dụng.
  - Chuẩn bị cho pricing/subscription.

### Phạm vi kỹ thuật (ngắn)

- Thêm cấu trúc quota (bảng `token_quotas` hoặc field trên `profiles`).
- Logic phía frontend + Supabase:
  - Tính tổng token đã dùng trong khoảng thời gian (từ `token_usage_logs`).
  - So với quota:
    - Hiển thị cảnh báo (UI banner/toast) khi gần quota.
    - Chặn request mới khi vượt hard limit (frontend không gọi Gemini nữa).
- Admin UI để cấu hình quota cho user / nhóm user.

---

## PHASE 3 – ALERTS & MONITORING (TƯƠNG LAI)

### Mục tiêu

- Cảnh báo sớm khi:
  - Token usage tăng đột biến (hệ thống hoặc theo user).
  - User vượt threshold cảnh báo.

### Phạm vi kỹ thuật (ngắn)

- Cơ chế check định kỳ (VD: Supabase scheduled job hoặc external cron nhỏ).
- Gửi cảnh báo:
  - Ban đầu: in-app alert trong admin dashboard.
  - Sau này: email/Slack nếu phù hợp.
- Admin UI xem danh sách alert gần đây, đánh dấu “đã xử lý”.

---

## PHASE 4 – ADVANCED ANALYTICS & DASHBOARDS (TƯƠNG LAI)

### Mục tiêu

- Cung cấp insight sâu:
  - Chi phí per feature / per user / theo thời gian.
  - Hỗ trợ quyết định tối ưu model, UX.

### Phạm vi kỹ thuật (ngắn)

- Dashboard analytics cho admin:
  - Chart trend token theo ngày/tuần/tháng.
  - Breakdown theo feature, model, phân khúc user.
- Có thể dùng:
  - SQL view / materialized view trong Supabase cho aggregate nặng.
  - Thư viện chart trên frontend (ưu tiên tái dùng nếu repo đã có).

---

## PHASE 5 – USER-FACING “MY TOKEN USAGE” (TƯƠNG LAI)

### Mục tiêu

- Tăng minh bạch cho user:
  - Mỗi user xem được lịch sử token usage của chính họ.
  - Hỗ trợ họ tự quản lý hành vi, tránh bất ngờ khi bị giới hạn.

### Phạm vi kỹ thuật (ngắn)

- Feature mới (vd. `features/my-token-usage/`):
  - Trang “My token usage”:
    - Bảng log của user hiện tại.
    - Biểu đồ đơn giản usage theo thời gian.
- Tích hợp với quota (Phase 2):
  - Hiển thị progress: đã dùng bao nhiêu / còn bao nhiêu.

---

## RỦI RO CHUNG & LƯU Ý

- **Độ chính xác token**:
  - Phụ thuộc `usageMetadata` của Gemini; cần đóng gói mapping trong 1 chỗ (helper) để dễ test & update.
- **Hiệu năng & volume log**:
  - Volume lớn có thể ảnh hưởng query admin.
  - Cần index tốt, giới hạn time range trong UI, cân nhắc view/materialized view nếu cần.
- **Bảo mật & RLS**:
  - Sai RLS có thể lộ data giữa user.
  - Cần test kỹ với nhiều role (user/admin).
- **DX & mở rộng**:
  - Giữ API `loggingContext` & `tokenUsageService` đơn giản, dễ dùng.
  - Mọi feature mới dùng Gemini nên tái sử dụng pattern này để có log đồng nhất.

