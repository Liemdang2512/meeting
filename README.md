<div align="center">
  <h2>Meeting Minutes & Mindmap Assistant</h2>
  <p>Ứng dụng web hỗ trợ ghi biên bản họp, tạo mindmap và checklist tự động bằng Gemini.</p>
</div>

---

## Tổng quan

**Meeting Minutes & Mindmap Assistant** là ứng dụng web (React + Vite) giúp bạn:

- **Ghi chép & tạo biên bản họp** từ transcript hoặc ghi chú thô.
- **Sinh sơ đồ tư duy (mindmap)** từ văn bản để nắm nhanh ý chính.
- **Sinh checklist hành động** sau cuộc họp.
- **Theo dõi usage token** cho từng user và admin.

Ứng dụng gồm:

- **Frontend**: Vite SPA (React + TypeScript)
- **Backend**: Express API + JWT Auth
- **Database**: Postgres (chạy bằng Docker cho môi trường local/test)
- **Gemini API**: xử lý AI (phiên âm, tổng hợp, biên bản, mindmap, checklist,…)

---

## Kiến trúc & thư mục chính

Project được tổ chức theo **feature-based structure**:

- **`features/minutes/`**: Tạo biên bản họp từ transcript.
- **`features/mindmap/`**: Tạo mindmap + checklist từ văn bản, có route riêng `/mindmap`.
- **`features/file-split/`**: Tách file audio/video thành nhiều phần (ffmpeg.wasm + Web Audio).
- **`features/token-usage-admin/`**: Trang admin xem log token của toàn hệ thống.
- **`features/token-usage-user/`**: Trang user xem lịch sử sử dụng token của chính mình.
- **`components/`**: UI components dùng chung (ví dụ: `TranscriptionView`).
- **`services/`**: Tích hợp bên ngoài (Gemini, tokenUsageService).
- **`lib/`**: Hàm tiện ích thuần, không side effects.
- **`App.tsx`**: Root component + routing.
- **`server/`**: Express API (auth, user settings, transcriptions, summaries, token logs, admin).
- **`db/`**: Schema/reset/seed cho Postgres (phục vụ local & integration tests).

---

## Công nghệ chính

- **React 19** + **TypeScript** + **Vite**
- **@google/genai** – client Gemini
- **Express** – Backend API
- **Postgres** – Database
- **JWT** – Auth (lưu token ở localStorage)
- **@xyflow/react** – render sơ đồ tư duy
- **docx, html2canvas, jspdf** – xuất biên bản ra PDF/Word
- **@ffmpeg/ffmpeg** – xử lý audio/video (file-split)

---

## Yêu cầu môi trường

- **Node.js** (repo dùng **Node 20.x**)
- **npm** hoặc **pnpm**/**yarn** (repo dùng `npm`)
- **Docker** (để chạy Postgres local cho dev/test)

Tạo file `.env` (hoặc `.env.local`) ở thư mục gốc (frontend) với các biến:

```bash
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_API_URL=http://localhost:3001
```

Tạo file `.env` cho backend (ví dụ: `server/.env`) với các biến:

```bash
PORT=3001
API_JWT_SECRET=dev-secret-change-me

# Option A: 1 URL duy nhất
DATABASE_URL=postgres://postgres:postgres@localhost:5433/meeting_test

# Option B: tách biến (nếu không dùng DATABASE_URL)
DB_HOST=localhost
DB_PORT=5433
DB_NAME=meeting_test
DB_USER=postgres
DB_PASS=postgres

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

---

## Chạy dự án trên máy local

1. **Cài đặt dependencies**

   ```bash
   npm install
   ```

2. **Cấu hình môi trường**

   - Tạo `.env` (frontend) và `server/.env` (backend) như phần trên.
   - Nếu không set `VITE_GEMINI_API_KEY`, app sẽ yêu cầu bạn nhập API key trong UI và lưu ở localStorage.

3. **Chạy database (Postgres) bằng Docker**

   ```bash
   npm run db:up
   ```

4. **Reset schema & seed admin (local/test DB)**

   ```bash
   npm run db:reset
   npm run db:seed
   ```

   Tài khoản admin mặc định:
   - Email: `admin@local.dev`
   - Password: `admin123`

5. **Chạy frontend + backend**

   ```bash
   npm run dev:full
   ```

6. Mở trình duyệt tại `http://localhost:3000`.

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

