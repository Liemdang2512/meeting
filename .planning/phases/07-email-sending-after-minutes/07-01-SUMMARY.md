---
phase: 07-email-sending-after-minutes
plan: "01"
subsystem: email-infrastructure
tags: [markdown-utils, type-extension, storage, db-migration, resend]
dependency_graph:
  requires: ["07-00"]
  provides: [markdownUtils, MeetingInfo.recipientEmails, app_settings-migration, resend-sdk]
  affects: [features/minutes, lib, db/migrations, App.tsx]
tech_stack:
  added: [resend@^6.9.4]
  patterns: [server-safe-module-extraction, destructure-exclude-from-persist]
key_files:
  created:
    - lib/markdownUtils.ts
    - db/migrations/008_add_app_settings.sql
  modified:
    - lib/minutesDocxExport.ts
    - features/minutes/types.ts
    - features/minutes/storage.ts
    - features/minutes/components/MeetingInfoForm.tsx
    - App.tsx
    - package.json
decisions:
  - Extract markdownToHtml to lib/markdownUtils.ts (server-safe, zero browser deps) to prevent window.open crash when imported server-side
  - saveMeetingInfoDraft uses destructure-exclude pattern to strip recipientEmails before localStorage persistence
  - loadMeetingInfoDraft always returns recipientEmails as [] — never read from storage
  - app_settings table uses key/value/updated_at schema — simple and extensible for Resend API key storage
metrics:
  duration: "4min"
  completed_date: "2026-03-19"
  tasks_completed: 2
  files_changed: 8
---

# Phase 07 Plan 01: Email Infrastructure — Foundation

One-liner: Extracted markdownToHtml to browser-safe markdownUtils module, extended MeetingInfo with recipientEmails, fixed draft storage exclusion, created app_settings migration, and installed resend SDK.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extract markdownToHtml to markdownUtils, install resend | e5ad8e6 | lib/markdownUtils.ts, lib/minutesDocxExport.ts, package.json |
| 2 | Extend MeetingInfo type, fix storage draft exclusion, create DB migration | 44fc41f | features/minutes/types.ts, features/minutes/storage.ts, features/minutes/components/MeetingInfoForm.tsx, App.tsx, db/migrations/008_add_app_settings.sql |

## What Was Built

### lib/markdownUtils.ts
New server-safe module containing `escHtml`, `inlineMd`, and `markdownToHtml`. Zero browser dependencies (no `window`, no `document`). This allows the email template generation on the server to call `markdownToHtml` without crashing.

### lib/minutesDocxExport.ts
Removed local `escHtml`, `inlineMd`, `markdownToHtml` definitions. Now imports from `./markdownUtils` and re-exports `markdownToHtml` for backward compatibility with any existing consumers.

### features/minutes/types.ts
Added `recipientEmails: string[]` to `MeetingInfo` interface.

### features/minutes/storage.ts
- `saveMeetingInfoDraft`: uses `const { recipientEmails: _, ...persistable } = info` to exclude email recipients from localStorage
- `loadMeetingInfoDraft`: always returns `recipientEmails: []`

### features/minutes/components/MeetingInfoForm.tsx
`normalize()` function updated to include `recipientEmails: Array.isArray(info.recipientEmails) ? info.recipientEmails : []`.

### App.tsx
Both initial `useState` and `resetApp` function include `recipientEmails: []`.

### db/migrations/008_add_app_settings.sql
Key-value table for app-wide settings (Resend API key storage):
```sql
CREATE TABLE IF NOT EXISTS public.app_settings (
  key   text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

### package.json
`resend@^6.9.4` added to dependencies.

## Verification Results

- `npx tsc --noEmit`: PASS (no type errors)
- `grep window|document lib/markdownUtils.ts`: Only in comment, no actual browser deps
- `grep recipientEmails features/minutes/types.ts`: Field present
- `grep "recipientEmails: _" features/minutes/storage.ts`: Exclusion confirmed
- `grep resend package.json`: Installed

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- lib/markdownUtils.ts: FOUND
- db/migrations/008_add_app_settings.sql: FOUND

Commits exist:
- e5ad8e6: FOUND
- 44fc41f: FOUND
