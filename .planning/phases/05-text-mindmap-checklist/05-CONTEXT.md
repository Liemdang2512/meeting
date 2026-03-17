# Phase 5: text-mindmap-checklist - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning (replan)

<domain>
## Phase Boundary

Cải thiện feature mindmap hiện có: thêm **icon ngữ cảnh** (SVG lucide-react) vào các node mindmap để người dùng dễ hình dung nội dung hơn. Gemini chọn icon phù hợp từ whitelist và trả về trong structured output. Feature checklist (hooks/components đã tồn tại) không nằm trong scope replan này.

</domain>

<decisions>
## Implementation Decisions

### Icon type
- Dùng **SVG icon từ lucide-react** (cần `npm install lucide-react`)
- Không dùng emoji (quá informal) hay color-coding-only (đã có sẵn)

### Icon assignment — Gemini chọn từ whitelist
- Gemini trả về `iconKey` trong structured output của mỗi node
- Whitelist **~30 key** được định nghĩa trước trong prompt (vd: `briefcase`, `alert-triangle`, `dollar-sign`, `check-circle`, `users`, `target`, `clock`, `file-text`, `settings`, `zap`, `shield`, `trending-up`, `map`, `list`, `message-circle`, `calendar`, `database`, `lock`, `star`, `flag`, `package`, `tool`, `globe`, `heart`, `eye`, `bar-chart`, `layers`, `link`, `search`, `upload`)
- Prompt nêu rõ danh sách key được phép — Gemini chọn key phù hợp nhất với nội dung node

### Icon scope
- **Tất cả node trừ root** nhận icon (nhánh cấp 1 + nhánh con cấp 2+)
- Root node (chủ đề trung tâm) không có icon — là tiêu đề thuần văn bản

### Icon fallback
- Nếu Gemini trả về key không tồn tại trong whitelist hoặc không map được → dùng **icon mặc định** (vd: `Circle` hoặc `Tag` từ lucide-react)
- Không bỏ trống, không hiển thị text abbreviation

### Icon position — background mờ
- Icon hiển thị dạng **nền mờ** (low opacity, vd: 15–20%) phía sau label text trong node card
- Icon to, centered, không chèn vào flow text

### Schema thay đổi
- Thêm trường `iconKey?: string` vào Zod schema cho Branch và Branch2 (cấp 1 và cấp 2)
- Gemini prompt cập nhật để request `iconKey` từ whitelist cùng với `label`

### Claude's Discretion
- Chọn opacity cụ thể cho icon background (trong khoảng 10–20%)
- Chọn icon size (trong khoảng 32–48px)
- Cách render lucide icon dynamic từ key string (vd: dynamic import hoặc icon map object)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `features/mindmap/lib/mindmapSchema.ts`: Zod schemas đã có (MindmapResponseSchema, ChecklistResponseSchema, toMindmapTree). Cần thêm `iconKey?: string` vào BranchSchema và Branch2Schema.
- `features/mindmap/components/MindmapCanvas.tsx` (258 dòng): Custom node component với depth-based colors, expand/collapse, bilateral layout. Cần cập nhật `MindmapNodeData` để nhận `iconKey` và render icon background.
- `features/mindmap/hooks/useMindmapFromText.ts`: Gọi `generateStructured` với MindmapResponseSchema và prompt. Cần cập nhật prompt để request iconKey.
- `services/geminiService.ts`: `generateStructured<T>()` đã có, dùng Gemini JSON structured output + Zod + token logging.
- `features/mindmap/MindmapPage.tsx` (110 dòng): Chỉ có mindmap (không có checklist tab). Không cần thay đổi page structure cho replan này.

### Existing Dependencies
- `@xyflow/react@12.10.1`: Đã install, dùng cho mindmap canvas
- `zod@4.3.6` + `zod-to-json-schema@3.25.1`: Đã install, dùng cho structured output
- `html-to-image` + `jspdf`: Đã install, MindmapCanvas có export PNG/PDF (giữ nguyên)
- **`lucide-react`**: CHƯA có — cần install

### Established Patterns
- Gemini structured output: `responseMimeType: "application/json"` + `zodToJsonSchema(schema)` + Zod parse
- Token logging: mọi call Gemini đều truyền `TokenLoggingContext` với feature `'mindmap'`
- Tailwind CSS + indigo color scheme nhất quán
- State management: useState/useCallback trong hooks (không Zustand)

### Integration Points
- `MindmapCanvas.tsx`: Node component cần đọc `iconKey` từ node data và render lucide icon với opacity thấp làm background
- `mindmapSchema.ts`: Thêm optional `iconKey` field vào Branch/Branch2 schemas
- `useMindmapFromText.ts`: Cập nhật prompt với whitelist icon keys và instruction chọn icon cho mỗi node
- `MindmapNode` interface: Cần cập nhật để có `iconKey?: string` field

### Checklist (không trong scope replan này)
- `features/mindmap/hooks/useChecklistFromText.ts`: Đã có (111 dòng)
- `features/mindmap/hooks/useChecklistStorage.ts`: Đã có (82 dòng)
- `features/mindmap/components/ChecklistList.tsx`: Đã có (147 dòng)
- Các file này tồn tại nhưng KHÔNG được tích hợp vào MindmapPage hiện tại. Giữ nguyên không thay đổi trong replan này.

</code_context>

<specifics>
## Specific Ideas

- User muốn icon "nghiêm túc, phù hợp ngữ cảnh" → SVG icon > emoji
- Icon nền mờ (background) thay vì inline — tạo cảm giác visual depth mà không chèn vào text
- Whitelist icon keys giúp Gemini không sai chính tả, ổn định hơn free-form

</specifics>

<deferred>
## Deferred Ideas

- **Checklist integration vào MindmapPage** — checklist hooks/components đã có, nhưng chưa được expose trong UI. Nếu cần thêm tab checklist vào MindmapPage, đó là task riêng sau replan này.
- **User chọn icon thủ công** — cho phép user click để thay icon cho từng node. Phức tạp, defer sang phase sau.
- **Expand icon whitelist** — nếu 30 icon chưa đủ, có thể mở rộng danh sách hoặc cho phép Gemini free-form (với fallback tốt hơn).

</deferred>

---

*Phase: 05-text-mindmap-checklist*
*Context gathered: 2026-03-17*
