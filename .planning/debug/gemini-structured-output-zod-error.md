---
status: awaiting_human_verify
trigger: "generateStructured trong geminiService.ts luôn throw lỗi Zod validation dù đã có deepParse fix"
created: 2026-03-14T00:00:00Z
updated: 2026-03-14T00:00:00Z
---

## Current Focus

hypothesis: zodToJsonSchema (v3.x) is incompatible with Zod v4 — returns empty {} instead of full schema, so Gemini receives no constraints and returns root as a raw JSON string
test: ran zodToJsonSchema(MindmapResponseSchema, { target: 'openApi3' }) in project node_modules context
expecting: schema with type/properties — actually got: {}
next_action: replace zodToJsonSchema with z.toJSONSchema() (Zod v4 built-in), strip $schema key for Gemini compatibility

## Symptoms

expected: Gemini trả về JSON hợp lệ, Zod validate thành công, trả về MindmapResponse object
actual: Zod throw lỗi: path ["root"] — Invalid input: expected object, received string
errors: Gemini trả về dữ liệu không đúng định dạng: [ { "expected": "object", "code": "invalid_type", "path": [ "root" ], "message": "Invalid input: expected object, received string" } ]
reproduction: Vào /mindmap, paste text, nhấn "Tạo mindmap" — error ngay
started: kể từ khi phase 05 được implement

## Eliminated

- hypothesis: deepParse không unwrap đúng nested JSON strings
  evidence: deepParse logic is correct — it does handle { and } wrapped strings. The real issue is upstream: Gemini never received a real schema constraint so it serialized nested objects as strings
  timestamp: 2026-03-14

- hypothesis: zodToJsonSchema with openApi3 target produces $ref/$defs Gemini can't handle
  evidence: zodToJsonSchema returns {} (empty object) — not $ref issues, total incompatibility with Zod v4
  timestamp: 2026-03-14

## Evidence

- timestamp: 2026-03-14
  checked: node_modules/zod/package.json and node_modules/zod-to-json-schema/package.json
  found: zod v4.3.6 + zod-to-json-schema v3.25.1
  implication: zod-to-json-schema v3.x only supports Zod v3 internal APIs (_def.typeName etc) — with Zod v4 it silently returns {}

- timestamp: 2026-03-14
  checked: ran zodToJsonSchema(MindmapResponseSchema, { target: 'openApi3' }) in Node with project node_modules
  found: returns {} for both openApi3 and jsonSchema7 targets
  implication: Gemini's responseSchema is {} — no structure enforced, Gemini freely serializes nested fields as JSON strings

- timestamp: 2026-03-14
  checked: ran z.toJSONSchema(MindmapResponseSchema) using Zod v4 built-in
  found: returns full correct schema with type, properties, required, additionalProperties:false at all levels
  implication: Zod v4 has z.toJSONSchema() built-in — this should be used instead of the broken third-party package

## Resolution

root_cause: zod-to-json-schema v3.25.1 is incompatible with Zod v4.3.6. zodToJsonSchema() silently returns {} (empty schema). Gemini receives no JSON structure constraint and serializes nested objects (like root) as JSON-encoded strings. deepParse was correct in theory but the real fix is giving Gemini a valid schema.
fix: Replace zodToJsonSchema(schema, { target: 'openApi3' }) with z.toJSONSchema(schema) — Zod v4's built-in schema generator. Strip $schema key as Gemini doesn't need it.
verification: all 16 mindmap tests pass (generateStructured x4, useMindmapFromText x5, useChecklistStorage x7)
files_changed:
  - services/geminiService.ts
