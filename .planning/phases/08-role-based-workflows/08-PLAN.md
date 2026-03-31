# Phase 08 Plan Overview: Role-Based Workflows

## Mục tiêu phase

Tách sản phẩm thành 3 luồng theo nhóm người dùng (Phóng viên, Chuyên viên, Cán bộ) theo hướng **business-first**:

1. Chốt chiến lược kinh doanh và workflow mục tiêu cho từng nhóm.
2. Sau khi business sign-off, mới triển khai technical plans.

## Cấu trúc lập kế hoạch mới (2 tầng)

- `08-BUSINESS-PLAN.md`: plan thảo luận/chốt business (ICP, JTBD, value proposition, workflow nghiệp vụ, KPI, packaging/pricing, rollout).
- `08-TECHNICAL-PLAN.md`: plan triển khai kỹ thuật sau khi business được duyệt.

## Quy tắc gate bắt buộc

- **Gate BIZ-APPROVED = TRUE** trước khi bắt đầu bất kỳ plan kỹ thuật nào.
- Khi chưa qua gate business, các file `08-01-PLAN.md` -> `08-04-PLAN.md` chỉ ở trạng thái tham khảo.

## Trạng thái plans hiện tại

- Business:
  - `08-BUSINESS-PLAN.md` — **active**
- Technical:
  - `08-TECHNICAL-PLAN.md` — **draft**
  - `08-01-PLAN.md` — draft, phụ thuộc business sign-off
  - `08-02-PLAN.md` — draft, phụ thuộc business sign-off
  - `08-03-PLAN.md` — draft, phụ thuộc business sign-off
  - `08-04-PLAN.md` — draft, phụ thuộc business sign-off

## Dependency graph (business-first)

- `08-BUSINESS-PLAN` -> `08-TECHNICAL-PLAN` -> `08-01` -> `08-02` -> `08-03` -> `08-04`

## Tiêu chí chuyển từ business sang technical

Chỉ chuyển khi đã chốt đủ các điểm:

1. Segmentation rõ cho 3 nhóm và ưu tiên go-to-market.
2. Workflow nghiệp vụ đầu-cuối cho từng nhóm (input/process/output/actor).
3. KPI theo funnel (activation, retention, conversion) theo từng nhóm.
4. Chính sách pricing/packaging và quota khác biệt theo nhóm (nếu có).
5. Danh sách giả định + rủi ro kinh doanh + quyết định owner.

## Rollback phase-level

1. Nếu business chưa rõ hoặc xung đột, dừng technical execution và quay lại `08-BUSINESS-PLAN.md`.
2. Khi đã vào technical mà phát sinh lệch business, revert theo từng plan con và cập nhật lại business decisions.
