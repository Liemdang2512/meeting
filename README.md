<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

<div align="center">
  <h2>Meeting Minutes & Mindmap Assistant</h2>
  <p>Ứng dụng web hỗ trợ ghi biên bản họp, tạo mindmap và checklist tự động bằng Gemini + Supabase.</p>
</div>

---

## Tổng quan

**Meeting Minutes & Mindmap Assistant** là ứng dụng SPA (React + Vite) giúp bạn:

- **Ghi chép & tạo biên bản họp** từ transcript hoặc ghi chú thô.
- **Sinh sơ đồ tư duy (mindmap)** từ văn bản để nắm nhanh ý chính.
- **Sinh checklist hành động** sau cuộc họp.
- **Theo dõi usage token** cho từng user và admin.

Ứng dụng không có backend custom, sử dụng:

- **Gemini API** để xử lý AI (tóm tắt, định dạng biên bản, mindmap, checklist,…).
- **Supabase** để quản lý **auth** và **lưu log token usage**.

---

## Kiến trúc & thư mục chính

Project được tổ chức theo **feature-based structure**:

- **`features/minutes/`**: Tạo biên bản họp từ transcript.
- **`features/mindmap/`**: Tạo mindmap + checklist từ văn bản, có route riêng `/mindmap`.
- **`features/file-split/`**: Tách file audio/video thành nhiều phần (ffmpeg.wasm + Web Audio).
- **`features/token-usage-admin/`**: Trang admin xem log token của toàn hệ thống.
- **`features/token-usage-user/`**: Trang user xem lịch sử sử dụng token của chính mình.
- **`components/`**: UI components dùng chung (ví dụ: `TranscriptionView`).
- **`services/`**: Tích hợp bên ngoài (Gemini, Supabase, tokenUsageService).
- **`lib/`**: Hàm tiện ích thuần, không side effects.
- **`App.tsx`**: Root component + routing.

---

## Công nghệ chính

- **React 19** + **TypeScript** + **Vite**
- **@google/genai** – client Gemini
- **@supabase/supabase-js** – DB + Auth
- **@xyflow/react** – render sơ đồ tư duy
- **docx, html2canvas, jspdf** – xuất biên bản ra PDF/Word
- **@ffmpeg/ffmpeg** – xử lý audio/video (file-split)

---

## Yêu cầu môi trường

- **Node.js** (khuyến nghị >= 18)
- **npm** hoặc **pnpm**/**yarn** (repo dùng `npm`)

Tạo file `.env` (hoặc `.env.local`) ở thư mục gốc với các biến:

```bash
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Chạy dự án trên máy local

1. **Cài đặt dependencies**

   ```bash
   npm install
   ```

2. **Cấu hình môi trường**

   - Tạo file `.env` / `.env.local` như phần trên.
   - Điền đúng `VITE_GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

3. **Chạy dev server**

   ```bash
   npm run dev
   ```

4. Mở trình duyệt tại URL Vite in ra (thường là `http://localhost:5173`).

---

## Build & preview production

```bash
npm run build
npm run preview
```

---

## Test

Repo sử dụng **Vitest** cho unit test.

```bash
npm test
```

---

## Các tính năng nổi bật

- **Biên bản họp tự động**
  - Nhập transcript hoặc ghi chú thô.
  - Dùng Gemini để chuẩn hoá thành biên bản, có cấu trúc rõ ràng.
  - Xuất **PDF** hoặc **Word (.docx)** từ component `TranscriptionView`.

- **Mindmap & checklist từ văn bản**
  - Route riêng `/mindmap` để nhập văn bản bất kỳ.
  - Sinh **mindmap** bằng `@xyflow/react`, có thể export PNG/PDF.
  - Sinh **checklist** (danh sách việc cần làm) và lưu localStorage.

- **Quản lý token usage**
  - Ghi log mỗi lần gọi Gemini (feature, actionType, model, token,…).
  - Admin có trang riêng để xem thống kê token toàn hệ thống.
  - User có trang riêng để xem lịch sử sử dụng của chính mình.

---

## Demo & hình minh họa

> Bạn có thể thay đường dẫn và hình bên dưới bằng ảnh/GIF thực tế của project.

### 1. Flow biên bản họp

![Demo biên bản họp](./docs/assets/meeting-minutes-flow.gif)

- Ghi âm / nhập transcript.
- Sinh biên bản họp, xuất PDF/Word trực tiếp từ giao diện.

### 2. Trang Mindmap

![Trang Mindmap](./docs/assets/mindmap-page.png)

- Nhập văn bản, xem sơ đồ tư duy sinh tự động.
- Export mindmap ra PNG/PDF.

### 3. Trang thống kê token usage

![Token usage](./docs/assets/token-usage-dashboard.png)

- Admin xem thống kê token toàn hệ thống.
- User xem lịch sử sử dụng cá nhân.

---

## Ghi chú phát triển

- **TypeScript strict mode** được bật, hạn chế dùng `any`.
- Ưu tiên **functional components + hooks**, không dùng class components.
- Mỗi feature tự quản lý state của mình, tránh global store nếu không cần thiết.
- Trước khi commit: nên chạy `npm test`.

---

## Liên hệ / Đóng góp

- Rất hoan nghênh **issue**, **feature request** hoặc **pull request** để cải thiện ứng dụng.
- Khi mở PR, vui lòng:
  - Mô tả rõ mục đích thay đổi.
  - Đảm bảo test pass (`npm test`) và build không lỗi (`npm run build`).

