# AGENTS.md — Hướng dẫn cho AI agents làm việc trên codebase này

## Kiến trúc project

React 19 + TypeScript + Vite. SPA không có backend riêng — dùng Supabase làm DB/auth, Gemini API để xử lý AI.

```
/
├── features/                  # Tính năng độc lập, mỗi feature là 1 thư mục
│   ├── minutes/               # Tạo biên bản họp từ transcript
│   ├── file-split/            # Tách file audio/video thành nhiều phần (ffmpeg.wasm + WebAudio)
│   ├── token-usage-admin/     # Trang admin xem log token usage toàn hệ thống
│   └── token-usage-user/      # Trang user xem lịch sử token của bản thân
├── components/        # UI components dùng chung
├── services/          # Tích hợp bên ngoài (Gemini, Supabase, tokenUsageService)
├── lib/               # Tiện ích thuần, không có side effects
├── types.ts           # Shared TypeScript types
└── App.tsx            # Root component + routing
```

## Features hiện có

### `features/minutes/`
Tạo biên bản họp từ transcript bằng Gemini API. Gồm form nhập thông tin cuộc họp, prompt builder, và storage (local + Supabase).

### `features/file-split/`
Tách file audio/video thành nhiều đoạn. Có 2 engine:
- `lib/ffmpegClient.ts` — dùng `@ffmpeg/ffmpeg` (WASM), cần SharedArrayBuffer/COOP headers
- `lib/webAudioSplitter.ts` — fallback dùng Web Audio API khi ffmpeg không khả dụng

### `features/token-usage-admin/`
Admin dashboard xem log token của tất cả user. Dùng hook `useTokenUsageLogs` để fetch từ bảng `token_usage_logs` trên Supabase.

### `features/token-usage-user/`
Trang user xem lịch sử sử dụng token của chính mình.

## Services

- `services/geminiService.ts` — gọi Gemini API, trả về text + usage metadata
- `services/tokenUsageService.ts` — log token usage vào Supabase (`token_usage_logs`), fire-and-forget, không làm hỏng UX chính nếu lỗi

## Convention

**Đặt tên:**
- Components: PascalCase (`TranscriptionView.tsx`)
- Hooks: camelCase với prefix `use` (`useFileSplitter.ts`)
- Services/lib: camelCase (`geminiService.ts`)
- Types: PascalCase interface/type

**Code style:**
- TypeScript strict mode bật
- Functional components + hooks, không dùng class components
- Mỗi feature tự quản lý state riêng, không dùng global store
- Tránh `any`, dùng type rõ ràng

## Quy tắc bắt buộc

- **Không sửa file nào khi chưa đọc nó trước**
- **Test phải pass trước khi commit** — chạy `npm test` để kiểm tra
- Không commit file `.env` hay credentials
- Không thêm dependency mới nếu không cần thiết

## Commands

```bash
npm run dev      # Chạy dev server
npm run build    # Build production
npm test         # Chạy test suite (vitest)
npm run preview  # Preview bản build
```

## Env vars cần có

```
VITE_GEMINI_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Dependencies quan trọng

| Package | Mục đích |
|---|---|
| `@ffmpeg/ffmpeg` | Tách audio/video bằng WASM |
| `@google/genai` | Gemini API client |
| `@supabase/supabase-js` | DB + Auth |
| `docx` | Xuất biên bản ra file .docx |
| `xlsx` | Xuất dữ liệu token usage ra Excel |
| `react-markdown` | Render markdown trong UI |

## Lưu ý khi làm việc với file-split

- ffmpeg.wasm yêu cầu header `Cross-Origin-Opener-Policy: same-origin` và `Cross-Origin-Embedder-Policy: require-corp` để dùng SharedArrayBuffer. Đã cấu hình trong `vite.config.ts`.
- Nếu môi trường không hỗ trợ SharedArrayBuffer, tự động fallback sang `webAudioSplitter`.

## Lưu ý khi làm việc với token usage

- Bảng Supabase: `token_usage_logs` với các cột `user_id`, `feature`, `action_type`, `model`, `input_tokens`, `output_tokens`, `total_tokens`, `metadata`.
- `logTokenUsage()` là fire-and-forget — không throw, không block UX.
- Types liên quan: `TokenUsageFeature`, `TokenUsageActionType`, `TokenLoggingContext` trong `types.ts`.
