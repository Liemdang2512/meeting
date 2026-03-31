---
phase: 05-text-mindmap-checklist
verified: 2026-03-17T10:40:00Z
status: human_needed
score: 8/8 must-haves verified
re_verification:
  previous_status: human_needed
  previous_score: 5/5
  gaps_closed: []
  gaps_remaining: []
  regressions: []
  new_scope: "Plan 06 (MINDMAP-ICON-01) added to verification scope"
human_verification:
  - test: "Text paste to mindmap canvas — icons visible on branch nodes"
    expected: "User pastes text, clicks 'Tạo mindmap', sees canvas with root node (no icon) + branch nodes each displaying a semi-transparent 40px lucide-react SVG icon in the background; expand/collapse, zoom and pan all work."
    why_human: "React Flow rendering, icon SVG display at 0.15 opacity, and interactive expand/collapse require a browser environment to verify visually."
  - test: "Checklist persistence across refresh"
    expected: "User clicks 'Tạo checklist từ nội dung', sees hierarchical checklist, ticks one item, refreshes the page, checklist and tick state are still present."
    why_human: "localStorage persistence across page reload requires browser runtime."
  - test: "File upload flow"
    expected: "User clicks 'Tải file text', selects a .txt file from disk. Text appears in textarea. Both mindmap (with icons) and checklist generation work on the file content."
    why_human: "FileReader API requires a real browser environment."
  - test: "Token usage logging in admin panel"
    expected: "After generating mindmap or checklist with a logged-in user, token usage records appear in the admin panel with feature='Mindmap & Checklist' and correct action type labels."
    why_human: "Requires live Gemini API key, logged-in session, and admin panel access."
  - test: "Icon fallback for unknown iconKey"
    expected: "If Gemini returns an iconKey not in the 30-key whitelist, the node still renders with a Circle icon at 0.15 opacity rather than crashing."
    why_human: "Requires a crafted Gemini response or mock scenario in the browser to trigger the fallback path."
---

# Phase 05: Text to Mindmap & Checklist (+ Plan 06 Icon Feature) — Verification Report

**Phase Goal:** Thêm feature mới trong `features/mindmap/`: (1) từ text (file/paste) → gọi Gemini structured output → cây mindmap → render bằng @xyflow/react với custom node, expand/collapse kiểu NotebookLM; (2) sinh checklist phân cấp từ text (hoặc từ mindmap) qua Gemini, data model flat, lưu localStorage, UI tick + expand/collapse. PLUS plan 06 (MINDMAP-ICON-01): icon ngữ cảnh lucide-react SVG vào mindmap nodes (iconKey từ whitelist 30 key, opacity 15%, 40px, depth > 0 chỉ).
**Verified:** 2026-03-17T10:40:00Z
**Status:** human_needed — all automated checks pass; 5 items require browser/runtime verification
**Re-verification:** Yes — previous score 5/5 (plan 05 only); now expanded to cover plan 06 (MINDMAP-ICON-01)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Text → Gemini structured output → MindmapNode tree (3-level, Zod-validated) | VERIFIED | `generateStructured` in `services/geminiService.ts` uses `responseMimeType: 'application/json'` + `zodToJsonSchema`; `useMindmapFromText` calls it with `MindmapResponseSchema`; `toMindmapTree` converts to tree. 5/5 hook tests pass. |
| 2 | MindmapCanvas renders tree as React Flow graph with expand/collapse | VERIFIED | `MindmapCanvas.tsx` uses `@xyflow/react` with custom `'mindmap'` node type, `Controls`, `ReactFlowProvider`, and `collapsed` Set driving `buildBidirectionalLayout()`. Toggle wired via `handleToggle` injected into each node's `data.onToggle`. |
| 3 | Checklist generated from text via Gemini, flat data model, localStorage persistence | VERIFIED | `useChecklistFromText` calls `generateStructured` with `ChecklistResponseSchema`. `useChecklistStorage` reads/writes localStorage keyed by `documentId`. 7/7 storage tests pass. |
| 4 | `/mindmap` route wired, lazy-loaded, nav tab present | VERIFIED | `App.tsx`: lazy import of `MindmapPage`, `isMindmapRoute` detection, nav button "Sơ đồ tư duy", and conditional render. |
| 5 | All Gemini calls log tokens with feature `'mindmap'` and correct actionTypes | VERIFIED | `types.ts` has `'mindmap'` in `TokenUsageFeature`, `'mindmap-generate'` and `'checklist-generate'` in `TokenUsageActionType`. Both hooks pass correct `loggingContext` to `generateStructured`. |
| 6 | Mindmap nodes (depth > 0) display a lucide-react SVG icon as background | VERIFIED | `MindmapCanvas.tsx` lines 109–111: `const IconComponent = !isCenter && d.iconKey ? (ICON_MAP[d.iconKey] ?? DEFAULT_ICON) : null`. Lines 166–180: `{IconComponent && <div style={{...opacity:0.15...}}><IconComponent size={40} /></div>}`. Root node excluded via `isCenter` guard. |
| 7 | Gemini receives iconKey whitelist with 30 keys in prompt | VERIFIED | `useMindmapFromText.ts` `buildMindmapPrompt()` lines 23–30: ICON RULE section with all 30 keys + "list" as default fallback. Example JSON in prompt includes `iconKey` for branch and sub-branch nodes. |
| 8 | Icon fallback to Circle when iconKey not in ICON_MAP | VERIFIED | `MindmapCanvas.tsx` line 78: `const DEFAULT_ICON: LucideIcon = Circle`. Line 110: `ICON_MAP[d.iconKey] ?? DEFAULT_ICON`. ICON_MAP has exactly 30 entries ('tool' key mapped to `Wrench` due to lucide-react v0.577 removal). |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `features/mindmap/lib/mindmapSchema.ts` | Zod schemas + `iconKey` in Branch/Branch2 + `MindmapNode.iconKey` + `toMindmapTree` passes iconKey | VERIFIED | 103 lines. `Branch2Schema` line 11: `iconKey: z.string().optional()`. `BranchSchema` line 19: same. `MindmapNode` line 69: `iconKey?: string`. `toMindmapTree` lines 90, 96: passes `branch.iconKey` and `sub.iconKey`. |
| `features/mindmap/hooks/useMindmapFromText.ts` | `buildMindmapPrompt` updated with ICON RULE + 30 whitelist keys | VERIFIED | 96 lines. Lines 23–30: ICON RULE section with 30 keys. Line 33: example JSON with `iconKey` fields. |
| `features/mindmap/components/MindmapCanvas.tsx` | `ICON_MAP` (30 keys), `DEFAULT_ICON`, `iconKey` in `MindmapNodeData`, icon background div rendered, `iconKey` passed in `layoutSubtree` | VERIFIED | 499 lines. Lines 45–76: ICON_MAP with 30 entries. Line 78: `DEFAULT_ICON = Circle`. Line 92: `iconKey?: string` in interface. Lines 109–111: icon lookup. Lines 166–180: background render. Line 298: `iconKey: node.iconKey` in layoutSubtree data. |
| `package.json` | `lucide-react` in dependencies | VERIFIED | `"lucide-react": "^0.577.0"` present. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `mindmapSchema.ts` | `MindmapCanvas.tsx` | `MindmapNode.iconKey` passed through `toMindmapTree` → `layoutSubtree` → node data | WIRED | `toMindmapTree` outputs `iconKey` on branch nodes (lines 90, 96). `layoutSubtree` reads `node.iconKey` at line 298. `MindmapNodeComponent` reads `d.iconKey` at line 109. Full chain verified. |
| `useMindmapFromText.ts` | Gemini API | Prompt contains `iconKey` whitelist and instruction | WIRED | Lines 24–29: `ICON RULE` block with 30-key whitelist. Line 33: example JSON demonstrates `iconKey` in branches. Gemini call at line 74 passes this prompt. |
| `useMindmapFromText` | `generateStructured` | import + call with `MindmapResponseSchema` | WIRED | Line 2: import. Line 74: `await generateStructured(prompt, MindmapResponseSchema, loggingContext, userId)`. |
| `useChecklistFromText` | `generateStructured` | import + call with `ChecklistResponseSchema` | WIRED | Verified in previous run; unchanged by plan 06. |
| `MindmapPage` | `useMindmapFromText` + `MindmapCanvas` | import + render | WIRED | Verified in previous run; unchanged by plan 06. |
| `App.tsx` | `MindmapPage` | lazy import + route + nav | WIRED | Verified in previous run; unchanged by plan 06. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| MINDMAP-ICON-01 | 05-06-PLAN.md | Icon ngữ cảnh lucide-react SVG vào mindmap nodes (iconKey từ whitelist 30 key, opacity 15%, 40px, depth > 0 chỉ) | SATISFIED | `ICON_MAP` with 30 entries, `DEFAULT_ICON = Circle`, `!isCenter && d.iconKey` guard, `opacity: 0.15`, `size={40}`, all verified in `MindmapCanvas.tsx`. Gemini prompt updated with ICON RULE. Schema passes `iconKey` through chain. |
| (implicit) MINDMAP base feature | 05-PLAN.md | Text→mindmap, checklist, localStorage, token logging, nav route | SATISFIED | Verified in previous run (5/5 truths). Unchanged by plan 06. |

No REQUIREMENTS.md file exists in `.planning/`. Requirements are tracked in PLAN.md frontmatter only. No orphaned requirement IDs found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `MindmapCanvas.tsx` | 271 | `onToggle: () => {}` in root node data (inside `buildBidirectionalLayout`) | INFO | Placeholder in intermediate build; immediately overwritten in the `useMemo` at lines 447–453 before nodes are passed to React Flow. No functional impact. |

No blocker or warning anti-patterns found. The empty `onToggle` in the root node push is a documented pattern — the callback is injected in a subsequent `useMemo` pass.

---

### Unit Test Results

| Test File | Tests | Status |
|-----------|-------|--------|
| `features/mindmap/__tests__/generateStructured.test.ts` | 4/4 | PASS |
| `features/mindmap/__tests__/useMindmapFromText.test.ts` | 5/5 | PASS |
| `features/mindmap/__tests__/useChecklistStorage.test.ts` | 7/7 | PASS |
| `features/pricing/__tests__/QuotaBadge.test.tsx` | 3 failing | OUT OF SCOPE (Phase 06 component) |

All 16 Phase 05 mindmap unit tests pass. The 3 failing tests in `QuotaBadge.test.tsx` are Phase 06 scope and do not affect this phase's goal achievement.

`npx tsc --noEmit` exits clean — no TypeScript errors.

---

### Human Verification Required

#### 1. Text paste to mindmap canvas (with icons)

**Test:** Open `/mindmap`, paste a paragraph of text (e.g., a meeting summary), click "Tạo mindmap".
**Expected:** React Flow canvas appears with a root node (center, no icon background), multiple branch nodes each showing a semi-transparent 40px lucide-react SVG icon as a watermark behind the node label text. Clicking any node with children collapses/expands it. Zoom in/out and pan work.
**Why human:** React Flow rendering, icon SVG display at 0.15 opacity, and interactive expand/collapse are visual/interactive behaviors not verifiable by static analysis.

#### 2. Checklist persistence across page refresh

**Test:** From the same or new text input, click "Tạo checklist từ nội dung". Tick one checklist item. Refresh the page (F5). Navigate back to `/mindmap` and switch to the Checklist tab.
**Expected:** The checklist with the previously ticked item still appears — tick state persisted via localStorage.
**Why human:** localStorage persistence across navigation requires browser runtime.

#### 3. File upload flow

**Test:** Click "Tải file text", select a `.txt` file from disk. Verify text appears in the textarea. Then generate both mindmap (verify icons appear on branches) and checklist from the file content.
**Expected:** File content populates the textarea (truncated at 50k chars if large). Mindmap branch nodes display contextual icons. Both features work with file-sourced text.
**Why human:** FileReader API requires a real browser environment.

#### 4. Token usage logging in admin panel

**Test:** With a Gemini API key configured and a logged-in user, generate a mindmap. Navigate to the admin token usage panel.
**Expected:** A record appears with feature "Mindmap & Checklist" and action type "Tạo mindmap" (or "Tạo checklist" for checklist generation), with non-zero token counts.
**Why human:** Requires live Gemini API, active session, and admin access.

#### 5. Icon fallback behavior

**Test:** Inspect or mock a Gemini response that returns an `iconKey` value not in the 30-key whitelist (e.g., `"xyz"`). Verify the node renders with a Circle icon rather than crashing.
**Expected:** Circle SVG appears at 0.15 opacity as fallback. No JavaScript error in console.
**Why human:** Requires either a crafted mock or intentional manipulation of the Gemini response to trigger the `DEFAULT_ICON` path.

---

### Gaps Summary

No gaps found. All automated checks pass:

**Plan 05 (original):**
- All 10 feature files exist at planned paths with substantive implementations.
- All key wiring connections verified (hooks → `generateStructured`, page → components, route in `App.tsx`).
- 16/16 unit tests pass across 3 test files.
- `npx tsc --noEmit` exits clean.
- Dependencies `zod`, `zod-to-json-schema`, `@xyflow/react` present in `package.json`.
- Token type system extended: `'mindmap'` feature, `'mindmap-generate'`/`'checklist-generate'` action types, Vietnamese labels.

**Plan 06 (MINDMAP-ICON-01):**
- `lucide-react@^0.577.0` installed in `package.json`.
- `Branch2Schema` and `BranchSchema` have `iconKey: z.string().optional()`.
- `MindmapNode` interface has `iconKey?: string`.
- `toMindmapTree` passes `iconKey` for both branch and sub-branch nodes.
- `ICON_MAP` has exactly 30 entries; `'tool'` key mapped to `Wrench` (correct — `Tool` removed in lucide-react v0.577).
- `DEFAULT_ICON = Circle` fallback implemented and wired.
- `MindmapNodeData.iconKey?: string` field added.
- Icon background rendered with `position: absolute`, `right: 6`, `top: 50%`, `transform: translateY(-50%)`, `opacity: 0.15`, `pointerEvents: none`, `<IconComponent size={40} />`.
- Root node exclusion via `!isCenter && d.iconKey` guard.
- `iconKey: node.iconKey` passed in `layoutSubtree` at line 298.
- Gemini prompt `buildMindmapPrompt` contains ICON RULE section with all 30 whitelist keys and example JSON.
- `npx tsc --noEmit` exits clean after plan 06 changes.
- All 16 Phase 05 unit tests still pass (iconKey is optional — no existing mocks broken).
- Commits 8e23e5a, a376da9, e8e8295 verified to exist in git history.

The 5 outstanding items are human verification checks requiring a live browser, Gemini API key, and/or admin session.

---

_Verified: 2026-03-17T10:40:00Z_
_Verifier: Claude (gsd-verifier)_
