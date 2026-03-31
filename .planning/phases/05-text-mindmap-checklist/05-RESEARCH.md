# Phase 05: Text → Mindmap & Checklist - Research

**Researched:** 2025-03-14
**Domain:** Mindmap từ text (Gemini + render), checklist triển khai, UI kiểu NotebookLM
**Confidence:** HIGH (stack, Gemini), MEDIUM (thư viện render), HIGH (lưu trữ)

---

## Scope / Mục tiêu phase

Phase này bổ sung **một feature mới** trong `features/` với hai phần:

1. **Text → Mindmap**
   - Input: file text hoặc paste text từ người dùng.
   - Output: sơ đồ tư duy phân cấp (chủ đề trung tâm → nhánh chính → nhánh con), có thể mở rộng/thu gọn từng nút.
   - Giao diện tham khảo NotebookLM: nút dạng card/box, nối bằng đường kẻ, expand/collapse (ví dụ icon ">" ở cuối nhánh).

2. **Checklist triển khai**
   - Từ nội dung (hoặc từ mindmap đã tạo), tạo danh sách công việc cần triển khai (checklist).
   - Mỗi mục có thể đánh dấu hoàn thành, cấu trúc phân cấp (hạng mục lớn → mục con).
   - Lưu trạng thái checklist: local và/hoặc Supabase (đề xuất trong research).

**Quan hệ:** Cùng nguồn text; checklist có thể sinh từ mindmap hoặc trực tiếp từ text.

---

## Summary

Feature gồm hai luồng: (1) text → Gemini (structured output) → cấu trúc cây mindmap → render bằng thư viện React; (2) text hoặc mindmap → Gemini → checklist phân cấp → lưu và tương tác (tick, expand/collapse). Codebase hiện dùng `geminiService.runTextAgent` trả về string; cần mở rộng để gọi Gemini với `responseMimeType: "application/json"` và `responseJsonSchema` (Zod + zod-to-json-schema). Render mindmap: **ưu tiên @xyflow/react** (React Flow) vì có tutorial mindmap chính thức, expand/collapse, custom node/edge; **markmap** (markmap-lib + markmap-view) phù hợp nếu output là Markdown heading thay vì JSON. Checklist: data model flat (id, parentId, label, completed, order); lưu localStorage cho phiên làm việc + Supabase (bảng mới) nếu user đã đăng nhập để đồng bộ đa thiết bị.

**Primary recommendation:** Dùng Gemini structured output (Zod schema) để trả về cây mindmap và danh sách checklist; render mindmap bằng **@xyflow/react** với custom node có nút expand/collapse; checklist lưu **localStorage** trong phase này, chuẩn bị schema Supabase cho phase sau nếu cần sync.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `@google/genai` | (đã có ^1.33) | Gọi Gemini API | Đã dùng trong project; hỗ trợ structured output |
| `zod` | ^3.23 | Định nghĩa schema cho output Gemini | Official docs khuyến nghị Zod + zodToJsonSchema cho JS |
| `zod-to-json-schema` | ^3.23 | Chuyển Zod → JSON Schema cho Gemini | Cần cho `responseJsonSchema` |
| `@xyflow/react` | ^12.x | Render mindmap (nodes + edges), expand/collapse | Tutorial mindmap chính thức, tương tác tốt, phù hợp React 19 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `markmap-lib` + `markmap-view` | ^0.18 | Render mindmap từ Markdown | Nếu chọn pipeline Text→Markdown (headings)→mindmap thay vì JSON |
| (không thêm Zustand) | — | State | Có thể dùng useState/useReducer trong feature, giống các feature khác |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @xyflow/react | markmap (markmap-lib + markmap-view) | Markmap: input là Markdown, expand/collapse có sẵn, ít tùy biến card/box kiểu NotebookLM. React Flow: full control UI, cần implement expand/collapse (có example sẵn). |
| @xyflow/react | D3 (d3-hierarchy) + custom SVG | D3 mạnh nhưng nhiều boilerplate, không có component React chuẩn cho mindmap; React Flow đã có mindmap tutorial. |
| @xyflow/react | react-d3-tree | react-d3-tree phổ biến nhưng ít maintain, API cũ; React Flow active, React 19 compatible. |

**Installation:**
```bash
npm install zod zod-to-json-schema @xyflow/react
```

*(Chỉ thêm dependency khi triển khai; AGENTS.md: "không thêm dependency nếu không cần thiết" — ở đây cần cho mindmap + structured output.)*

---

## Architecture Patterns

### Recommended Project Structure
```
features/
└── mindmap/                    # hoặc text-mindmap-checklist
    ├── components/              # MindmapView, ChecklistView, NodeCard, ...
    │   ├── MindmapCanvas.tsx    # React Flow wrapper, custom nodes/edges
    │   ├── ChecklistList.tsx    # Checklist tree với tick + expand
    │   └── ...
    ├── hooks/
    │   ├── useMindmapFromText.ts   # Gọi Gemini, parse JSON → tree
    │   ├── useChecklistFromText.ts # Gọi Gemini → checklist items
    │   └── useChecklistStorage.ts  # localStorage (+ Supabase nếu có)
    ├── lib/
    │   └── mindmapSchema.ts     # Zod schemas cho Gemini
    └── MindmapPage.tsx         # Entry: upload/paste → tabs Mindmap | Checklist
services/
└── geminiService.ts            # Thêm hàm generateStructured (prompt, schema, loggingContext, userId)
types.ts                        # Thêm TokenUsageFeature 'mindmap', TokenUsageActionType 'mindmap-generate' | 'checklist-generate'
```

### Pattern 1: Gemini structured output (JSON)

**What:** Gọi Gemini với `config.responseMimeType: "application/json"` và `config.responseJsonSchema` (từ Zod). Parse `response.text` bằng `JSON.parse` rồi validate bằng Zod.

**When to use:** Mọi lần cần extract cấu trúc từ text (mindmap tree, checklist items).

**Example:**
```typescript
// Source: https://ai.google.dev/gemini-api/docs/structured-output
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const mindmapNodeSchema = z.object({
  id: z.string().describe("Unique id for the node"),
  label: z.string().describe("Short label for this branch"),
  children: z.array(z.lazy(() => mindmapNodeSchema)).optional().default([]),
});
const mindmapRootSchema = z.object({
  root: mindmapNodeSchema,
});

const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: prompt,
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: zodToJsonSchema(mindmapRootSchema),
  },
});
const data = mindmapRootSchema.parse(JSON.parse(response.text));
```

**Lưu ý:** Gemini có thể từ chối schema quá sâu hoặc phức tạp; nên giới hạn depth (ví dụ 3–4 cấp) trong prompt hoặc schema mô tả.

### Pattern 2: Mindmap data format (trong app)

**Đề xuất JSON schema cho node:**

```typescript
interface MindmapNode {
  id: string;
  label: string;
  children: MindmapNode[];
  expanded?: boolean;  // UI state, không cần gửi Gemini
}
```

Root là một node với `id: "root"`, `label` = chủ đề trung tâm, `children` = các nhánh chính. Khi render với React Flow: map tree → nodes + edges; `expanded` điều khiển hiển thị nhánh con (expand/collapse).

### Pattern 3: Checklist data model

**Flat list (phù hợp Supabase + localStorage):**

```typescript
interface ChecklistItem {
  id: string;
  parentId: string | null;  // null = root
  label: string;
  completed: boolean;
  order: number;
}
```

Chuyển qua lại với cây (hiển thị): nhóm theo `parentId`, sort theo `order`. Lưu: localStorage key theo document/session; Supabase bảng `checklist_items` (id, user_id, parent_id, label, completed, order, document_id?, created_at).

### Anti-Patterns to Avoid

- **Parse Gemini text thủ công:** Tránh regex/string split để lấy cấu trúc; dùng structured output + Zod để tránh lỗi format.
- **Hand-roll layout mindmap:** Không tự tính vị trí node (trừ khi đơn giản); dùng layout từ React Flow (ví dụ dagre) hoặc markmap.
- **Lưu checklist chỉ trong memory:** Cần ít nhất localStorage để không mất khi refresh; Supabase khi cần sync đa thiết bị.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parse cấu trúc từ text | Regex / split để lấy cây | Gemini structured output + Zod | Định dạng output ổn định, ít lỗi. |
| Vẽ mindmap (nodes + edges) | Custom SVG/canvas từ đầu | @xyflow/react (hoặc markmap) | Zoom, pan, expand/collapse, performance. |
| JSON Schema cho Gemini | Viết tay object schema | Zod + zodToJsonSchema | Type-safe, một nguồn cho schema và runtime parse. |

**Key insight:** Gemini structured output + thư viện render mindmap đã giải quyết phần khó (extract ý + vẽ); custom chỉ cần nối pipeline và UI (upload/paste, tabs, nút ">").  

---

## Cách triển khai Text → Mindmap

### Format dữ liệu mindmap (đề xuất)

- **Node:** `id`, `label`, `children` (array of node). Optionally `expanded` trên client.
- **Root:** Một node gốc; `id` có thể do Gemini sinh (ví dụ "root", "1", "2") hoặc client generate UUID sau khi nhận.
- **Gemini:** Chỉ trả về cây (label + children); client gán `id` nếu cần, và thêm `expanded: true` mặc định.

### Gemini: prompt và structured output

- **Prompt:** Yêu cầu từ đoạn văn bản trích ra: (1) một chủ đề trung tâm; (2) các nhánh chính; (3) với mỗi nhánh chính, các nhánh con (có thể giới hạn depth 2–3 để tránh schema quá sâu). Yêu cầu output đúng JSON theo schema.
- **Schema:** Dùng Zod recursive (hoặc schema cố định 2–3 cấp) → `zodToJsonSchema` → `responseJsonSchema`. Model: `gemini-3-flash-preview` hoặc `gemini-3-pro-preview` (đã dùng trong project).
- **Token:** Log qua `tokenUsageService` với `TokenLoggingContext`: feature `'mindmap'`, actionType `'mindmap-generate'` (và tương tự cho checklist).

### Thư viện render mindmap (so sánh)

| Thư viện | Ưu điểm | Nhược điểm | Bundle / React 19 |
|----------|---------|------------|-------------------|
| **@xyflow/react** | Tutorial mindmap chính thức, expand/collapse, custom node/edge, zoom/pan | Cần map tree→nodes/edges, cấu hình layout | ~100–200KB gzipped; tương thích React 18/19 |
| **markmap (markmap-lib + markmap-view)** | Input Markdown → mindmap nhanh, expand/collapse có sẵn | Input là Markdown (heading), ít tùy biến card kiểu NotebookLM | Nhẹ hơn; cần wrapper React |
| **D3 (d3-hierarchy)** | Linh hoạt layout | Nhiều code, không component React sẵn | Tùy cách dùng |

**Đề xuất:** **@xyflow/react** — phù hợp với cấu trúc JSON từ Gemini, dễ làm card/box và nút ">" giống NotebookLM; có [tutorial mind map](https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow) và [expand/collapse example](https://reactflow.dev/examples/layout/expand-collapse).

---

## Checklist triển khai

### Data model

- **id:** string (UUID hoặc nanoid).
- **parentId:** string | null (null = top-level).
- **label:** string.
- **completed:** boolean.
- **order:** number (thứ tự trong cùng parent).

Có thể thêm `documentId` hoặc `sourceTextId` để gom checklist theo “tài liệu” nếu sau này có nhiều nguồn.

### Sinh checklist từ Gemini

- **Input:** Đoạn text (hoặc cấu trúc mindmap đã có — gửi dạng text/JSON mô tả).
- **Prompt:** Yêu cầu liệt kê công việc cần triển khai, phân cấp (hạng mục lớn → mục con), mỗi mục một dòng ngắn.
- **Structured output:** Zod schema ví dụ `z.array(z.object({ label: z.string(), children: z.array(...) }))` hoặc flat `z.array(z.object({ label: z.string(), parentLabel: z.string().optional() }))` rồi client chuyển thành flat list có `parentId`/`order`.

### Lưu trữ

| Phương án | Ưu | Nhược |
|-----------|----|--------|
| **Chỉ localStorage** | Đơn giản, không cần backend | Mất khi xóa storage, không sync thiết bị |
| **Chỉ Supabase** | Sync, backup | Cần bảng mới, RLS, chỉ khi đã đăng nhập |
| **Cả hai** | Offline-first, sync khi có user | Logic đồng bộ phức tạp hơn |

**Đề xuất phase này:** Lưu **localStorage** (key theo session/document). Chuẩn bị **schema Supabase** (bảng `checklist_items`) và service lưu/đọc để phase sau bật sync khi user đăng nhập (tùy product).

---

## UI/UX

### Luồng

1. User: upload file text hoặc paste text.
2. (Optional) Chọn “Tạo mindmap” → gọi Gemini → hiển thị mindmap (tab hoặc section).
3. Tab/section **Checklist:** “Tạo checklist từ nội dung” (hoặc “Từ mindmap”) → gọi Gemini → hiển thị checklist phân cấp; tick hoàn thành, expand/collapse.
4. Trạng thái checklist lưu localStorage (và Supabase nếu đã implement).

### Tương tác

- **Mindmap:** Expand/collapse từng nút (icon ">" hoặc tương đương); zoom/pan (React Flow có sẵn).
- **Checklist:** Tick completed; expand/collapse theo cấp. Edit inline (phase này hay defer): có thể defer để giảm scope, chỉ xem + tick.

---

## Phụ thuộc (dependencies)

| Package | Lý do |
|---------|--------|
| `zod` | Schema + parse cho Gemini structured output và runtime. |
| `zod-to-json-schema` | Chuyển Zod → JSON Schema cho Gemini API. |
| `@xyflow/react` | Render mindmap với nodes/edges, expand/collapse, phù hợp React 19. |

Không dùng thêm Zustand nếu state feature có thể quản lý bằng useState/useReducer (nhất quán với các feature khác).

---

## Rủi ro & Deferred

### Rủi ro

- **Token cost:** Text dài → input token lớn; nên giới hạn độ dài (ví dụ 50k ký tự) hoặc tóm tắt trước khi gửi Gemini.
- **Schema phức tạp:** Cây đệ quy sâu có thể bị Gemini từ chối; giới hạn depth (2–3 cấp) trong prompt/schema.

### Deferred (ngoài phase này)

- Export mindmap ra ảnh/PDF.
- Edit inline nội dung node mindmap / checklist (chỉ xem + tick trong phase này nếu cần giảm scope).
- Sync checklist đa thiết bị qua Supabase (có thể làm sau khi có bảng + RLS).

---

## Common Pitfalls

### Pitfall 1: Gemini trả về JSON lẫn markdown

**What goes wrong:** Model đôi khi thêm ```json ... ``` hoặc giải thích quanh JSON.  
**How to avoid:** Trong prompt nói rõ "Chỉ trả về JSON, không thêm text nào khác"; sau khi nhận có thể strip code block rồi `JSON.parse`.

### Pitfall 2: Tree quá sâu

**What goes wrong:** Schema đệ quy không giới hạn → token lớn hoặc schema bị từ chối.  
**How to avoid:** Mô tả trong prompt "Tối đa 3 cấp: trung tâm → nhánh chính → nhánh con"; hoặc dùng schema cố định 3 cấp thay vì recursive.

### Pitfall 3: Quên log token

**What goes wrong:** Gọi Gemini nhưng không log → mất thống kê usage.  
**How to avoid:** Mọi lần gọi Gemini trong feature mindmap/checklist đều truyền `TokenLoggingContext` và `userId` vào service (đã có trong `runTextAgent`; cần hàm mới cho structured vẫn dùng cùng cơ chế log).

---

## Code Examples

### Gemini structured output (JavaScript, từ official docs)

```typescript
// Source: https://ai.google.dev/gemini-api/docs/structured-output
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const schema = z.object({
  root: z.object({
    label: z.string(),
    children: z.array(z.object({
      label: z.string(),
      children: z.array(z.object({ label: z.string() })).optional(),
    })),
  }),
});

const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: `Từ nội dung sau, trích ra cấu trúc mindmap (1 chủ đề trung tâm, vài nhánh chính, mỗi nhánh vài nhánh con). Chỉ trả về JSON.\n\n${userText}`,
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: zodToJsonSchema(schema),
  },
});
const parsed = schema.parse(JSON.parse(response.text));
```

### React Flow – custom node + expand (từ tutorial)

```typescript
// Source: https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow
import { Handle, NodeProps, Position } from '@xyflow/react';

export type NodeData = { label: string; expanded?: boolean };

function MindMapNode({ id, data }: NodeProps<NodeData>) {
  return (
    <>
      <div className="flex items-center gap-1">
        <span>{data.label}</span>
        <button type="button" aria-label="Expand">›</button>
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}
```

---

## Token usage (types hiện tại)

Trong `types.ts` cần thêm:

- **TokenUsageFeature:** `'mindmap'` (hoặc `'text-mindmap'`).
- **TokenUsageActionType:** `'mindmap-generate'`, `'checklist-generate'`.

Trong `features/token-usage-admin/labels.ts` thêm label tương ứng. Mọi gọi Gemini trong feature mindmap/checklist truyền `TokenLoggingContext` với feature/actionType trên và gọi `logTokenUsage` (qua wrapper trong geminiService) như các feature khác.

---

## Validation Architecture

*(Project chưa có `.planning/config.json`; test theo AGENTS.md: `npm test` — Vitest.)*

### Test framework

| Property | Value |
|----------|--------|
| Framework | Vitest 4 |
| Config | vitest.config.ts |
| Quick run | `npm run test:unit` |

### Phase requirements → test (đề xuất)

- Service `generateStructured` (hoặc tương đương): unit test với mock Gemini response JSON.
- Hook `useMindmapFromText`: mock geminiService, kiểm tra parse tree và state.
- Hook `useChecklistStorage`: mock localStorage, kiểm tra lưu/load checklist.
- Component MindmapCanvas: có thể test render với tree mẫu (ít node).

---

## Sources

### Primary (HIGH confidence)

- [Gemini API – Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output) — JSON Schema, Zod, responseMimeType, responseJsonSchema.
- [React Flow – Mind map tutorial](https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow) — custom nodes, edges, state.
- [React Flow – Expand and collapse](https://reactflow.dev/examples/layout/expand-collapse) — expand/collapse pattern.

### Secondary (MEDIUM confidence)

- [markmap docs](https://markmap.js.org/docs/markmap) — Markdown → mindmap, React demo.
- [NotebookLM Mind Maps](https://support.google.com/notebooklm/answer/16212283) — expand/collapse, zoom, pan.

### Tertiary (LOW / tổng hợp)

- So sánh React Flow vs markmap vs D3 từ WebSearch; đề xuất ưu tiên React Flow cho JSON + UX kiểu NotebookLM.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Parse model output bằng regex / split | Gemini structured output (JSON Schema) | Output ổn định, ít lỗi, type-safe với Zod. |
| React Flow package `reactflow` | `@xyflow/react` (rebrand 2024) | Cài đúng package mới; API tương thích. |
| Mindmap tĩnh (chỉ vẽ) | Expand/collapse từng nút (NotebookLM-style) | UX tốt hơn cho cây lớn. |

**Deprecated/outdated:** Dùng `reactflow` (tên cũ) thay vì `@xyflow/react` — npm khuyến nghị @xyflow/react.

---

## Open Questions

1. **Độ sâu cây mindmap từ Gemini**
   - Đã biết: Schema đệ quy có thể bị từ chối nếu quá sâu.
   - Chưa rõ: Giới hạn 3 cấp có đủ cho đa số tài liệu không.
   - Đề xuất: Bắt đầu với 3 cấp; nếu cần có thể thử 4 cấp hoặc flat + parentId.

2. **Checklist: sinh từ text hay từ mindmap**
   - Cả hai đều khả thi; sinh từ mindmap có thể nhất quán với sơ đồ hơn.
   - Phase này có thể implement "từ text" trước; "từ mindmap" = gửi JSON mindmap (hoặc mô tả) làm input cho prompt.

3. **Edit inline node/checklist**
   - Defer để giảm scope; nếu phase này chỉ xem + tick + expand/collapse thì không cần edit.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — Gemini docs, React Flow npm và tutorial rõ ràng.
- Architecture: MEDIUM — pattern Gemini + React Flow đã verify; checklist storage và Supabase chỉ đề xuất.
- Pitfalls: HIGH — từ kinh nghiệm structured output và token logging trong project.

**Research date:** 2025-03-14  
**Valid until:** ~30 ngày (stack ổn định).
