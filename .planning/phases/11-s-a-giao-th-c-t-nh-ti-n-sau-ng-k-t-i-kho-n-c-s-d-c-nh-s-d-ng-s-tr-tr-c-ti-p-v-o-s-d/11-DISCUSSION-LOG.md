# Phase 11: s-a-giao-th-c-t-nh-ti-n-sau-ng-k-t-i-kho-n-c-s-d-c-nh-s-d-ng-s-tr-tr-c-ti-p-v-o-s-d - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 11-s-a-giao-th-c-t-nh-ti-n-sau-ng-k-t-i-kho-n-c-s-d-c-nh-s-d-ng-s-tr-tr-c-ti-p-v-o-s-d
**Areas discussed:** Wallet model, Deduction rule, Insufficient balance, Migration policy

---

## Wallet model

| Option | Description | Selected |
|--------|-------------|----------|
| Ví VND trực tiếp | Lưu balance VND và trừ theo bảng giá dịch vụ | |
| Credit nội bộ | Mua gói credit rồi trừ credit theo usage | ✓ |
| Hybrid | Ví VND + credit riêng theo workflow | |

**User's choice:** Credit nội bộ.
**Notes:** User muốn giữ mức gói hiện có của app (`299.000`, `399.000`, `499.000`) làm các gói nạp credit.

---

## Deduction rule

| Option | Description | Selected |
|--------|-------------|----------|
| Trừ khi bắt đầu xử lý | Trừ ngay khi start event xử lý | ✓ |
| Trừ khi thành công | Chỉ trừ khi endpoint hoàn tất thành công | |
| Chỉ trừ transcription | Chỉ thu phí bước transcription | |

**User's choice:** Trừ khi bắt đầu xử lý.
**Notes:** Event áp dụng là lúc bắt đầu tạo biên bản/tóm tắt AI, không phải lúc bắt đầu transcription. Nếu fail thì hoàn full tự động.

---

## Insufficient balance

| Option | Description | Selected |
|--------|-------------|----------|
| Chặn cứng | Không đủ tiền là trả lỗi ngay | |
| Cho âm ví | Cho nợ âm trong ngưỡng | ✓ |
| Grace fallback | Cho thêm lượt miễn phí tạm thời | |

**User's choice:** Cho âm ví.
**Notes:** Ngưỡng âm custom được chốt là `-10.000 credits`.

---

## Migration policy

| Option | Description | Selected |
|--------|-------------|----------|
| Giữ đến hết chu kỳ rồi chuyển | Grandfather theo expiry | ✓ |
| Chuyển ngay sang ví | Quy đổi ngay sang số dư | |
| Giữ unlimited vĩnh viễn | Không migrate | |

**User's choice:** Giữ quyền cũ đến hết hiệu lực, rồi chuyển.
**Notes:** Dùng admin migration batch để gán expiry theo từng user (không dùng một deadline chung).

---

## Claude's Discretion

- Thiết kế chi tiết ledger schema, idempotency strategy, và UX chi tiết cho màn hình số dư/nợ.
- Đề xuất rate card cụ thể theo từng action AI trong bước planning.

## Deferred Ideas

None.
