---
status: testing
phase: 09-ui-revamp-website-va-giao-dien-tung-nhom-tinh-nang
source: [09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md, 09-04-SUMMARY.md, 09-05-SUMMARY.md, 09-06-SUMMARY.md, 09-07-SUMMARY.md]
started: 2026-03-26T13:08:00Z
updated: 2026-03-26T13:08:00Z
---

## Current Test

number: 1
name: 1. Group Cards Selection Route
expected: |
  Navigating to `/meeting` shows a Landing page with 3 workflow cards ("Bài phỏng vấn", "Thư ký họp", "Thông tin vụ án"). Hovering over them shows a blue border effect. Clicking them navigates correctly to `/reporter`, `/specialist`, and `/officer` respectively.
awaiting: user response

## Tests

### 1. Group Cards Selection Route
expected: Navigating to `/meeting` shows a Landing page with 3 workflow cards ("Bài phỏng vấn", "Thư ký họp", "Thông tin vụ án"). Hovering over them shows a blue border effect. Clicking them navigates correctly to `/reporter`, `/specialist`, and `/officer` respectively.
result: pending

### 2. Reporter Workflow
expected: Going to `/reporter` shows a 4-step wizard. Step 3 displays the `ReporterInfoForm` (Title, Guest, Location). Step 4 generates an interview summary.
result: pending

### 3. Specialist Workflow
expected: Going to `/specialist` shows a 4-step wizard. Step 3 displays the `MeetingInfoForm` but with custom labels ("Tiêu đề cuộc họp" instead of "Tên doanh nghiệp"). Step 4 generates meeting minutes.
result: pending

### 4. Officer Workflow
expected: Going to `/officer` shows a 4-step wizard. Step 3 displays `OfficerInfoForm` with participant management specifically labeled 'Chủ Toạ/Thư ký toà'. Step 4 generates legal court summary.
result: pending

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0

## Gaps

