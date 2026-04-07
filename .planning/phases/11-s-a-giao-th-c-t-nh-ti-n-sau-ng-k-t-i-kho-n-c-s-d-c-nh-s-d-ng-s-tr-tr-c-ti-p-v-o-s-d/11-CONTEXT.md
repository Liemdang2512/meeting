# Phase 11: s-a-giao-th-c-t-nh-ti-n-sau-ng-k-t-i-kho-n-c-s-d-c-nh-s-d-ng-s-tr-tr-c-ti-p-v-o-s-d - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Chuyển mô hình thanh toán từ "đăng ký gói xong dùng không giới hạn" sang mô hình số dư trả trước: user mua gói nạp tiền (credit pack), hệ thống trừ dần theo usage, có xử lý nợ âm có giới hạn và chính sách migrate user cũ.

</domain>

<decisions>
## Implementation Decisions

### Credit Model va Goi nap
- **D-01:** Dùng `internal_credits` thay vì ví VND trực tiếp.
- **D-02:** Giữ các mức gói hiện có trong app làm gói nạp credit: `299.000`, `399.000`, `499.000`.
- **D-03:** Mỗi gói vừa nạp credit, vừa mở workflow tương ứng như hiện tại (`reporter`/`specialist`/`officer`), không tách riêng thành hai giao dịch khác nhau.

### Quy tac tru tien
- **D-04:** Trừ tiền tại thời điểm bắt đầu event "tạo biên bản/tóm tắt AI", không trừ từ bước transcription.
- **D-05:** Nếu flow xử lý thất bại sau khi đã trừ ở bước bắt đầu, hoàn full tự động.

### Chinh sach so du khong du
- **D-06:** Cho phép nợ âm có ngưỡng.
- **D-07:** Ngưỡng âm mặc định: `-10.000 credits` (không được âm quá mức này).

### Migration user cu
- **D-08:** User cũ từng mua theo mô hình trước được giữ quyền cho tới khi hết hiệu lực theo migration batch.
- **D-09:** Dùng cơ chế admin migration batch để gán thời điểm hết hiệu lực cho từng user (không dùng mốc toàn cục cứng).

### Claude's Discretion
- Chi tiết schema DB cho ledger/transactions và cách đặt tên bảng/cột.
- Công thức pricing cụ thể theo từng action AI (rate card chi tiết).
- Cơ chế idempotency/locking khi trừ tiền song song.
- Thiết kế UI hiển thị số dư, nợ âm, lịch sử trừ/hoàn.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap va ngu canh phase
- `.planning/ROADMAP.md` — Ngu canh Phase 11 va phu thuoc Phase 10.
- `.planning/STATE.md` — Cac quyet dinh lich su lien quan payment/quota va luong dang thuc thi.

### Quyet dinh nen tu phase truoc
- `.planning/phases/06-free-registration-daily-limit-payment-ui/06-CONTEXT.md` — Quyet dinh goc ve free/paid role, quota va pricing UI.
- `.planning/phases/10-payment-gateway/10-06-PLAN.md` — Huong payment UX gan nhat (VNPay channel preselect) de tham chieu khi doi qua credit model.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `features/pricing/PricingPage.tsx`: Danh sach goi va CTA dang ky, co san 3 moc gia.
- `features/pricing/UpgradeModal.tsx`: Payment modal da co luong create order/polling/status cho VNPay, MoMo, VietQR.
- `components/PaymentResultPage.tsx`: Luong callback sau thanh toan + token refresh thong qua `/api/payments/check-upgrade`.
- `server/routes/payments/vietqr.ts`: Mau order lifecycle, webhook confirmation, idempotent update profile.
- `server/routes/payments/vnpay.ts`: Mau create/return/ipn va cap nhat profile transaction-safe.

### Established Patterns
- Enforcement kinh doanh dat o server routes (khong tin frontend), tuong tu quota va webhook.
- Sau thay doi profile/payment thi invalidate profile cache qua `invalidateProfileCache`.
- `payment_orders` + `payment_webhook_events` la nguon su kien thanh toan hien co.

### Integration Points
- `server/routes/payments/*`: Them logic cap credit va migration metadata thay vi chi role/feature elevate.
- `server/routes/transcriptions.ts` (hoac endpoint tao bien ban AI): Diem tru credit o "start generate" + compensation khi fail.
- `server/routes/payments/index.ts`: Co the mo rong `check-upgrade` thanh `check-balance/refresh-wallet-state` sau thanh toan.
- `features/pricing/*` + `features/workflows/shared/*`: Hien thi so du, canh bao so du thap, xu ly 402/insufficient balance.

</code_context>

<specifics>
## Specific Ideas

- Nguoi dung muon giu nhung moc gia quen thuoc (299/399/499) de khong gay dut mach UX/hanh vi mua.
- Mo hinh moi van ton tai "mo workflow theo goi", nhung gia tri su dung se theo so du bi tru dan.
- Chap nhan no am nho (`-10.000`) de giam gãy flow, nhung khong de no vo han.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-s-a-giao-th-c-t-nh-ti-n-sau-ng-k-t-i-kho-n-c-s-d-c-nh-s-d-ng-s-tr-tr-c-ti-p-v-o-s-d*
*Context gathered: 2026-04-07*
