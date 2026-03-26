# Phase 9: UI Revamp - Website và giao diện từng nhóm tính năng - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Build 3 workflow hoàn toàn độc lập (reporter / specialist / officer), mỗi workflow có:
- Upload file riêng
- Phiên âm (transcription) với tham số riêng
- Form thông tin riêng theo nhóm
- AI tạo output riêng (prompt khác nhau)

Trang meeting (`/meeting`) hiển thị cards chọn nhóm (chỉ các nhóm user thuộc về), rồi dẫn vào workflow tương ứng.

</domain>

<decisions>
## Implementation Decisions

### Workflow Cards (Landing)
- **D-01:** Trang `/meeting` hiển thị cards cho từng nhóm mà user có — chỉ filter theo `user.workflowGroups`
- **D-02:** User chọn 1 nhóm trước rồi mới bắt đầu upload (không upload trước rồi chọn sau)
- **D-03:** Card mapping: `reporter` → "Bài phỏng vấn" | `specialist` → "Thư ký họp" | `officer` → "Thông tin vụ án"

### Form Fields per Nhóm
- **D-04:** Mỗi nhóm có form thông tin riêng hoàn toàn (không dùng chung `MeetingInfoForm` hiện tại)
- **D-05:** **Bài phỏng vấn (Reporter):**
  - Tiêu đề phỏng vấn (text input)
  - Tên khách mời (text input đơn)
  - Phóng viên (text input đơn)
  - Thời gian (datetime input)
  - Địa điểm (text input)
- **D-06:** **Thư ký họp (Specialist):**
  - Giữ form hiện tại (`MeetingInfoForm`), chỉ đổi label:
    - `companyName` → "Tiêu đề cuộc họp"
    - "Chủ trì" thay vì tên DN
  - Nhân sự = danh sách người tham dự (như hiện tại)
  - Thời gian + Địa điểm giữ nguyên
- **D-07:** **Thông tin vụ án (Officer):**
  - Tiêu đề (text input)
  - Chủ Toạ (text input đơn)
  - Thư ký toà (text input đơn)
  - Nhân sự (danh sách như hiện tại)
  - Thời gian (datetime input)
  - Địa điểm (text input)

### Data Model
- **D-08:** Tạo type riêng cho từng nhóm — không extend `MeetingInfo`:
  - `ReporterInfo` (interviewTitle, guestName, reporter, datetime, location)
  - `SpecialistInfo` = `MeetingInfo` hiện tại (tái dùng)
  - `OfficerInfo` (title, presiding, courtSecretary, participants, datetime, location)
- **D-09:** localStorage dùng 1 key chung (`meeting_info_draft`) — không tách theo nhóm

### AI Output Format
- **D-10:** Mỗi nhóm có AI summary prompt riêng biệt:
  - Reporter → bài phỏng vấn/báo chí
  - Specialist → biên bản cuộc họp (prompt hiện tại)
  - Officer → biên bản phiên toà/hồ sơ pháp lý
- **D-11:** Prompt nội dung sẽ do user cung cấp sau — phase này build cấu trúc, để placeholder prompt có thể swap được

### Phiên âm (Transcription)
- **D-12:** Phần transcription (B2) khác nhau giữa các nhóm — tham số phiên âm (prompt hướng dẫn AI) sẽ khác nhau theo ngữ cảnh
- **D-13:** Chế độ Basic/Deep vẫn giữ, nhưng prompt system instruction sẽ khác nhau theo nhóm

### Tổng hợp Flow
- **D-14:** Nút "Tổng hợp" trigger AI summary giống như hiện tại — cùng flow, khác prompt
- **D-15:** Sau khi AI tạo xong → hiển thị output cùng trang, step tiếp theo (không navigate sang trang khác)

### Scope
- **D-16:** Phase này build đầy đủ cả 3 workflow: reporter (mới hoàn toàn), specialist (refine), officer (mới hoàn toàn)
- **D-17:** `ReporterWorkflowPage` và `OfficerWorkflowPage` hiện là placeholder — phase này sẽ build đầy đủ

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Workflow & Types
- `features/workflows/types.ts` — WorkflowGroup type, WORKFLOW_GROUPS constant
- `features/workflows/WorkflowGuard.tsx` — Route guard pattern
- `features/workflows/GroupSwitcher.tsx` — Group switching pattern

### Meeting Info (Specialist - reuse/reference)
- `features/minutes/types.ts` — MeetingInfo, MeetingParticipant, MeetingParticipantRole types
- `features/minutes/components/MeetingInfoForm.tsx` — Form component hiện tại (specialist reuses/adapts)
- `features/minutes/storage.ts` — localStorage draft pattern
- `features/minutes/prompt.ts` — buildMinutesCustomPrompt (specialist prompt)

### Main App (routing và workflow integration)
- `App.tsx` — Routing: /reporter, /specialist, /officer, /meeting; selectedWorkflowMode state đã thêm
- `features/workflows/reporter/ReporterWorkflowPage.tsx` — Placeholder cần build
- `features/workflows/officer/OfficerWorkflowPage.tsx` — Placeholder cần build

### Phase 8 Context (workflow foundation)
- `.planning/phases/08-role-based-workflows/08-CONTEXT.md` — Các quyết định liên quan workflowGroups

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MeetingInfoForm` component: Specialist workflow tái dùng với label đổi; Reporter/Officer tạo form component mới tương tự pattern
- `MeetingParticipant` type + participant management UI: Tái dùng cho "Nhân sự" field trong Specialist và Officer
- `localStorage draft` pattern trong `features/minutes/storage.ts`: Tái dùng cho draft lưu
- `useMindmapTree`, `downloadAsDocx`, `downloadAsPdf`: Có thể tái dùng sau khi AI tạo output
- `WorkflowGuard`: Đã wrap /reporter, /specialist, /officer routes trong App.tsx

### Established Patterns
- State management: `useState` trong component, không có Redux/Zustand
- Styling: Tailwind CSS + slate/indigo color palette
- Form pattern: controlled inputs với `useState`, auto-save draft với `useEffect`
- AI calls: `geminiService.ts` — `transcribeBasic`, `transcribeDeep`, `summarizeTranscript`

### Integration Points
- `App.tsx` line ~30: `selectedWorkflowMode` state mới thêm hôm nay — cần sử dụng để route đến đúng workflow
- `App.tsx` routes /reporter, /specialist, /officer: Hiện wrap bởi WorkflowGuard, dẫn vào page components
- `SpecialistWorkflowPage` hiện redirect về `/meeting` — cần thay đổi để có workflow riêng
- `geminiService.ts`: `summarizeTranscript(transcript, customPrompt, apiKey, loggingContext)` — truyền prompt khác nhau per group

</code_context>

<specifics>
## Specific Ideas

- Mockup từ user (2026-03-26): 3 cột form side-by-side cho 3 nhóm (mỗi nhóm trong 1 khung riêng)
- Nút "Tổng hợp" nằm ở cuối mỗi form
- Language selector (Tiếng Việt, Tiếng Anh, Tiếng Trung, Tiếng Hàn, Tiếng Nhật, --) nằm ở bước chọn nhóm

</specifics>
