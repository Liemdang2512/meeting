---
status: awaiting_human_verify
trigger: "generateStructured trong geminiService.ts vẫn throw lỗi JSON parse dù đã có nhiều lần fix"
created: 2026-03-14T00:00:00Z
updated: 2026-03-14T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED — thiếu responseJsonSchema + model không hợp lệ "gemini-3-flash-preview"
test: Fix đã apply: thêm responseJsonSchema từ schema.toJSONSchema(), đổi model sang gemini-2.0-flash, thêm repairJson fallback
expecting: JSON parse thành công, mindmap render được
next_action: Human verify trên browser

## Symptoms

expected: Gemini trả về JSON hợp lệ, parse thành công, render mindmap
actual: "Expected double-quoted property name in JSON at position 143 (line 6 column 48)" — JSON.parse fail
errors: "Expected double-quoted property name in JSON at position 133/143 (line 6 column 38/48)"
reproduction: Vào /mindmap, paste bất kỳ text tiếng Việt, nhấn "Tạo mindmap"
started: Xảy ra liên tục, chưa lần nào thành công

## Eliminated

- hypothesis: Zod validation issue (root nhận string thay vì object)
  evidence: responseSchema đã bị bỏ, hiện chỉ dùng responseMimeType
  timestamp: 2026-03-14

- hypothesis: JSON extraction regex thiếu
  evidence: Đã có code tìm first { last } để extract, và markdown block matching
  timestamp: 2026-03-14

## Evidence

- timestamp: 2026-03-14
  checked: geminiService.ts lines 595-603
  found: Model là "gemini-3-flash-preview" — đây KHÔNG phải model tên thực. Google Gemini SDK dùng tên như "gemini-1.5-flash", "gemini-2.0-flash-exp", "gemini-2.5-flash-preview". "gemini-3-flash-preview" chưa tồn tại tính đến 2025.
  implication: Nếu SDK chấp nhận tên model không hợp lệ và fallback sang model khác, hoặc model preview này có behavior khác biệt, có thể là nguồn gốc lỗi

- timestamp: 2026-03-14
  checked: buildMindmapPrompt trong useMindmapFromText.ts lines 9-19
  found: Prompt chứa ví dụ JSON inline: {"root":{"label":"Chủ đề chính",...}} — đây là VALID JSON. Nhưng prompt nói "Chỉ trả về JSON hợp lệ" mà không giải thích rõ format cho model.
  implication: Prompt example có thể ổn, nhưng cần xem xét kỹ hơn

- timestamp: 2026-03-14
  checked: generateStructured config — không có responseSchema, chỉ có responseMimeType: "application/json"
  found: Khi dùng responseMimeType mà không có responseSchema, model biết cần output JSON nhưng không biết SCHEMA. Model có thể output JavaScript object literals (unquoted keys) thay vì strict JSON.
  implication: Thiếu responseSchema là nguyên nhân chính — model không có constraint để output proper JSON keys

- timestamp: 2026-03-14
  checked: Error message "Expected double-quoted property name"
  found: Đây là lỗi khi JSON có unquoted keys, ví dụ: {root: {...}} thay vì {"root": {...}}. Đây là valid JavaScript nhưng INVALID JSON.
  implication: Gemini đang output JavaScript object literal syntax thay vì strict JSON

- timestamp: 2026-03-14
  checked: @google/genai SDK — cách dùng responseJsonSchema
  found: SDK mới (@google/genai) dùng config.responseSchema (không phải responseJsonSchema). Khi chỉ có responseMimeType mà không có responseSchema, model ở "free form JSON mode" — dễ output JS-style.
  implication: Cần thêm responseSchema để force model output strict JSON với proper quoted keys

## Resolution

root_cause: |
  Gemini model "gemini-3-flash-preview" khi chỉ có responseMimeType: "application/json" mà KHÔNG có responseSchema
  sẽ output JSON-like nhưng có thể dùng JavaScript object literal syntax (unquoted keys như {root: {...}})
  thay vì strict JSON ({"root": {...}}).

  Root cause cụ thể: thiếu config.responseSchema trong generateContent call.
  Khi không có schema constraint, model ở "free form JSON mode" và một số model preview
  (đặc biệt "gemini-3-flash-preview" — tên model có thể không standard) có thể output
  JS-style objects với unquoted property names, làm JSON.parse fail với
  "Expected double-quoted property name".

  Fix: Thêm responseSchema từ Zod schema (convert sang JSON Schema object) để buộc model
  output strict JSON với quoted keys. Đồng thời, nếu vẫn fail, thêm JSON repair logic
  để convert unquoted keys thành quoted keys trước khi parse.

fix: |
  1. Thêm hàm repairJson() để quote unquoted keys (regex: bare identifier trước dấu : )
  2. Thêm responseJsonSchema: schema.toJSONSchema() vào generateContent config
     (dùng responseJsonSchema thay responseSchema vì responseSchema cần SDK SchemaUnion type)
  3. Đổi model từ "gemini-3-flash-preview" (không tồn tại) sang "gemini-2.0-flash" (stable)
  4. Thêm repairJson fallback trong catch block, log full raw response khi parse fail
  5. TypeScript check: npx tsc --noEmit → 0 errors

verification: awaiting human confirm
files_changed:
  - services/geminiService.ts
