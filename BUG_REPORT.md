# Bug Report

## Status
FIXED

## Bug Title
Trừ tiền 2 lần cho mỗi tác vụ (double-charge)

## Bug Description
Mỗi tác vụ (Voice to Text, tạo biên bản, v.v.) bị trừ tiền 2 lần với cùng số tiền và cùng thời điểm.

## Steps to Reproduce
1. Đăng nhập và upload file âm thanh
2. Chạy tác vụ Voice to Text (hoặc bất kỳ tác vụ nào)
3. Kiểm tra lịch sử giao dịch → thấy 2 dòng trừ tiền giống hệt nhau

## Actual Result
2 dòng `-556` cùng timestamp cho cùng 1 tác vụ

## Expected Result
1 dòng trừ tiền duy nhất

---

## Root Cause Analysis

Trong `runAudioAgent()` (`services/geminiService.ts:629-653`), sau mỗi lần gọi Gemini, code thực hiện **2 lần charge song song**:

```
runAudioAgent() hoàn thành
    │
    ├─► logTokenUsage()          → POST /api/token-logs
    │       └─► server/routes/tokenLogs.ts:61
    │               └─► authorizeAndCharge()   ← CHARGE #1
    │
    └─► authFetch('/wallet/charge', ...)        ← CHARGE #2 (THỪA)
            └─► server/routes/wallet.ts:93
                    └─► authorizeAndCharge()
```

**Cụ thể:**
- `services/geminiService.ts:630` — gọi `logTokenUsage()` → `POST /api/token-logs`
- `server/routes/tokenLogs.ts:61` — route này đã tự gọi `authorizeAndCharge()` (charge #1)
- `services/geminiService.ts:645` — đồng thời gọi thêm `POST /api/wallet/charge` (charge #2)
- `server/routes/wallet.ts:93` — route này cũng gọi `authorizeAndCharge()` (charge #2)

`/api/wallet/charge` là route charge thủ công từ trước, còn `/api/token-logs` đã được tích hợp charge tự động. Hai route cùng tồn tại và cùng được gọi cho cùng 1 tác vụ.

## Proposed Fixes

### Fix Option 1 — Recommended: Xóa lệnh gọi `/wallet/charge` thừa trong `runAudioAgent`

**File:** `services/geminiService.ts:645-653`

Trước:
```
void logTokenUsage({ ... });       // charge qua /token-logs ✓
void authFetch('/wallet/charge')   // charge thêm lần nữa ✗ THỪA
```

Sau:
```
void logTokenUsage({ ... });       // chỉ charge 1 lần ✓
```

- Rủi ro: Thấp. `/token-logs` đã charge đầy đủ.
- Cần kiểm tra toàn bộ `geminiService.ts` xem còn chỗ nào khác gọi cả 2 không.

### Fix Option 2 — Alternative: Tắt billing trong `/api/token-logs`

Không khuyến khích — `/api/token-logs` là luồng chuẩn mới, `/wallet/charge` là luồng cũ.

## Verification Plan
- Chạy 1 tác vụ Voice to Text → wallet history chỉ có 1 dòng trừ tiền
- Số dư giảm đúng 1 lần
- Kiểm tra `geminiService.ts` không còn lệnh gọi `/wallet/charge` nào

## Bug Title
Trang lịch sử sử dụng token (My Token Usage) không hiển thị dữ liệu

## Bug Description
Trang "My Token Usage" và "Admin Token Usage" không hiển thị log lịch sử mặc dù user đã thực hiện phiên âm. Nguyên nhân có thể là dữ liệu không được insert vào DB, hoặc SELECT query bị chặn.

## Steps to Reproduce
1. Đăng nhập vào ứng dụng
2. Thực hiện phiên âm một file audio
3. Navigate đến trang "My Token Usage"
4. Quan sát: không có log nào được hiển thị

## Actual Result
- Bảng lịch sử trống hoặc hiển thị lỗi

## Expected Result
- Mỗi lần phiên âm phải tạo ra ít nhất 1 dòng log với thông tin feature, action, model

## Context
- **Error Message**: Chưa rõ (cần user cung cấp)
- **Environment**: Browser, Supabase backend

---

## Root Cause Analysis

### Bug 1 (ROOT CAUSE — ĐÃ FIX): Condition `&& usage` chặn toàn bộ INSERT

**File:** `services/geminiService.ts` (4 chỗ, lines 237, 280, 484, 542)

```
Gemini API call
  └─> usageMetadata (thường undefined cho audio files)
        └─> if (userId && loggingContext && usage)  ← usage=undefined → KHÔNG INSERT
```

**Trước fix:**
```ts
if (userId && loggingContext && usage) {   // ← usage có thể undefined
  void logTokenUsage(...)
}
```

**Sau fix (đã áp dụng):**
```ts
if (userId && loggingContext) {            // ← bỏ điều kiện usage
  void logTokenUsage(...)
}
```

→ Kết quả: toàn bộ log từ trước đây KHÔNG được ghi vào DB → table rỗng.

---

### Bug 2 (QUAN TRỌNG): Table `token_usage_logs` có thể chưa được tạo

File `setup_token_usage_logs.sql` tồn tại trong project nhưng là script thủ công, cần chạy tay trên Supabase Dashboard.

Nếu chưa chạy:
- `logTokenUsage` → INSERT fail, chỉ `console.warn` → user không thấy lỗi
- `useTokenUsageLogs` → SELECT fail, set `error` state → UI hiện lỗi Supabase

---

### Bug 3 (UX BUG): Summary tổng token chỉ tính trên trang hiện tại

**File:** `features/token-usage-admin/hooks/useTokenUsageLogs.ts:38-64`

```
Fetch page 1 (20 rows)
  └─> buildSummary(logs)  ← chỉ tính 20 rows này
        └─> "Tổng tokens: X"  ← SAI nếu có nhiều hơn 20 rows
```

`buildSummary` nhận `logs` là array của trang hiện tại (max 20 rows), không phải tất cả dữ liệu.

---

## Proposed Fixes

### Fix 1 — ĐÃ ÁP DỤNG: Bỏ `&& usage` khỏi condition log
✅ Đã sửa trong `services/geminiService.ts` (conversation trước)

### Fix 2 (CẦN LÀM THỦ CÔNG): Chạy setup SQL trên Supabase
Vào Supabase Dashboard → SQL Editor → paste và chạy nội dung `setup_token_usage_logs.sql`

### Fix 3 (OPTIONAL): Sửa summary — fetch count riêng thay vì tính từ page data
Thêm một query riêng để lấy tổng aggregate từ DB, không phụ thuộc vào pagination.

---

## Verification Plan
1. Xác nhận table `token_usage_logs` đã tồn tại trong Supabase
2. Thực hiện một lần phiên âm với user đã đăng nhập
3. Vào "My Token Usage" → phải thấy ít nhất 1 row mới
4. Kiểm tra console → không có `console.warn('Failed to log token usage')`
