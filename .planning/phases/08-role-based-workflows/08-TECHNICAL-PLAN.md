# 08-TECHNICAL-PLAN: Kích hoạt sau khi Business Approved

---
phase: 08-role-based-workflows
plan: TECHNICAL
type: execute
status: draft
depends_on: ["08-BUSINESS-PLAN"]
start_condition: "BIZ-APPROVED = TRUE"
requirements: [ROLE-01, ROLE-02, ROLE-03, ROLE-04, ROLE-05, ROLE-06]
---

## Objective

Chuyển hóa quyết định business đã chốt thành implementation kỹ thuật theo thứ tự an toàn, có test và rollback.

## MVP Scope được khóa cho đợt này

- Làm **route/luồng vào** cho 3 nhóm user: `reporter`, `specialist`, `officer`.
- Sau khi user đăng ký/chọn nhóm, điều hướng đúng luồng nhóm đó.
- **Chưa tách workflow logic riêng** cho từng nhóm ở đợt này.
- Cả 3 luồng tạm thời dùng chung workflow hiện tại (shared workflow module).

## Activation Rule

Chỉ bắt đầu khi file `08-BUSINESS-DECISIONS.md` có:

- `BIZ-APPROVED: true`
- Route ưu tiên theo nhóm đã chốt
- KPI và phạm vi rollout đã chốt

## Execution Plans (tham chiếu)

1. `08-01-PLAN.md` - Data model + migration + auth contract
2. `08-02-PLAN.md` - Register UX + payload/validation
3. `08-03-PLAN.md` - Route guard + 3 entry flows map vào shared workflow
4. `08-04-PLAN.md` - Test/hardening/validation/rollback

## Technical Principles

- Refactor sạch, đúng folder theo feature.
- Không thay đổi logic không thuộc scope role-based workflow.
- Duy trì tương thích user cũ qua fallback.
- Tăng test coverage ở điểm contract auth và route guard.

## Pre-flight Checklist

- Business decisions đã được freeze.
- Mapping business workflow -> route/step config đã xác nhận.
- Đã thống nhất default cho legacy user.
- Đã thống nhất chính sách cho phép/không cho phép user đổi nhóm.
- Đã xác nhận phạm vi MVP: "3 luồng khác route, cùng workflow hiện tại".

