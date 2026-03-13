## Phase 1 – PLAN tính năng “Token Usage Logging & Admin View”

### Tổng quan

- **Mục tiêu**: 
  - Log số token cho mỗi lần gọi Gemini (theo user, feature, action).
  - Lưu log an toàn bằng Supabase + RLS (user chỉ thấy log của mình, admin thấy toàn bộ).
  - Cung cấp trang **Admin Token Usage** để xem bảng log + overview cơ bản (summary theo ngày/tháng, breakdown theo user/feature, có export).
  - Cung cấp màn **“My token usage” cơ bản cho user thường** để họ xem usage của chính mình (không quota/chặn).
- **Nguyên tắc**:
  - Không thêm backend riêng; chỉ dùng Supabase (Postgres + RLS) và Gemini API từ frontend.
  - Logic gọi Gemini vẫn tập trung trong `services/geminiService.ts`.
  - TypeScript strict, tránh `any`, tách feature admin vào thư mục riêng trong `features/`.

---

## 1. Types & model dữ liệu trong code

### 1.1. Chuẩn hóa types/enums cho logging

- [ ] **Thêm các type chung cho logging** (dự kiến trong `src/types.ts` hoặc file types shared):
  - [ ] Định nghĩa `TokenUsageFeature`:
    - Union string, ví dụ: `'minutes' | 'file-split' | 'token-usage-admin' | 'other'`.
  - [ ] Định nghĩa `TokenUsageActionType`:
    - Union string, ví dụ: `'minutes-generate' | 'transcribe' | 'file-split-analyze' | 'other'`.
  - [ ] Định nghĩa `TokenUsageMetadata`:
    - Dạng an toàn (VD: `Record<string, string | number | boolean | null>`), dùng để lưu `meetingId`, `fileId`, v.v.
  - [ ] Định nghĩa `TokenUsageLog`:
    - Phản ánh row `token_usage_logs` trong Supabase:
      - `id`, `userId`, `createdAt`, `actionType`, `feature`, `inputTokens`, `outputTokens`, `totalTokens`, `model`, `metadata`.
  - [ ] Định nghĩa `TokenLoggingContext`:
    - Dùng ở call site khi gọi Gemini:
      - `feature: TokenUsageFeature`
      - `actionType: TokenUsageActionType`
      - `metadata?: TokenUsageMetadata`
- [ ] Đảm bảo **không dùng `any`** cho các type liên quan logging.

---

## 2. Schema Supabase & RLS

### 2.1. Bảng `profiles` & role admin

- [ ] **Kiểm tra bảng `profiles`**:
  - [ ] Có cột `role` (VD: `text` hoặc enum) với giá trị `'user' | 'admin'`.
  - [ ] Đảm bảo mỗi user đều có row tương ứng trong `profiles` với `user_id` trùng `auth.users.id`.

### 2.2. Function `public.is_admin()`

- [ ] **Tạo function `public.is_admin()` trong Supabase**:
  - [ ] Logic:
    - Dùng `auth.uid()` để lấy `user_id` hiện tại.
    - Join với `public.profiles` và trả về `true` nếu `role = 'admin'`.
  - [ ] Đặt `security definer` + `search_path = public` để function chạy đúng với RLS.
- [ ] Test nhanh trong SQL editor:
  - [ ] Gọi `select public.is_admin();` với user admin → `true`.
  - [ ] Gọi với user thường → `false`.

### 2.3. Tạo bảng `token_usage_logs`

- [ ] **Tạo bảng mới `public.token_usage_logs`** với các cột:
  - [ ] `id uuid primary key default gen_random_uuid()`
  - [ ] `user_id uuid not null` (FK tới `auth.users.id` hoặc `profiles.user_id`)
  - [ ] `created_at timestamptz not null default now()`
  - [ ] `action_type text not null`
  - [ ] `feature text not null`
  - [ ] `input_tokens integer not null`
  - [ ] `output_tokens integer not null`
  - [ ] `total_tokens integer not null`
  - [ ] `model text not null`
  - [ ] `metadata jsonb` (có thể null)
- [ ] **Thêm index để query nhanh**:
  - [ ] Index `(user_id, created_at desc)` cho màn user & admin.
  - [ ] (Optional) Index `(feature, created_at)` nếu cần breakdown theo feature.

### 2.4. Bật RLS & policy

- [ ] **Bật RLS cho `public.token_usage_logs`**.
- [ ] **Policy cho user thường**:
  - [ ] `INSERT`: `with check (user_id = auth.uid())`.
  - [ ] `SELECT`: `using (user_id = auth.uid())`.
- [ ] **Policy cho admin**:
  - [ ] `SELECT`: `using (public.is_admin())` để admin xem tất cả row.
- [ ] Test RLS:
  - [ ] Dùng SQL editor hoặc client để simulate user thường:
    - Chỉ thấy row có `user_id = auth.uid()`.
  - [ ] Dùng admin:
    - Thấy được tất cả các row.

---

## 3. Service `tokenUsageService` (ghi log)

### 3.1. Tạo file service

- [ ] **Tạo file mới**: `src/services/tokenUsageService.ts`

### 3.2. Định nghĩa API `logTokenUsage`

- [ ] **Định nghĩa interface input**:
  - [ ] `userId: string`
  - [ ] `feature: TokenUsageFeature`
  - [ ] `actionType: TokenUsageActionType`
  - [ ] `model: string`
  - [ ] `inputTokens: number`
  - [ ] `outputTokens: number`
  - [ ] `totalTokens: number`
  - [ ] `metadata?: TokenUsageMetadata`
- [ ] **Implement hàm** `async logTokenUsage(params: LogTokenUsageParams): Promise<void>`:
  - [ ] Dùng Supabase client hiện có (`supabase.from('token_usage_logs').insert({...})`).
  - [ ] Map các field từ `params` sang cột tương ứng.
  - [ ] Không set `created_at` nếu muốn dùng default DB.
- [ ] **Xử lý lỗi**:
  - [ ] Nếu Supabase trả lỗi:
    - Ghi `console.warn('Failed to log token usage', error)`.
    - Không throw, không làm fail flow.

---

## 4. Tích hợp logging trong `services/geminiService.ts`

### 4.1. Thêm `loggingContext` vào API public

- [ ] **Đọc qua các hàm public** trong `src/services/geminiService.ts` đang được features sử dụng (VD: minutes, file-split, transcription…).
- [ ] Với mỗi hàm public gọi Gemini:
  - [ ] Thêm param optional `loggingContext?: TokenLoggingContext`.
  - [ ] Cập nhật type signatures tương ứng (import `TokenLoggingContext` từ `types.ts`).

### 4.2. Lấy `usageMetadata` từ response Gemini

- [ ] **Trong phần gọi Gemini**:
  - [ ] Sau khi nhận response:
    - Đọc `usageMetadata` (hoặc trường tương đương) từ SDK Gemini:
      - `inputTokens` (prompt token count).
      - `outputTokens` (candidates/completion token count).
      - `totalTokens` (nếu có, ngược lại = input + output).
    - Lưu giá trị model (VD: `gemini-1.5-flash`, `gemini-1.5-pro`).
- [ ] Nếu API không trả usage:
  - [ ] Có thể đặt các field tokens = 0 hoặc `null` (quyết định rõ và ghi chú).

### 4.3. Gọi `logTokenUsage` (fire-and-forget)

- [ ] **Ở cuối flow thành công** của mỗi call Gemini:
  - [ ] Lấy `userId` từ Supabase auth / context hiện tại (tái sử dụng helper nếu đã có).
  - [ ] Nếu có `userId`, `usageMetadata` và `loggingContext`:
    - [ ] Gọi:
      - `void logTokenUsage({ userId, feature: loggingContext.feature, actionType: loggingContext.actionType, model, inputTokens, outputTokens, totalTokens, metadata: loggingContext.metadata });`
    - [ ] Không `await` để không block UI.
- [ ] **Optional**: Tạo helper nội bộ (VD: `logUsageIfPossible(...)`) để tránh lặp code.

### 4.4. Cập nhật call site ở các feature

- [ ] **Trong các feature gọi `geminiService`** (VD: minutes, file-split nếu có gọi Gemini):
  - [ ] Bổ sung `loggingContext` phù hợp:
    - `feature: 'minutes' | 'file-split' | ...`
    - `actionType` tương ứng:
      - Ví dụ: `'minutes-generate'`, `'transcribe'`, `'file-split-analyze'`.
    - `metadata`: gắn `meetingId`, `fileId`… nếu có.

---

## 5. Feature Admin UI – Token Usage

### 5.1. Cấu trúc thư mục & file

- [ ] **Tạo thư mục feature admin**: `src/features/token-usage-admin/`
- [ ] **Bên trong tạo các file cơ bản**:
  - [ ] `src/features/token-usage-admin/TokenUsageAdminPage.tsx`
  - [ ] `src/features/token-usage-admin/components/TokenUsageOverview.tsx`
  - [ ] `src/features/token-usage-admin/components/TokenUsageTable.tsx`
  - [ ] `src/features/token-usage-admin/hooks/useTokenUsageLogs.ts`
  - [ ] (Optional) `src/features/token-usage-admin/types.ts` nếu muốn tách type riêng cho UI.

### 5.2. Hook `useTokenUsageLogs`

- [ ] **Trong `useTokenUsageLogs.ts`**:
  - [ ] Input filter:
    - `fromDate`, `toDate`
    - Optional: `feature`, `userId`, `page`, `pageSize`
  - [ ] Dùng Supabase client:
    - Query `from('token_usage_logs').select('*')`
    - Filter theo `created_at` (between from/to), `feature`, `userId` nếu có.
    - Order `created_at` desc.
  - [ ] Trả về:
    - `logs: TokenUsageLog[]`
    - `isLoading: boolean`
    - `error?: string`
    - `refetch: () => void`
    - `summary` tính trên client:
      - Tổng `totalTokens` (có thể group theo ngày/tháng cho chart/summary)
      - `byUser: { userId, totalTokens }[]`
      - `byFeature: { feature, totalTokens }[]`
      - (Optional) `byDay` / `byMonth` nếu cần cho Billing view

### 5.3. `TokenUsageAdminPage.tsx`

- [ ] **Guard quyền admin**:
  - [ ] Lấy user hiện tại & role (VD: từ hook `useAuth()` hoặc context Supabase).
  - [ ] Nếu không phải admin:
    - [ ] Redirect về trang khác hoặc hiển thị “Not authorized”.
- [ ] **Layout page**:
  - [ ] Gọi `useTokenUsageLogs` với filter mặc định:
    - `fromDate` = 7 ngày gần nhất (có preset chuyển nhanh sang 30 ngày hoặc tới 1 năm).
  - [ ] Hiển thị:
    - [ ] `TokenUsageOverview` ở trên: tổng token, breakdown theo user/feature.
    - [ ] `TokenUsageTable` ở dưới: bảng chi tiết.
  - [ ] Thêm controls filter cơ bản:
    - Thời gian (from/to hoặc preset: 7/30 ngày, và tuỳ chọn xem tới 1 năm).
    - Filter theo feature (dropdown).

### 5.7. Export dữ liệu cho Billing

- [ ] Thêm nút **Export** trong `TokenUsageAdminPage`:
  - [ ] Export dữ liệu hiện tại trên màn (theo filter) ra CSV (hoặc định dạng dễ import Excel).
  - [ ] Bao gồm: timestamp, user, feature, action_type, model, totalTokens, metadata cơ bản.
- [ ] Đảm bảo export chỉ khả dụng cho admin, tôn trọng cùng filter đang áp dụng.

### 5.4. `TokenUsageOverview.tsx`

- [ ] Nhận prop `summary` từ hook.
- [ ] Hiển thị vài card đơn giản:
  - [ ] Card “Total tokens” (theo filter hiện tại).
  - [ ] List “Top N users by tokens”.
  - [ ] List “Tokens by feature”.

### 5.5. `TokenUsageTable.tsx`

- [ ] Nhận props:
  - `logs`, `isLoading`, `error`, `pagination` (nếu có).
- [ ] Hiển thị:
  - [ ] Loading state khi `isLoading`.
  - [ ] Error state nếu `error`.
  - [ ] Bảng với các cột:
    - `created_at`
    - `user_id` (optionally map sang email/username nếu có data)
    - `feature`
    - `action_type`
    - `model`
    - `input_tokens`, `output_tokens`, `total_tokens`
    - `metadata` (có thể hiển thị tóm tắt hoặc nút “View details”).
- [ ] Pagination đơn giản:
  - [ ] Nút Prev/Next, page size cố định (VD: 20).

### 5.6. Routing trong `App.tsx`

- [ ] **Thêm route mới** cho admin:
  - [ ] Ví dụ path: `/admin/token-usage`.
  - [ ] Component: `TokenUsageAdminPage`.
  - [ ] Chỉ render nếu user là admin (UI guard).
- [ ] (Optional) Thêm link trong navigation dành cho admin.

### 5.7. User UI – “My token usage”

- [ ] Thiết kế route dành cho user thường:
  - [ ] Ví dụ path: `/me/token-usage` (hoặc tương đương).
  - [ ] Chỉ truy cập được khi đã đăng nhập (không cần admin).
- [ ] Tạo component page, ví dụ `src/features/token-usage-user/MyTokenUsagePage.tsx`:
  - [ ] Tái sử dụng hook fetch log (có thể tạo `useMyTokenUsageLogs` wrap `useTokenUsageLogs` với `userId` = current user).
  - [ ] Hiển thị:
    - [ ] Tổng token user đó đã dùng trong khoảng thời gian chọn.
    - [ ] Bảng log đơn giản theo thời gian (không cần metadata sâu).
- [ ] UI đơn giản, ưu tiên:
  - [ ] Filter thời gian (7 ngày, 30 ngày, 1 năm).
  - [ ] Không có hành động quản trị (chỉ xem, không sửa).

---

## 6. Test plan & validation

### 6.1. Test với user thường

- [ ] Đăng nhập bằng user role `'user'`.
- [ ] Thực hiện vài action dùng Gemini (VD: tạo minutes, tính năng dùng Gemini khác nếu có):
  - [ ] Kiểm tra trong Supabase `token_usage_logs`:
    - Có row tương ứng với `user_id` của user.
    - `feature`, `action_type`, `model`, tokens hợp lý.
- [ ] Thử truy cập `/admin/token-usage`:
  - [ ] Bị chặn (redirect hoặc “Not authorized”).
 - [ ] Truy cập trang **“My token usage”**:
   - [ ] Chỉ thấy log của chính mình.
   - [ ] Thử đổi filter thời gian (7 ngày, 30 ngày, 1 năm) hoạt động đúng.

### 6.2. Test với admin

- [ ] Gán `role = 'admin'` cho 1 user trong `profiles`.
- [ ] Đăng nhập bằng user admin.
- [ ] Thực hiện vài action Gemini:
  - [ ] Mở `/admin/token-usage`:
    - Thấy logs của nhiều user (bao gồm admin và user thường).
    - Overview hiển thị tổng token, breakdown đúng.
- [ ] Kiểm tra network:
  - [ ] Request Supabase không bị lỗi RLS.

### 6.3. Sanity check hiệu năng & resiliency

- [ ] Gọi liên tục nhiều lần Gemini:
  - [ ] Đảm bảo UI không bị lag rõ rệt do logging.
- [ ] Simulate lỗi Supabase (VD: tạm đổi URL hoặc key sai trong env local chỉ để test):
  - [ ] Xem console:
    - Thấy `console.warn` từ `tokenUsageService`.
    - Flow chính (gọi Gemini) vẫn chạy, không crash.

---

## 7. Tài liệu hoá cho team / agents khác

- [ ] **Tạo (hoặc cập nhật) docs**:
  - [ ] Có thể dùng chính `TOKEN_USAGE_ROADMAP.md` hoặc tạo file `TOKEN_USAGE_LOGGING.md`.
  - [ ] Ghi rõ:
    - [ ] Cách truyền `loggingContext` khi gọi `geminiService`.
    - [ ] Cách thêm `TokenUsageFeature` / `TokenUsageActionType` mới.
    - [ ] Mô tả bảng `token_usage_logs`, function `public.is_admin()`, và RLS.
- [ ] Đảm bảo agent / dev mới chỉ cần đọc docs là có thể:
  - [ ] Gắn logging cho feature Gemini mới.
  - [ ] Biết nơi xem log (Supabase + Admin UI).

