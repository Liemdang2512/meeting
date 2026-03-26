# Phase 9: UI Revamp - Website va giao dien tung nhom tinh nang - Research

**Researched:** 2026-03-26
**Domain:** React workflow UI, form architecture, Tailwind CSS, Gemini AI prompt injection
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Workflow Cards (Landing)**
- D-01: Trang `/meeting` hiển thị cards cho từng nhóm mà user có — chỉ filter theo `user.workflowGroups`
- D-02: User chọn 1 nhóm trước rồi mới bắt đầu upload (không upload trước rồi chọn sau)
- D-03: Card mapping: `reporter` → "Bài phỏng vấn" | `specialist` → "Thư ký họp" | `officer` → "Thông tin vụ án"

**Form Fields per Nhóm**
- D-04: Mỗi nhóm có form thông tin riêng hoàn toàn (không dùng chung `MeetingInfoForm` hiện tại)
- D-05: Reporter form: interviewTitle, guestName, reporter, datetime, location
- D-06: Specialist form: giữ MeetingInfoForm, đổi label companyName → "Tiêu đề cuộc họp", "Chủ trì" header
- D-07: Officer form: title, presiding (Chủ Toạ), courtSecretary (Thư ký toà), participants list, datetime, location

**Data Model**
- D-08: Types riêng per nhóm — `ReporterInfo`, `SpecialistInfo` (= MeetingInfo hiện tại), `OfficerInfo`
- D-09: localStorage dùng 1 key chung (`meeting_info_draft`) — không tách theo nhóm

**AI Output Format**
- D-10: Mỗi nhóm có AI summary prompt riêng biệt
- D-11: Prompt nội dung do user cung cấp sau — phase này build cấu trúc, placeholder prompt có thể swap

**Phiên âm (Transcription)**
- D-12: Tham số phiên âm (prompt hướng dẫn AI) khác nhau theo ngữ cảnh nhóm
- D-13: Chế độ Basic/Deep vẫn giữ, nhưng system instruction prompt khác nhau theo nhóm

**Tổng hợp Flow**
- D-14: Nút "Tổng hợp" trigger AI summary — cùng flow, khác prompt
- D-15: Sau khi AI tạo xong → hiển thị output cùng trang, step tiếp theo (không navigate sang trang khác)

**Scope**
- D-16: Phase này build đầy đủ cả 3 workflow: reporter (mới hoàn toàn), specialist (refine), officer (mới hoàn toàn)
- D-17: `ReporterWorkflowPage` và `OfficerWorkflowPage` hiện là placeholder — phase này build đầy đủ

### Claude's Discretion

(None specified — all key decisions are locked)

### Deferred Ideas (OUT OF SCOPE)

(No deferred items listed in CONTEXT.md)
</user_constraints>

---

## Summary

Phase 9 builds 3 complete independent workflows (reporter, specialist, officer), each with its own upload flow, transcription parameters, structured form, and AI summary prompt. The `/meeting` route currently renders inline in `App.tsx` as a monolithic "notes" mode — this phase extracts each workflow group into its own page component under `features/workflows/{group}/`.

The core pattern is: each workflow page is a self-contained React component that manages its own multi-step state (upload → transcribe → fill form → summarize → view output). The pages already have routing and guards wired in `App.tsx`. The primary work is building out the placeholder `ReporterWorkflowPage` and `OfficerWorkflowPage` from scratch, and refining `SpecialistWorkflowPage` (currently just redirects to `/meeting`) to contain the full workflow inline.

The existing `MeetingInfoForm` is the reference implementation for the form pattern. The `geminiService.ts` `summarizeTranscript(transcript, customPrompt, loggingContext)` signature already supports per-group prompts — the phase just needs to define 3 prompt builders. The `transcribeBasic` and `transcribeDeep` functions accept a `language` param and construct their own system prompts — D-12/D-13 will require adding an optional `contextHint` parameter to these functions or defining per-group system instruction overrides.

**Primary recommendation:** Build each workflow page as a self-contained component in `features/workflows/{group}/{Group}WorkflowPage.tsx`, using the same step-wizard pattern as the current `/meeting` flow. Extract reusable sub-components (ParticipantList, DatetimeInput, LocationInput) shared across all 3 forms.

---

## Standard Stack

### Core (already installed — no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.3 | Component rendering | Project standard |
| TypeScript | ~5.8.2 | Type safety for new Info types | Project standard |
| Tailwind CSS | ^3.4.17 | Styling — slate/indigo palette | Project standard |
| lucide-react | ^0.577.0 | Icons (no emojis per skill rules) | Project standard |
| @google/genai | ^1.33.0 | Gemini AI calls | Already wired via geminiService.ts |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | ^4.0.18 | Unit tests for new form types and prompt builders | All new `.test.ts` files |
| @testing-library/react | ^16.3.2 | Component tests | WorkflowPage render tests |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useState step wizard | React Router v6 step routes | Router adds URL-per-step history; overkill given app uses manual pushState |
| Per-group prompt builders | Single builder with group param | Per-group builders are cleaner, match D-10 "riêng biệt" requirement |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

```
features/workflows/
├── types.ts                          # WorkflowGroup (existing)
├── WorkflowGuard.tsx                 # Route guard (existing)
├── GroupSwitcher.tsx                 # Group switcher (existing)
├── reporter/
│   ├── ReporterWorkflowPage.tsx      # FULL BUILD (was placeholder)
│   ├── ReporterInfoForm.tsx          # NEW: form for D-05 fields
│   └── reporterPrompt.ts            # NEW: buildReporterPrompt()
├── specialist/
│   ├── SpecialistWorkflowPage.tsx    # REFACTOR: embed full workflow (no redirect)
│   └── specialistPrompt.ts          # NEW: buildSpecialistPrompt() (wraps existing buildMinutesCustomPrompt)
└── officer/
    ├── OfficerWorkflowPage.tsx       # FULL BUILD (was placeholder)
    ├── OfficerInfoForm.tsx           # NEW: form for D-07 fields
    └── officerPrompt.ts             # NEW: buildOfficerPrompt()

features/minutes/
├── types.ts                          # ADD: ReporterInfo, OfficerInfo types (D-08)
│                                     # SpecialistInfo = MeetingInfo (reuse)
└── storage.ts                        # ADD: saveReporterDraft, saveOfficerDraft (same key D-09)

components/workflows/                 # NEW: shared sub-components
├── ParticipantListEditor.tsx         # Extracted from MeetingInfoForm (used by Specialist + Officer)
├── WorkflowStepHeader.tsx            # Step indicator shared across all 3 workflow pages
└── WorkflowFileUpload.tsx            # Upload + transcription panel (extract from App.tsx)
```

### Pattern 1: Self-Contained Workflow Page (Step Wizard)

**What:** Each workflow page owns its own step state, form state, transcription state, and AI summary state. No shared state lifted to App.tsx.

**When to use:** Each group's page at `/reporter`, `/specialist`, `/officer`.

**Example:**
```typescript
// Source: extracted from existing App.tsx /meeting flow pattern
type Step = 'upload' | 'transcribe' | 'form' | 'summarize' | 'done';

export default function ReporterWorkflowPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [info, setInfo] = useState<ReporterInfo>(defaultReporterInfo());
  const [summary, setSummary] = useState<string | null>(null);

  // Each step renders conditionally:
  if (step === 'upload') return <WorkflowFileUpload onDone={...} />;
  if (step === 'transcribe') return <TranscriptionView ... />;
  if (step === 'form') return <ReporterInfoForm value={info} onChange={setInfo} onContinue={...} />;
  if (step === 'summarize') return <SummarizeStep ... />;
  return <OutputView summary={summary} />;
}
```

### Pattern 2: Per-Group Info Types (D-08)

**What:** Dedicated TypeScript interfaces for each group's form data.

**When to use:** Define in `features/minutes/types.ts` alongside existing `MeetingInfo`.

**Example:**
```typescript
// Source: D-08 from 09-CONTEXT.md
export interface ReporterInfo {
  interviewTitle: string;
  guestName: string;
  reporter: string;
  datetime: string;
  location: string;
}

export interface OfficerInfo {
  title: string;
  presiding: string;       // Chủ Toạ
  courtSecretary: string;  // Thư ký toà
  participants: MeetingParticipant[];  // reuse existing type
  datetime: string;
  location: string;
}

// SpecialistInfo = MeetingInfo (no new type needed — D-08)
export type SpecialistInfo = MeetingInfo;
```

### Pattern 3: Per-Group Prompt Builders

**What:** Each group has a `buildXxxPrompt(info, templatePrompt)` function matching the signature of `buildMinutesCustomPrompt`.

**When to use:** Called before `summarizeTranscript(transcript, customPrompt, ...)`.

**Example:**
```typescript
// Source: pattern from features/minutes/prompt.ts
export function buildReporterPrompt(args: {
  info: ReporterInfo;
  templatePrompt: string;
}): string {
  return `Bạn sẽ tạo BÀI PHỎNG VẤN/BÁO CHÍ dựa trên transcript.\n\n` +
    `THÔNG TIN PHỎNG VẤN (JSON)\n` +
    `${JSON.stringify({ ...args.info }, null, 2)}\n\n---\n\n` +
    `${args.templatePrompt}`;
}
```

### Pattern 4: Shared localStorage Draft (D-09)

**What:** All 3 groups write to a single draft key. On load, attempt to parse as correct type; if mismatch, return null (no crash).

**When to use:** `saveXxxDraft` / `loadXxxDraft` functions in `features/minutes/storage.ts`.

**Example:**
```typescript
// Source: existing pattern in features/minutes/storage.ts
const DRAFT_KEY = 'mom_meeting_info_v1'; // D-09: single key

export function saveReporterDraft(info: ReporterInfo): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ _type: 'reporter', ...info }));
}

export function loadReporterDraft(): ReporterInfo | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed._type !== 'reporter') return null; // cross-group guard
    return parsed as ReporterInfo;
  } catch { return null; }
}
```

### Pattern 5: Transcription System Instruction Override (D-12/D-13)

**What:** `transcribeBasic` and `transcribeDeep` in `geminiService.ts` build system prompts from `getAudioPrompt(language)`. D-12 requires per-group context. Current function signatures:

```typescript
transcribeBasic(file, language, customLanguage, loggingContext, userId)
transcribeDeep(file, onProgress, language, customLanguage, loggingContext, userId)
```

**Approach:** Add optional `systemHint?: string` param to both functions. If provided, append to the system prompt. This is a minimal change to `geminiService.ts` and does not break existing callers (default = undefined → existing behavior).

**When to use:** When calling transcription from reporter/officer workflow pages.

**Example:**
```typescript
// Minimal addition to geminiService.ts signature:
transcribeBasic(file, language, customLanguage, loggingContext, userId, systemHint?)

// Per-group hint:
const REPORTER_HINT = 'Đây là phỏng vấn báo chí. Ưu tiên tên người, tổ chức, câu hỏi và câu trả lời.';
const OFFICER_HINT = 'Đây là phiên toà/hội nghị pháp lý. Ưu tiên tên cán bộ, điều luật, và tuyên bố chính thức.';
```

### Pattern 6: /meeting Workflow Cards Page (D-01 to D-03)

**What:** The `/meeting` route currently renders the full monolithic workflow. Phase 9 changes this: `/meeting` shows a group-selection card grid. After user selects a group, navigate to `/reporter`, `/specialist`, or `/officer`.

**Current state:** `App.tsx` line 1234 renders `isNotesRoute && mode === 'notes'` block inline with all steps. The WORKFLOW_CARDS constant (lines 34-38) and `selectedWorkflowMode` state (line 283) already exist.

**Implementation approach:** Replace the inline `/meeting` notes block with a dedicated `MeetingLandingPage` component that renders the group cards. Keep the existing `App.tsx` `/reporter`, `/specialist`, `/officer` routes as-is.

```typescript
// New: components/MeetingLandingPage.tsx
// Renders WORKFLOW_CARDS filtered by user.workflowGroups
// Card click → navigate('/' + group)
// Language selector (D-03 from <specifics>): AudioLanguage selector shown here
```

### Anti-Patterns to Avoid

- **Shared step state in App.tsx:** Do not lift workflow step state into App.tsx. Each workflow page is self-contained.
- **Reusing MeetingInfoForm directly for Reporter/Officer:** D-04 says each group has its own form. Do not add conditional logic to MeetingInfoForm — create separate form components.
- **localStorage key collision without type guard:** D-09 uses single key — always write `_type` discriminator and check on load to avoid deserializing wrong group's data.
- **Hardcoding prompt content:** D-11 says prompt body is a placeholder. Never hardcode the final prompt text as a string literal in the component — always route through a `buildXxxPrompt()` function so it can be swapped.
- **Emoji icons:** Per ui-ux-pro-max skill rules, no emojis as UI icons. Use Lucide React icons only.
- **Alert() for navigation errors:** `WorkflowGuard` currently uses `window.alert()` — do not add more `alert()` calls in new workflow pages. Use inline error states.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Participant list management | Custom linked-list or array management | Extract `ParticipantListEditor` from existing `MeetingInfoForm` | Already handles add/remove/update with IDs, roles, dedup |
| AI transcript summarization | New Gemini API call wrapper | `summarizeTranscript(transcript, customPrompt, loggingContext)` from `geminiService.ts` | Already handles model selection, error handling, logging |
| File upload + transcription | New upload flow | Extract `WorkflowFileUpload` wrapper from `App.tsx` existing implementation | All file state, multi-file support, basic/deep mode already working |
| localStorage draft serialization | Custom encoding | JSON.stringify with `_type` discriminator (see Pattern 4) | Simple, testable, already established pattern |
| Step indicator UI | Custom stepper | Extract `WorkflowStepHeader` from App.tsx steps array pattern | Already renders step labels, active/done states |
| Type-safe form state | Untyped object | TypeScript interfaces (D-08) + controlled inputs | Prevents field name typos and invalid data shapes |

**Key insight:** ~70% of the code for each new workflow page already exists in `App.tsx`'s `/meeting` block. The primary work is extraction and parameterization, not new invention.

---

## Common Pitfalls

### Pitfall 1: SpecialistWorkflowPage Redirect Removal

**What goes wrong:** `SpecialistWorkflowPage` currently does `useEffect(() => navigate('/meeting'), [])`. If this redirect is simply removed without replacing the content, the `/specialist` route renders nothing.

**Why it happens:** Phase 8 used Option B (minimal-touch redirect) as a placeholder — documented in STATE.md.

**How to avoid:** When refactoring `SpecialistWorkflowPage`, first confirm the existing `App.tsx` `/meeting` notes workflow can be fully migrated to it. The specialist workflow is functionally identical to the current `/meeting` flow — it should reuse `MeetingInfoForm` as-is (D-06).

**Warning signs:** `navigate` prop not being passed to `SpecialistWorkflowPage` from App.tsx — check `App.tsx` line 1024.

### Pitfall 2: WorkflowGuard Prop Missing on New Pages

**What goes wrong:** `ReporterWorkflowPage` and `OfficerWorkflowPage` are currently called without props (`<ReporterWorkflowPage />`). After adding `navigate` prop (needed for post-workflow navigation), the call site in App.tsx must be updated.

**Why it happens:** Placeholder components have no props. Phase 8 did not wire navigate prop to reporter/officer pages.

**How to avoid:** When building out the full pages, update both the component interface AND the App.tsx call site simultaneously.

### Pitfall 3: /meeting Route Ownership Conflict

**What goes wrong:** The `/meeting` route currently renders the full workflow inline in `App.tsx`. Phase 9 changes it to a group-selection landing page. If the inline block is removed before the new `MeetingLandingPage` component is wired, direct navigation to `/meeting` breaks.

**Why it happens:** The route is `isNotesRoute && mode === 'notes'` conditional — a surgery operation on App.tsx.

**How to avoid:** Implement `MeetingLandingPage` as a new component first, then swap it in as a single atomic change in App.tsx.

### Pitfall 4: Language Selector Placement (from CONTEXT.md specifics)

**What goes wrong:** D-03 context mentions "Language selector nằm ở bước chọn nhóm" — but `audioLanguage` state currently lives in App.tsx. If the language selector moves to MeetingLandingPage, the language value needs to be passed into the workflow pages.

**Why it happens:** audioLanguage is App.tsx state used by transcription functions.

**How to avoid:** Two options — (a) keep audioLanguage in App.tsx and pass as prop to workflow pages, or (b) move audioLanguage state into each workflow page independently (simpler, no prop drilling). Option (b) is recommended given D-02 (group selected first, then workflow manages its own state).

### Pitfall 5: Single localStorage Key Cross-Group Pollution (D-09)

**What goes wrong:** User fills Reporter form, saves draft. Next session, visits Specialist → `loadMeetingInfoDraft()` returns Reporter's data and tries to populate Specialist form → type mismatch.

**Why it happens:** D-09 mandates single key but types are incompatible.

**How to avoid:** Always write a `_type` discriminator field in the draft object. All load functions check `_type` before returning data; return null if mismatch (silent clear).

### Pitfall 6: geminiService Signature Extension (D-12)

**What goes wrong:** Adding `systemHint` parameter to `transcribeBasic` / `transcribeDeep` in a non-backwards-compatible way breaks existing callers (App.tsx, SpecialistWorkflowPage).

**Why it happens:** TypeScript positional parameters — adding a required middle parameter shifts all subsequent args.

**How to avoid:** Add `systemHint` as the LAST optional parameter, or use a config object pattern `{ language, customLanguage, systemHint }`.

---

## Code Examples

### Verified Pattern: New Type Definitions

```typescript
// ADD to features/minutes/types.ts
// Source: D-08 from 09-CONTEXT.md

export interface ReporterInfo {
  interviewTitle: string;  // Tiêu đề phỏng vấn
  guestName: string;       // Tên khách mời
  reporter: string;        // Phóng viên
  datetime: string;
  location: string;
}

export interface OfficerInfo {
  title: string;                        // Tiêu đề
  presiding: string;                    // Chủ Toạ
  courtSecretary: string;               // Thư ký toà
  participants: MeetingParticipant[];   // reuse existing type
  datetime: string;
  location: string;
}

export type SpecialistInfo = MeetingInfo; // D-08: reuse
```

### Verified Pattern: Controlled Form Component

```typescript
// Source: existing MeetingInfoForm.tsx pattern, adapted for ReporterInfo
// features/workflows/reporter/ReporterInfoForm.tsx

type Props = {
  value: ReporterInfo;
  onChange: (next: ReporterInfo) => void;
  onContinue: () => void;
  onSkip: () => void;
};

export function ReporterInfoForm({ value, onChange, onContinue, onSkip }: Props) {
  const update = (key: keyof ReporterInfo, val: string) =>
    onChange({ ...value, [key]: val });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
      <h3 className="text-xl font-sans font-medium text-slate-800">Thông tin phỏng vấn</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-800">Tiêu đề phỏng vấn</label>
          <input
            value={value.interviewTitle}
            onChange={e => update('interviewTitle', e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none bg-white"
            placeholder="VD: Phỏng vấn CEO công ty ABC"
          />
        </div>
        {/* ... other fields ... */}
      </div>
      <div className="flex gap-4 justify-end pt-4">
        <button onClick={onSkip} className="px-6 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors">
          Bỏ qua
        </button>
        <button onClick={onContinue} className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-sm border border-slate-200">
          Tiếp tục tạo bài
        </button>
      </div>
    </div>
  );
}
```

### Verified Pattern: MeetingLandingPage (Group Card Grid)

```typescript
// Source: WORKFLOW_CARDS + selectedWorkflowMode pattern from App.tsx lines 34-38, 283
// New: components/MeetingLandingPage.tsx

interface Props {
  user: AuthUser;
  navigate: (path: string) => void;
}

export function MeetingLandingPage({ user, navigate }: Props) {
  const availableCards = WORKFLOW_CARDS.filter(c =>
    user.workflowGroups?.includes(c.group)
  );

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-medium text-slate-800">Chọn loại nội dung</h2>
        <p className="text-sm text-slate-500 mt-1">Chọn nhóm làm việc để bắt đầu</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {availableCards.map(card => (
          <button
            key={card.group}
            onClick={() => navigate('/' + card.group)}
            className="flex flex-col gap-2 p-6 border border-slate-200 rounded-xl text-left bg-white
                       hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer"
          >
            <span className="text-base font-medium text-slate-800">{card.label}</span>
            <span className="text-sm text-slate-500">{card.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Verified Pattern: Prompt Builder

```typescript
// Source: features/minutes/prompt.ts buildMinutesCustomPrompt pattern
// New: features/workflows/reporter/reporterPrompt.ts

export function buildReporterPrompt(args: {
  info: ReporterInfo;
  templatePrompt: string;
}): string {
  const infoBlock = {
    interviewTitle: args.info.interviewTitle || null,
    guestName: args.info.guestName || null,
    reporter: args.info.reporter || null,
    datetime: args.info.datetime || null,
    location: args.info.location || null,
  };

  return `Bạn sẽ tạo BÀI PHỎNG VẤN/BÁO CHÍ dựa trên transcript người dùng cung cấp.\n\n` +
    `THÔNG TIN PHỎNG VẤN (JSON - ground truth, ưu tiên hơn transcript):\n` +
    `${JSON.stringify(infoBlock, null, 2)}\n\n---\n\n` +
    `${args.templatePrompt}`;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All workflows in one App.tsx `/meeting` block | Separate page component per group | Phase 9 (now) | Cleaner separation, independent state |
| Single `MeetingInfo` type for all groups | Per-group types: ReporterInfo, SpecialistInfo (= MeetingInfo), OfficerInfo | Phase 9 (now) | Type safety, no optional field sprawl |
| SpecialistWorkflowPage redirects to /meeting | SpecialistWorkflowPage contains full workflow | Phase 9 (now) | Eliminates redirect hack from Phase 8 |
| Uniform transcription system prompt | Per-group system prompt hints via optional param | Phase 9 (now) | Better AI accuracy per context |

**Deprecated/outdated:**
- `SpecialistWorkflowPage` redirect-only pattern: replaced by full workflow embed
- Inline WORKFLOW_CARDS + selectedWorkflowMode in App.tsx: moved to `MeetingLandingPage` component
- Single `MeetingInfoForm` serving all groups: reporter/officer get dedicated form components

---

## Open Questions

1. **Specialist form: `companyAddress` field fate (D-06)**
   - What we know: D-06 says specialist "giữ form hiện tại" with label changes. `MeetingInfoForm` has `companyAddress` field (label "Địa chỉ doanh nghiệp").
   - What's unclear: D-06 only mentions renaming `companyName` → "Tiêu đề cuộc họp". Is `companyAddress` renamed too (e.g., "Địa điểm") or removed?
   - Recommendation: Treat `companyAddress` as "Địa điểm" (rename label only) since specialist form has both datetime and location — this avoids removing an existing storage field.

2. **Language selector placement (from CONTEXT.md specifics)**
   - What we know: User mockup shows language selector at the group-selection step (MeetingLandingPage).
   - What's unclear: Does the selected language persist to workflow pages as a prop, or is it re-selectable within each workflow page?
   - Recommendation: Add `audioLanguage` state to each workflow page independently (not passed from MeetingLandingPage). Simpler, no prop drilling. Default to `'vi'` (existing behavior).

3. **Email recipients in Reporter/Officer forms**
   - What we know: `MeetingInfoForm` includes `EmailRecipientsInput` for specialist. D-05 and D-07 don't mention email recipients.
   - What's unclear: Should reporter/officer workflows include email sending capability?
   - Recommendation: Omit email recipients from Reporter and Officer forms in Phase 9. Can be added in a later phase. Keep email functionality specialist-only for now.

4. **Placeholder AI template prompts (D-11)**
   - What we know: D-11 says "prompt nội dung sẽ do user cung cấp sau".
   - What's unclear: Should the phase build a UI for the user to edit the template prompt (like the current `showPromptEditor` in App.tsx), or just use hardcoded placeholders?
   - Recommendation: Include a collapsible "Tùy chỉnh prompt" editor (same `showPromptEditor` pattern from App.tsx) in each workflow page. Pre-fill with a sensible but clearly labeled placeholder per group.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 9 is purely frontend UI code changes. No new external dependencies, CLI tools, databases, or services are required. All dependencies (React, Tailwind, geminiService, lucide-react) are already installed and verified in `package.json`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm run test:unit -- --run` |
| Full suite command | `npm run test:all` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-08 | ReporterInfo / OfficerInfo types serialize/deserialize correctly | unit | `npm run test:unit -- features/minutes/storage.test.ts` | Partial (storage.test.ts exists, needs new cases) |
| D-09 | Single localStorage key: saves with `_type`, loads only correct type | unit | `npm run test:unit -- features/minutes/storage.test.ts` | Partial (needs new cases for _type guard) |
| D-10/D-11 | buildReporterPrompt / buildOfficerPrompt include info block in output | unit | `npm run test:unit -- features/workflows/reporter/reporterPrompt.test.ts` | No — Wave 0 gap |
| D-03 | MeetingLandingPage renders only cards for user's workflowGroups | unit | `npm run test:unit -- components/MeetingLandingPage.test.tsx` | No — Wave 0 gap |
| D-05 | ReporterInfoForm renders all 5 required fields | unit | `npm run test:unit -- features/workflows/reporter/ReporterInfoForm.test.tsx` | No — Wave 0 gap |
| D-07 | OfficerInfoForm renders title, presiding, courtSecretary, participants, datetime, location | unit | `npm run test:unit -- features/workflows/officer/OfficerInfoForm.test.tsx` | No — Wave 0 gap |

### Sampling Rate

- **Per task commit:** `npm run test:unit -- --run` (quick, < 30s)
- **Per wave merge:** `npm run test:all`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `features/workflows/reporter/reporterPrompt.test.ts` — covers D-10 (prompt builder output)
- [ ] `features/workflows/officer/officerPrompt.test.ts` — covers D-10 (prompt builder output)
- [ ] `components/MeetingLandingPage.test.tsx` — covers D-01/D-03 (card filtering by workflowGroups)
- [ ] `features/workflows/reporter/ReporterInfoForm.test.tsx` — covers D-05 (field presence)
- [ ] `features/workflows/officer/OfficerInfoForm.test.tsx` — covers D-07 (field presence)
- [ ] Storage test additions in `features/minutes/storage.test.ts` — new cases for `_type` guard and ReporterInfo/OfficerInfo round-trip

---

## Project Constraints (from CLAUDE.md)

No `CLAUDE.md` found in project root. No project-level directives to propagate.

**Inferred from project conventions (STATE.md decisions):**
- Use `it.todo()` for vitest stubs, not `xit` or empty `it()`
- No `vi.mock()` of modules without `import` decoupling
- `tx: any` cast acceptable for postgres.js TransactionSql
- `useState` + controlled inputs for all form state (no Redux/Zustand)
- Tailwind CSS with `slate` / `indigo` color palette
- Auto-save draft with `useEffect` on value change (pattern from MeetingInfoForm)
- EmailSettingsSection defined as standalone function before App() — apply same pattern for new standalone components
- No `window.alert()` in new pages (use inline error states)
- No emojis as UI icons — use Lucide React SVG icons only (from ui-ux-pro-max skill)

---

## Sources

### Primary (HIGH confidence)

- `features/minutes/components/MeetingInfoForm.tsx` — reference implementation for form pattern, participant list, controlled inputs, auto-save draft
- `features/minutes/types.ts` — MeetingInfo, MeetingParticipant types
- `features/minutes/storage.ts` — localStorage draft pattern
- `features/minutes/prompt.ts` — buildMinutesCustomPrompt pattern
- `features/workflows/types.ts` — WorkflowGroup, WORKFLOW_GROUPS, VALID_WORKFLOW_GROUPS
- `features/workflows/WorkflowGuard.tsx` — route guard pattern
- `features/workflows/GroupSwitcher.tsx` — group switching API call pattern
- `App.tsx` lines 34-38, 283, 995, 1011-1037, 1234+ — WORKFLOW_CARDS, route structure, existing /reporter /specialist /officer wiring
- `services/geminiService.ts` — transcribeBasic, transcribeDeep, summarizeTranscript signatures
- `.planning/phases/09-ui-revamp-website-va-giao-dien-tung-nhom-tinh-nang/09-CONTEXT.md` — all locked decisions
- `.planning/STATE.md` — Phase 8 established patterns and pitfalls
- `.cursor/skills/ui-ux-pro-max/SKILL.md` — UI conventions, pre-delivery checklist

### Secondary (MEDIUM confidence)

- ui-ux-pro-max design system query output: recommended indigo primary (#6366F1), slate palette, Plus Jakarta Sans, cursor-pointer on cards, 150-300ms transitions
- ui-ux-pro-max UX guidelines: step indicators for multi-step flow, loading → success/error feedback, form labels required

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json, no new dependencies
- Architecture: HIGH — patterns directly extracted from existing codebase canonical files
- Pitfalls: HIGH — sourced from actual code inspection (App.tsx, SpecialistWorkflowPage, storage.ts)
- Type definitions: HIGH — directly from CONTEXT.md D-08 with exact field names
- Prompt patterns: HIGH — directly modeled on existing buildMinutesCustomPrompt

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable patterns, no fast-moving external deps)
