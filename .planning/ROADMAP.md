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
- [ ] **Phase 9: UI Revamp** - Website và giao diện từng nhóm tính năng (5/8 plans complete)
- [x] **Phase 10: Payment Gateway Integration** - Tích hợp thanh toán Visa, Mastercard, MoMo, VNPay (completed 2026-04-03)

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
- [x] 08-01-PLAN.md — DB migration (text[] columns) + WorkflowGroup types + AuthUser extension + legacy JWT normalization
- [x] 08-02-PLAN.md — Backend auth: register/login with workflowGroups + PATCH active-workflow-group endpoint
- [x] 08-03-PLAN.md — Frontend: RegisterPage multi-select + WorkflowGuard + 3 workflow shells + App.tsx routing
- [x] 08-04-PLAN.md — GroupSwitcher header + Settings WorkflowGroupsSection + tests + human verification

### Phase 10: Payment Gateway Integration

**Goal:** Tích hợp thanh toán cho các gói nâng cấp: hỗ trợ 4 cổng thanh toán Visa, Mastercard, MoMo, VNPay — cho phép user mua gói trả phí từ trong ứng dụng
**Depends on**: Phase 9
**Requirements**: TBD
**Success Criteria**:
  1. User có thể chọn gói và thanh toán bằng Visa/Mastercard (Stripe hoặc cổng quốc tế)
  2. User có thể thanh toán bằng MoMo (MoMo Payment Gateway API)
  3. User có thể thanh toán bằng VNPay (VNPay Gateway)
  4. Sau thanh toán thành công, tài khoản được nâng cấp tự động
  5. Lịch sử giao dịch và trạng thái subscription được lưu trong DB
  6. Webhook xử lý callback thanh toán từ các cổng
**Plans**: 6 plans
Plans:
- [x] 10-01-PLAN.md — DB migration (payment_orders, webhook_events tables) + invalidateProfileCache export + /api/payments/check-upgrade endpoint
- [x] 10-02-PLAN.md — VNPay integration: create URL, return redirect, IPN handler (covers Visa/Mastercard/domestic ATM/VNPay QR)
- [x] 10-03-PLAN.md — MoMo integration: create payment via REST API, IPN handler with HMAC-SHA256
- [ ] 10-04-PLAN.md — Frontend: replace UpgradeModal mock form with gateway buttons, PaymentResultPage, App.tsx route
- [ ] 10-05-PLAN.md — Admin payment orders view + integration tests + human verification
- [ ] 10-06-PLAN.md — VNPay preselect payment channel from checkout tab to reduce extra click before entering card/OTP

### Phase 11: sửa giao thức tính tiền: sau đăng ký tài khoản có số dư cố định, sử dụng sẽ trừ trực tiếp vào số dư

**Goal:** Chuyển mô hình thanh toán sang số dư trả trước (`internal_credits`): user nạp credit theo các gói 299000/399000/499000, hệ thống trừ credit tại thời điểm bắt đầu tạo nội dung AI, tự động hoàn full nếu fail, hỗ trợ ngưỡng âm -10000 và migration policy theo batch cho user cũ
**Requirements**: TBD
**Depends on:** Phase 10
**Plans:** 1/4 plans executed

Plans:
- [x] 11-01-PLAN.md — Wave 1 business contract: wallet ledger + rate-card schema and typed billing contracts (D-01, D-02, D-04)
- [ ] 11-02-PLAN.md — Wave 1 business policy: migration batch sunset + overdraft floor tests/contracts (D-06, D-07, D-08, D-09)
- [ ] 11-03-PLAN.md — Wave 2 technical: payment webhook top-up funding + workflow unlock + wallet refresh payload (D-03)
- [ ] 11-04-PLAN.md — Wave 3 technical: charge-at-start runtime, auto-refund on failure, insufficient-balance UX and E2E verify (D-04, D-05, D-06, D-07)

---

### Phase 9: UI Revamp - Website va giao dien tung nhom tinh nang

**Goal:** Build 3 complete independent workflow pages (reporter/specialist/officer) with per-group forms, transcription hints, AI prompts, and a MeetingLandingPage card selector replacing the monolithic /meeting inline block
**Requirements**: [UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10, UI-11, UI-12, UI-13, UI-14, UI-15, UI-16]
**Depends on:** Phase 8
**Success Criteria**:
  1. /meeting route shows workflow group cards filtered by user's groups
  2. /reporter has complete interview workflow (upload, transcribe, form, AI summary)
  3. /specialist has complete meeting secretary workflow (reuses MeetingInfoForm with label changes)
  4. /officer has complete legal workflow (upload, transcribe, court form with participants, AI summary)
  5. Each group uses per-group AI prompt and transcription context hints
  6. Inline monolithic /meeting block removed from App.tsx
**Plans**: 8 plans
Plans:
- [x] 09-01-PLAN.md — Types (ReporterInfo, OfficerInfo, SpecialistInfo) + storage with _type discriminator + prompt builders
- [x] 09-02-PLAN.md — geminiService systemHint extension + shared WorkflowStepHeader component
- [x] 09-03-PLAN.md — ReporterInfoForm + OfficerInfoForm + MeetingLandingPage components
- [x] 09-04-PLAN.md — Complete ReporterWorkflowPage (4-step wizard)
- [ ] 09-05-PLAN.md — Complete OfficerWorkflowPage (4-step wizard)
- [x] 09-06-PLAN.md — Complete SpecialistWorkflowPage (replace redirect stub)
- [ ] 09-07-PLAN.md — App.tsx wiring: MeetingLandingPage at /meeting + props to workflow pages
- [ ] 09-08-PLAN.md — Human verification checkpoint
