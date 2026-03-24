# Roadmap: Meeting Scribe AI Pro

## Overview

Ứng dụng web giúp ghi chép biên bản cuộc họp tự động: upload audio/video → phiên âm bằng Gemini API → tạo biên bản họp. Các phase bao gồm xác thực, quản lý token, hạ tầng, tính năng AI, và gửi email biên bản.

## Phases

- [x] **Phase 1: Auth** - Đăng nhập JWT, quản lý user invite-only
- [x] **Phase 2: Token Usage** - Theo dõi chi phí token Gemini theo user/feature
- [x] **Phase 3: Docker + PostgreSQL** - Hạ tầng local dev với Docker
- [x] **Phase 4: Replace Supabase** - Chuyển sang PostgreSQL tự quản
- [x] **Phase 5: Text Mindmap & Checklist** - Mindmap và checklist từ biên bản
- [ ] **Phase 6: Free Registration, Daily Limit & Payment UI** - Đăng ký tự do, giới hạn hàng ngày, UI thanh toán
- [x] **Phase 7: Email Sending After Minutes** - Gửi email biên bản cuộc họp đến danh sách người nhận (completed 2026-03-19)
- [ ] **Phase 8: Role-Based Workflows** - Chia luồng sản phẩm theo nhóm người dùng (Phóng viên/Chuyên viên/Cán bộ)

## Phase Details

### Phase 1: Auth
**Goal**: Đăng nhập JWT, quản lý user invite-only, phân quyền admin/user
**Depends on**: Nothing
**Requirements**: TBD
**Success Criteria**:
  1. User có thể đăng nhập bằng email/password
  2. Admin có thể tạo user mới
  3. JWT được lưu và gửi đúng cách
**Plans**: Complete

### Phase 2: Token Usage
**Goal**: Theo dõi chi phí token Gemini theo user và feature
**Depends on**: Phase 1
**Requirements**: TBD
**Success Criteria**:
  1. Token usage được log sau mỗi API call
  2. Admin xem được báo cáo chi phí
**Plans**: Complete

### Phase 3: Docker + PostgreSQL
**Goal**: Hạ tầng local dev với Docker và PostgreSQL
**Depends on**: Phase 2
**Requirements**: TBD
**Success Criteria**:
  1. Docker container chạy PostgreSQL local
  2. Dev workflow ổn định
**Plans**: Complete

### Phase 4: Replace Supabase
**Goal**: Chuyển từ Supabase sang PostgreSQL tự quản
**Depends on**: Phase 3
**Requirements**: TBD
**Success Criteria**:
  1. Không còn dependency vào Supabase
  2. Auth và data hoạt động bình thường với PostgreSQL
**Plans**: Complete

### Phase 5: Text Mindmap & Checklist
**Goal**: Tạo mindmap và checklist từ nội dung biên bản cuộc họp
**Depends on**: Phase 4
**Requirements**: TBD
**Success Criteria**:
  1. Mindmap được tạo từ text biên bản
  2. Checklist hành động được trích xuất
**Plans**: Complete

### Phase 6: Free Registration, Daily Limit & Payment UI
**Goal**: Cho phép đăng ký tự do, áp dụng giới hạn hàng ngày cho free tier, UI thanh toán
**Depends on**: Phase 5
**Requirements**: TBD
**Success Criteria**:
  1. User có thể tự đăng ký
  2. Free tier bị giới hạn số lần dùng mỗi ngày
  3. UI hiển thị trạng thái quota và nâng cấp
**Plans**: In progress

### Phase 7: Email Sending After Minutes
**Goal**: Sau khi tạo xong biên bản cuộc họp, user có thể nhập danh sách email người nhận và gửi email chứa nội dung biên bản (HTML body + PDF đính kèm)
**Depends on**: Phase 6
**Requirements**: [EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04]
**Success Criteria**:
  1. Bước 3 (thông tin cuộc họp) có trường nhập danh sách email người nhận
  2. Sau khi biên bản được tạo, user có thể gửi email đến các địa chỉ đã nhập
  3. Email chứa nội dung biên bản đầy đủ (HTML body + PDF attachment)
  4. Xác nhận gửi thành công/thất bại hiển thị cho user
**Plans**: 4 plans
Plans:
- [ ] 07-01-PLAN.md — Infrastructure: markdownUtils extraction, MeetingInfo type extension, DB migration, resend install
- [ ] 07-02-PLAN.md — EmailRecipientsInput chips component + MeetingInfoForm integration
- [ ] 07-03-PLAN.md — Server-side email route: PDF generator, HTML template, Resend SDK, admin settings API
- [ ] 07-04-PLAN.md — Email send card in completion step, admin email settings UI, human verification

### Phase 8: Role-Based Workflows
**Goal**: Multi-group workflow system: DB text[] columns, extended JWT with workflowGroups/activeWorkflowGroup, register multi-select, per-group routes with guards, group switcher, settings page
**Depends on**: Phase 7
**Requirements**: [ROLE-01, ROLE-02, ROLE-03, ROLE-04, ROLE-05, ROLE-06]
**Success Criteria**:
  1. User bắt buộc chọn nhóm workflow khi đăng ký (multi-select, min 1)
  2. workflowGroups[] + activeWorkflowGroup lưu DB text[] và đồng bộ vào JWT
  3. Sau login/register, app điều hướng đúng workflow theo activeWorkflowGroup
  4. Guard chặn truy cập sai luồng giữa 3 nhóm
  5. Có test tự động cho register validation + route guard + group switcher
**Plans**: 4 plans
Plans:
- [ ] 08-01-PLAN.md — DB migration (text[] columns) + WorkflowGroup types + AuthUser extension + legacy JWT normalization
- [ ] 08-02-PLAN.md — Backend auth: register/login with workflowGroups + PATCH active-workflow-group endpoint
- [ ] 08-03-PLAN.md — Frontend: RegisterPage multi-select + WorkflowGuard + 3 workflow shells + App.tsx routing
- [ ] 08-04-PLAN.md — GroupSwitcher header + Settings WorkflowGroupsSection + tests + human verification
