# Phase 05: Text → Mindmap & Checklist — Plan

**Phase:** 05-text-mindmap-checklist  
**Nguồn:** 05-RESEARCH.md  
**Mục đích:** Một PLAN.md thống nhất để execute phase (gsd-executor hoặc dev thủ công).

---

## Mục lục

1. [Goal & Done criteria](#goal--done-criteria)
2. [Task breakdown](#task-breakdown)
3. [Dependency graph](#dependency-graph)
4. [Implementation notes](#implementation-notes)
5. [Rủi ro & Mitigation](#rủi-ro--mitigation)
6. [Verification](#verification)

---

## Goal & Done criteria

**Goal:** Thêm feature mới trong `features/mindmap/`: (1) từ text (file/paste) → gọi Gemini structured output → cây mindmap → render bằng @xyflow/react với custom node, expand/collapse kiểu NotebookLM; (2) sinh checklist phân cấp từ text (hoặc từ mindmap) qua Gemini, data model flat, lưu localStorage, UI tick + expand/collapse.

**Done criteria (có thể kiểm tra):**

- User upload file text hoặc paste text → nhấn "Tạo mindmap" → thấy sơ đồ tư duy (root + nhánh chính + nhánh con), có nút expand/collapse từng nút, zoom/pan hoạt động.
- User nhấn "Tạo checklist từ nội dung" (hoặc từ mindmap) → thấy danh sách công việc phân cấp, tick hoàn thành, expand/collapse; refresh trang → checklist vẫn còn (localStorage).
- Mọi gọi Gemini trong feature đều log token qua `tokenUsageService` với feature `mindmap`, actionType `mindmap-generate` hoặc `checklist-generate`.
- `npm test` pass; có unit test cho `generateStructured`, hook `useMindmapFromText`, `useChecklistStorage`; smoke test UI (upload/paste → mindmap + checklist) có thể chạy thủ công hoặc E2E nếu có.

---

## Task breakdown

| Id   | Mô tả ngắn | Phụ thuộc |
|------|------------|------------|
| **T1** | Cập nhật `types.ts`: thêm `TokenUsageFeature` `'mindmap'`, `TokenUsageActionType` `'mindmap-generate'` \| `'checklist-generate'`; cập nhật `features/token-usage-admin/labels.ts` với label tương ứng. | — |
| **T2** | Cài dependency: `zod`, `zod-to-json-schema`, `@xyflow/react`. | — |
| **T3** | Mở rộng `services/geminiService.ts`: thêm `generateStructured<T>(prompt, zodSchema, loggingContext?, userId?)` — gọi Gemini với `responseMimeType: "application/json"`, `responseJsonSchema` từ `zodToJsonSchema(schema)`, parse + validate bằng Zod, log token giống `runTextAgent`. | T1 |
| **T4** | Tạo `features/mindmap/lib/mindmapSchema.ts`: Zod schema mindmap (root + nhánh, giới hạn 3 cấp theo RESEARCH), schema checklist (array item có label, children hoặc flat với parentLabel). Export type inferred từ schema. | T2 |
| **T5** | Tạo hook `features/mindmap/hooks/useMindmapFromText.ts`: nhận `text`, gọi `generateStructured` với prompt + mindmap schema, trả về tree (MindmapNode) + loading + error. Prompt nêu rõ "Chỉ trả về JSON, tối đa 3 cấp: trung tâm → nhánh chính → nhánh con". Strip ```json nếu Gemini trả về markdown wrapper. | T3, T4 |
| **T6** | Tạo `features/mindmap/components/MindmapCanvas.tsx`: wrapper React Flow, custom node (label + nút expand ">"), map tree → nodes + edges, state expanded điều khiển hiển thị nhánh con. Tham khảo [React Flow mind map tutorial](https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow) và [expand-collapse](https://reactflow.dev/examples/layout/expand-collapse). | T2, T4 |
| **T7** | Tạo type `ChecklistItem` (id, parentId, label, completed, order) trong `features/mindmap/` (hoặc types.ts nếu dùng chung). Tạo hook `useChecklistFromText.ts`: input text (hoặc JSON mindmap), gọi `generateStructured` với checklist schema, chuyển kết quả thành flat list (gán id, parentId, order). Log với actionType `checklist-generate`. | T3, T4 |
| **T8** | Tạo hook `useChecklistStorage.ts`: key localStorage cố định (ví dụ `mindmap_checklist_{documentId}`), load/save `ChecklistItem[]`, toggle completed, (optional) reorder. Không gọi Supabase trong phase này; có thể chuẩn bị interface để sau thêm sync. | — |
| **T9** | Tạo `ChecklistList.tsx`: render tree từ flat list (nhóm theo parentId, sort order), tick checkbox, expand/collapse theo cấp; dùng state từ `useChecklistStorage`. | T7, T8 |
| **T10** | Tạo `MindmapPage.tsx`: input (upload file text / textarea paste), giới hạn độ dài text (ví dụ 50k ký tự) theo RESEARCH; tab hoặc section "Mindmap" / "Checklist"; nút "Tạo mindmap" → useMindmapFromText → MindmapCanvas; nút "Tạo checklist từ nội dung" (và optional "Từ mindmap") → useChecklistFromText → lưu qua useChecklistStorage → ChecklistList. | T5, T6, T7, T8, T9 |
| **T11** | Đăng ký route `/mindmap` (hoặc tương đương) trong `App.tsx`, lazy-load `MindmapPage`; thêm nav tab "Mindmap" (hoặc "Sơ đồ tư duy") trong header. | T10 |
| **T12** | Unit test: `generateStructured` với mock response JSON; `useMindmapFromText` (mock geminiService) parse tree đúng; `useChecklistStorage` load/save/toggle với mock localStorage. Test MindmapCanvas render với tree mẫu (ít node) nếu cần. | T3, T5, T8 |
| **T13** | Smoke verify: chạy app, vào trang mindmap, paste text ngắn → Tạo mindmap → thấy canvas có node; Tạo checklist → tick + refresh → checklist còn. | T11 |

---

## Dependency graph

```
T1 ──┬──► T3 ──┬──► T5 ──┬──► T10 ──► T11 ──► T13
     │         │         │
T2 ──┼─────────┼─────────┼──► T4 ──┬──► T5
     │         │         │         ├──► T6
     │         │         │         └──► T7 ──► T9
     │         │         │
     │         │         └──► T6 (T2,T4)
     │         │
     │         └──► T7 ──► T9
     │
T8 ──┴─────────────────────────────► T9 ──► T10

T12 phụ thuộc: T3, T5, T8 (có thể chạy sau khi T3,T5,T8 xong).
```

**Thứ tự thực hiện gợi ý (không vi phạm phụ thuộc):**

1. **Wave 1 (song song):** T1, T2, T8  
2. **Wave 2:** T3 (sau T1), T4 (sau T2)  
3. **Wave 3:** T5 (sau T3, T4), T6 (sau T2, T4), T7 (sau T3, T4)  
4. **Wave 4:** T9 (sau T7, T8)  
5. **Wave 5:** T10 (sau T5, T6, T7, T8, T9)  
6. **Wave 6:** T11 (sau T10), T12 (sau T3, T5, T8)  
7. **Wave 7:** T13 (sau T11)

---

## Implementation notes

(Các gợi ý cụ thể từ 05-RESEARCH.md.)

### Stack & không hand-roll

- **Structured output:** Luôn dùng Gemini `responseMimeType: "application/json"` + `responseJsonSchema` (Zod → zodToJsonSchema). Không parse Gemini text bằng regex/split.
- **Mindmap render:** Dùng @xyflow/react (custom node, expand/collapse). Không tự vẽ SVG/canvas layout từ đầu.
- **Schema:** Zod + zodToJsonSchema làm single source cho schema và runtime parse.

### Mindmap schema (Zod, giới hạn 3 cấp)

- Root: `{ root: { id?, label, children: Branch[] } }`.
- Branch: `{ id?, label, children?: Branch2[] }` (cấp 2).
- Branch2: `{ id?, label }` (cấp 3, không children hoặc empty).
- Trong prompt: "Tối đa 3 cấp: trung tâm → nhánh chính → nhánh con. Chỉ trả về JSON, không thêm text."

### Checklist

- Data model flat: `id`, `parentId` (string | null), `label`, `completed`, `order`.
- localStorage key: ví dụ `mindmap_checklist_${documentId}` hoặc `mindmap_checklist_default` cho một phiên.
- Phase này chỉ localStorage; có thể định nghĩa interface/schema Supabase (`checklist_items`) để phase sau bật sync.

### Cấu trúc thư mục (RESEARCH)

```
features/mindmap/
├── components/
│   ├── MindmapCanvas.tsx
│   └── ChecklistList.tsx
├── hooks/
│   ├── useMindmapFromText.ts
│   ├── useChecklistFromText.ts
│   └── useChecklistStorage.ts
├── lib/
│   └── mindmapSchema.ts
└── MindmapPage.tsx
```

- `services/geminiService.ts`: thêm `generateStructured`.
- `types.ts`: thêm feature `'mindmap'`, actionType `'mindmap-generate'` | `'checklist-generate'`.

### Gemini prompt & pitfalls

- Prompt: nhắc "Chỉ trả về JSON, không thêm markdown hay giải thích." Sau khi nhận, nếu có ```json ... ``` thì strip rồi `JSON.parse`.
- Giới hạn độ dài input: ví dụ 50k ký tự để tránh token cost cao (có thể truncate hoặc cảnh báo).

---

## Rủi ro & Mitigation

| Rủi ro | Mitigation |
|--------|------------|
| **Token cost** (text dài → input lớn) | Giới hạn độ dài text (ví dụ 50k ký tự) hoặc hiển thị cảnh báo; có thể truncate trước khi gửi Gemini. |
| **Schema quá sâu** (Gemini từ chối) | Giới hạn depth 3 cấp trong schema và prompt; dùng schema cố định 3 cấp thay vì recursive sâu. |
| **Gemini trả về JSON lẫn markdown** | Prompt nêu rõ "Chỉ trả về JSON"; client strip code block rồi parse. |
| **Quên log token** | Mọi gọi Gemini trong mindmap/checklist đều truyền `TokenLoggingContext` + `userId` vào `generateStructured`; `generateStructured` gọi `logTokenUsage` giống `runTextAgent`. |

---

## Verification

- **Unit test (T12):**
  - `generateStructured`: mock Gemini response (JSON string), gọi với schema đơn giản, assert parsed object đúng và (nếu có) logTokenUsage được gọi.
  - `useMindmapFromText`: mock `geminiService.generateStructured`, cho text mẫu → assert tree structure và state loading/error.
  - `useChecklistStorage`: mock `localStorage`, load/save/toggle → assert persistence và cập nhật state.
- **Smoke (T13):** Chạy `npm run dev`, vào `/mindmap`, paste đoạn text → "Tạo mindmap" → thấy canvas với node; "Tạo checklist từ nội dung" → thấy checklist, tick một mục, refresh → checklist và trạng thái tick còn.
- **Build & test:** `npm run build` thành công; `npm test` pass (bao gồm test mới cho phase này).

---

*Kết thúc plan. Execute theo thứ tự wave hoặc theo dependency graph; mỗi task có thể implement độc lập miễn là dependencies đã xong.*
