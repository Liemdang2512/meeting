# 08-BUSINESS-PLAN: Business Discuss trước Technical

---
phase: 08-role-based-workflows
plan: BUSINESS
type: discuss
status: active
owner: product
gate: required-before-technical
requirements: [BIZ-01, BIZ-02, BIZ-03, BIZ-04, BIZ-05, BIZ-06]
---

## Objective

Chốt bài toán kinh doanh cho mô hình 3 luồng sản phẩm trước khi triển khai kỹ thuật:

- `reporter` (Phóng viên/Báo chí)
- `specialist` (Chuyên viên/Doanh nghiệp)
- `officer` (Cán bộ/Pháp lý)

Kết quả đầu ra của plan này là quyết định business rõ ràng để chuyển hóa thành technical backlog.

## Current Business Decision (MVP tạm thời)

- Ưu tiên hiện tại: **tách luồng theo 3 nhóm trước**.
- Workflow nghiệp vụ chi tiết theo từng nhóm sẽ **chưa tách ngay**.
- Trong giai đoạn này, cả 3 nhóm sẽ dùng **cùng một workflow hiện tại** (shared workflow).
- Việc tùy biến workflow riêng cho từng nhóm sẽ làm ở phase sau.

## Business Requirements

- **BIZ-01**: Định nghĩa ICP + JTBD cho từng nhóm người dùng.
- **BIZ-02**: Định nghĩa giá trị cốt lõi và outcome mong muốn cho từng workflow.
- **BIZ-03**: Thiết kế workflow nghiệp vụ (không phải workflow kỹ thuật) cho từng nhóm.
- **BIZ-04**: Chốt mô hình pricing/packaging/quota theo nhóm (nếu khác nhau).
- **BIZ-05**: Chốt KPI theo funnel cho từng nhóm và target 30/60/90 ngày.
- **BIZ-06**: Chốt rollout strategy + risk register + owner quyết định.

## Scope (Business)

- Nằm trong scope:
  - Phân khúc người dùng, use case chính, hành vi kỳ vọng.
  - Chân dung hành trình nghiệp vụ và điểm tạo giá trị.
  - Chỉ số thành công và nguyên tắc ưu tiên.
- Ngoài scope:
  - Chi tiết DB schema, API contract, route guard implementation.
  - Quyết định coding-level.

## Tasks

### Task B1 - ICP & JTBD Canvas cho 3 nhóm

Đầu ra:
- 3 hồ sơ ICP (Pain, Trigger, Buying signal, Success criteria).
- 3 bộ JTBD statement chuẩn.

Done khi:
- Mỗi nhóm có 1 primary JTBD + 2 secondary JTBD.
- Có thứ tự ưu tiên nhóm mục tiêu cho đợt rollout đầu.

### Task B2 - Workflow nghiệp vụ theo vai trò

Đầu ra:
- Workflow business cho từng nhóm theo mẫu:
  - Input
  - Steps nghiệp vụ
  - Quyết định chính
  - Output bàn giao
  - Người nhận giá trị

Done khi:
- Mỗi nhóm có 1 workflow end-to-end, không trùng mục tiêu với nhóm khác.
- **MVP exception (đã chốt tạm thời):** cho phép 3 nhóm dùng chung 1 workflow hiện tại để đẩy nhanh rollout tách luồng.

### Task B3 - Packaging/Pricing/Quota logic

Đầu ra:
- Bảng so sánh quyền lợi theo nhóm.
- Đề xuất free vs paid gate (nếu có) và giới hạn sử dụng.

Done khi:
- Có quyết định rõ: điểm nào khác nhau theo nhóm, điểm nào dùng chung.

### Task B4 - KPI & Experiment Plan

Đầu ra:
- KPI tree theo nhóm: Activation, Conversion, Retention.
- 2-3 thí nghiệm ưu tiên cho 30 ngày đầu.

Done khi:
- Mỗi KPI có owner, baseline (nếu có), target và mốc đo.

### Task B5 - Go/No-go Decision Pack

Đầu ra:
- Danh sách quyết định cuối cùng (decision log).
- Danh sách giả định còn mở + deadline chốt.
- Rủi ro kinh doanh + phương án giảm thiểu.

Done khi:
- Đủ điều kiện set `BIZ-APPROVED = TRUE`.

## Verification Checklist

- Có tài liệu business cho đủ 3 nhóm.
- Có mapping từ business workflow -> technical epics (chưa cần implementation details).
- Có KPI khả thi để đo hiệu quả sau rollout.
- Các giả định mở đã có owner và thời hạn.
- Có xác nhận rõ phạm vi MVP: "route tách 3 nhóm, workflow tạm thời dùng chung".

## Gate Output (bắt buộc)

Khi hoàn tất plan business, tạo file xác nhận:

- `.planning/phases/08-role-based-workflows/08-BUSINESS-DECISIONS.md`

Nội dung tối thiểu:
- Decision log (accepted/rejected).
- KPI set.
- Go-to-market priority.
- `BIZ-APPROVED: true|false`.

