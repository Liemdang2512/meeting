---
phase: 07-email-sending-after-minutes
plan: "02"
subsystem: frontend/minutes
tags: [email, chips, input, ui, react, typescript]
dependency_graph:
  requires: ["07-00", "07-01"]
  provides: ["EmailRecipientsInput component", "MeetingInfo.recipientEmails UI wiring"]
  affects: ["features/minutes/components/MeetingInfoForm.tsx"]
tech_stack:
  added: []
  patterns: ["controlled chips/tags input", "useEffect error auto-dismiss", "Vietnamese UI copywriting"]
key_files:
  created:
    - features/minutes/components/EmailRecipientsInput.tsx
  modified:
    - features/minutes/components/MeetingInfoForm.tsx
decisions:
  - "Used &times; HTML entity for chip delete button — semantically correct multiplication sign"
  - "Error auto-dismiss via useEffect watching error state with setTimeout cleanup — avoids stale closure"
  - "maxRecipients defaults to 20 at component level — matches spec and allows override"
metrics:
  duration: "4min"
  completed_date: "2026-03-19"
  tasks: 2
  files_modified: 2
---

# Phase 07 Plan 02: EmailRecipientsInput Chips Component Summary

**One-liner:** Chips/tags email input with Enter/comma/Tab triggers, validation, backspace removal, and 20-item limit integrated into MeetingInfoForm.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create EmailRecipientsInput chips component | 22f9cdb | features/minutes/components/EmailRecipientsInput.tsx (created) |
| 2 | Integrate EmailRecipientsInput into MeetingInfoForm | 9f315cd | features/minutes/components/MeetingInfoForm.tsx (modified) |

## What Was Built

**EmailRecipientsInput** (`features/minutes/components/EmailRecipientsInput.tsx`):
- Controlled component with `value: string[]`, `onChange`, and `maxRecipients` (default 20) props
- EMAIL_RE regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` validates format on each tag attempt
- Triggers: `Enter`, `,`, `Tab` keys, and field blur all call `addTag()`
- `Backspace` on empty input removes last chip via `onChange(value.slice(0, -1))`
- Counter: `{count}/20` turns amber at 18+, red at 20
- Error messages auto-dismiss after 3 seconds via `useEffect` + `setTimeout` with cleanup
- Vietnamese copy from UI-SPEC: "Email không hợp lệ: [value]", "Email này đã có trong danh sách", "Đã đạt tối đa 20 địa chỉ email"
- Chip styling: `bg-indigo-50 text-indigo-700 rounded-lg` with `&times;` delete button

**MeetingInfoForm** (`features/minutes/components/MeetingInfoForm.tsx`):
- Import added: `import { EmailRecipientsInput } from './EmailRecipientsInput'`
- Email section inserted after participants block and before action buttons
- Section subtext: "Nhập danh sách email nhận biên bản. Tối đa 20 địa chỉ."
- Wired to `value.recipientEmails` with `setValue(prev => ({ ...prev, recipientEmails: emails }))`
- `saveMeetingInfoDraft` (updated in plan 01) strips recipientEmails — emails never persisted to localStorage

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `features/minutes/components/EmailRecipientsInput.tsx` exists
- [x] `features/minutes/components/MeetingInfoForm.tsx` contains `import { EmailRecipientsInput }`
- [x] `npx tsc --noEmit` passes
- [x] Task commits 22f9cdb and 9f315cd exist in git log
