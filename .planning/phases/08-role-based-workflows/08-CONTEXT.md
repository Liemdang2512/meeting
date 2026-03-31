# Phase 8: Role-Based Workflows - Context

**Gathered:** 2026-03-24  
**Status:** Ready for planning

<domain>
## Phase Boundary

Mục tiêu phase 8 là tách luồng sản phẩm thành 3 nhóm người dùng ngay từ bước đăng ký:

1. `reporter` — **Phóng viên (Báo chí)**
2. `specialist` — **Chuyên viên (Doanh nghiệp)**
3. `officer` — **Cán bộ (Pháp lý)**

Sau khi user đăng ký và đăng nhập, hệ thống điều hướng theo nhóm đã chọn và hiển thị workflow phù hợp từng nhóm.

Trong phase này chỉ làm:
- Data model + migration để lưu nhóm workflow của user.
- Mở rộng register UI/API để chọn nhóm.
- Guard điều hướng theo nhóm.
- Tách workflow theo nhóm ở mức route + cấu trúc màn hình/step logic (không thay đổi sâu engine AI hiện có).
- Test chiến lược cho luồng mới.

Ngoài phạm vi:
- Không thay đổi logic lõi Gemini transcription hiện có.
- Không thay đổi pricing/cổng thanh toán.
- Không thay đổi cơ chế admin role hiện có (chỉ đảm bảo tương thích).

</domain>

<decisions>
## Locked Decisions

- **D-01:** Dùng 3 lựa chọn cố định: `reporter` (Phóng viên), `specialist` (Chuyên viên), `officer` (Cán bộ).
- **D-02:** Chọn nhóm ở trang đăng ký (multi-select); user có thể đăng ký 1 hoặc nhiều nhóm.
- **D-03:** Kiến trúc phải tương thích stack hiện tại React 19 + TypeScript + Vite + PostgreSQL/Auth server.
- **D-04:** Ưu tiên refactor sạch, đúng folder feature-based, hạn chế đụng module không liên quan.
- **D-05:** 1 user có thể thuộc nhiều nhóm — DB lưu array/many-to-many, không phải enum đơn. JWT mang `workflowGroups[]` + `activeWorkflowGroup`.
- **D-06:** User có UI để chuyển đổi active group sau đăng nhập (group switcher).
- **D-07:** User tự đổi/thêm nhóm được qua trang settings.
- **D-08:** Legacy user backfill `activeWorkflowGroup = specialist`, `workflowGroups = ['specialist']`.
- **D-09:** Route riêng theo nhóm: `/reporter`, `/specialist`, `/officer`. Guard kiểm tra nhóm trong danh sách `workflowGroups[]`.

## Claude's Discretion

- Chọn cách lưu multi-group: cột array (`text[]`) trong `profiles` hay bảng `user_workflow_groups` riêng (ưu tiên đơn giản nhất đủ dùng).
- Chọn mức guard ở frontend-only hay frontend + backend (ưu tiên cả hai cho endpoint nhạy cảm).
- Vị trí đặt group switcher UI (header, sidebar, hay settings page).
- Chọn phạm vi test tự động phù hợp để chạy nhanh trong CI hiện tại.

</decisions>

<current_state>
## Current Codebase Findings (quick survey)

- Auth/register:
  - `components/RegisterPage.tsx`: form chỉ có email/password/confirm, chưa có chọn nhóm.
  - `lib/auth.ts`: `register()` gửi `{ email, password, confirmPassword }`.
  - `server/routes/auth.ts`:
    - `/auth/register` tạo user + insert `public.profiles` với role `'free'`.
    - `/auth/login` đọc `profiles.role`, sign JWT payload `{ userId, email, role }`.
- Routing/workflow:
  - `App.tsx` dùng state `route` + `window.history`, chưa có phân nhánh theo nhóm user.
  - Workflow chính đang là luồng chung cho mọi user ở `/meeting`.
- Data model:
  - `db/schema.sql` có `public.profiles.role`, chưa có field nhóm workflow.
  - `server/routes/profiles.ts` mới có endpoint `/profiles/role`.

Implication: điểm chạm chính sẽ nằm ở `db/migrations`, `server/routes/auth.ts`, `lib/auth.ts`, `components/RegisterPage.tsx`, `App.tsx`, và một feature mới cho role-based workflow shell.

</current_state>

<requirements>
## Requirement IDs

- **ROLE-01**: User mới bắt buộc chọn 1 trong 3 nhóm tại đăng ký.
- **ROLE-02**: Giá trị nhóm được lưu bền vững trong DB và có mặt trong JWT/session user profile.
- **ROLE-03**: Sau login/register, app điều hướng đúng route khởi điểm theo nhóm.
- **ROLE-04**: Mỗi nhóm có workflow riêng (route + config bước + UI shell) không trộn lẫn.
- **ROLE-05**: Guard ngăn truy cập sai luồng (frontend + endpoint cần thiết).
- **ROLE-06**: Có test cho register payload validation, route guard, và điều hướng theo nhóm.

</requirements>

<risks>
## Risks

- JWT hiện đang chỉ mang `role`; thêm `workflowGroup` cần đồng bộ frontend type + backend sign/verify.
- Dữ liệu user cũ chưa có workflow group -> cần migration/backfill mặc định an toàn.
- `App.tsx` đang lớn, nếu chèn logic trực tiếp dễ tăng technical debt; cần tách thành module workflow routing riêng.

</risks>

<rollback>
## Rollback Strategy

- Migration có script rollback xóa cột mới hoặc revert default/backfill.
- Feature flag mềm (nếu cần): fallback route về `/meeting` khi thiếu `workflowGroup`.
- JWT claim không có `workflowGroup` => map về default group để không khóa user cũ.

</rollback>

---

*Phase: 08-role-based-workflows*  
*Context gathered: 2026-03-24*
