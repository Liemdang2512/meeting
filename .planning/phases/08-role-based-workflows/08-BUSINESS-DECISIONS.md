# 08-BUSINESS-DECISIONS

Date: 2026-03-24
Phase: 08-role-based-workflows

## Decision Log

### Accepted

1. Tách hệ thống thành 3 luồng theo nhóm user ngay từ đăng ký:
   - `reporter` (Phóng viên)
   - `specialist` (Chuyên viên)
   - `officer` (Cán bộ)
2. MVP hiện tại chỉ cần tách luồng điều hướng và entry points theo nhóm.
3. Workflow xử lý nghiệp vụ bên trong tạm thời dùng chung cho cả 3 nhóm (giữ như hiện tại).
4. Tùy biến workflow riêng theo từng nhóm sẽ thực hiện ở phase tiếp theo.
5. **User tự đổi nhóm được** — Có trang settings để user tự thay đổi `workflowGroup` sau đăng ký.
6. **Legacy user backfill về `specialist`** — Migration 009 gán default `specialist` cho mọi user cũ chưa có `workflow_group`.
7. **3 route riêng theo nhóm** — Sau login/register, điều hướng đến route tương ứng: `/reporter`, `/specialist`, `/officer`.
8. **1 user có thể đăng ký nhiều nhóm** — User không bị giới hạn 1 nhóm; có thể active đồng thời `reporter`, `specialist`, `officer`. DB lưu danh sách nhóm (array/many-to-many), không phải enum đơn. Khi truy cập app, user chọn nhóm đang hoạt động (active group) hoặc chuyển đổi giữa các nhóm đã đăng ký.

### Deferred

1. Thiết kế workflow nghiệp vụ riêng biệt sâu cho từng nhóm.
2. Tối ưu pricing/packaging khác nhau theo nhóm.
3. KPI chi tiết theo từng workflow riêng.

## Scope Confirmation

- In-scope: tách luồng vào theo nhóm + guard route theo nhóm.
- Out-of-scope: thay đổi logic workflow lõi hiện tại.

## Go-to-market Priority

- Ưu tiên đồng thời 3 nhóm ở mức MVP routing.
- Chưa ưu tiên sâu nhóm nào về workflow logic.

## KPI Set (temporary)

- Tỷ lệ user mới chọn được nhóm thành công khi đăng ký.
- Tỷ lệ user sau login vào đúng luồng theo nhóm.
- Tỷ lệ lỗi điều hướng sai nhóm.

## Gate

BIZ-APPROVED: true

