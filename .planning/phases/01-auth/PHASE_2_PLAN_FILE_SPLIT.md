## Phase 2 – PLAN tính năng “Cắt file” (File Split)

### Tổng quan

- **Mục tiêu**: Thêm tính năng cắt audio/video theo thời lượng (mặc định 30 phút/đoạn) bằng ffmpeg.wasm, hoạt động trong browser, có tab riêng “Cắt file”, giới hạn 200MB/file, tách biệt với flow ghi chép hiện tại.
- **Nguyên tắc**:
  - Không ảnh hưởng flow ghi chép hiện tại (upload → ghi chép → tổng hợp → biên bản).
  - Tách code feature “Cắt file” vào thư mục riêng (feature folder) để dễ maintain.
  - ffmpeg.wasm được lazy-load chỉ khi user vào tab “Cắt file”.

---

## 1. Cấu trúc file & thư mục

### 1.1. Tạo thư mục feature “file-split”

- [ ] **Tạo thư mục feature**: `src/features/file-split/`
- [ ] **Bên trong `file-split/` tạo các file**:
  - [ ] `src/features/file-split/index.ts`
    - **Nhiệm vụ**: Export các entry chính cho feature (component page + hooks/types nếu cần).
  - [ ] `src/features/file-split/FileSplitPage.tsx`
    - **Component chính** của tab “Cắt file”: chứa UI upload, form chọn phút, preview segments, nút cắt, progress, danh sách kết quả.
  - [ ] `src/features/file-split/components/FileSplitUploader.tsx`
    - UI upload file (drag & drop hoặc nút “Chọn file”), hiển thị tên file + dung lượng, cảnh báo 200MB.
  - [ ] `src/features/file-split/components/FileSplitControls.tsx`
    - Input số phút mỗi đoạn (default 30), hiển thị tổng thời lượng, tổng số đoạn dự kiến.
  - [ ] `src/features/file-split/components/FileSplitResultList.tsx`
    - Danh sách đoạn đã cắt: tên, thời lượng, nút download từng đoạn.
  - [ ] `src/features/file-split/hooks/useFileSplitter.ts`
    - Hook chứa toàn bộ state machine logic: file được chọn, duration, chunkLengthMinutes, segments, trạng thái ffmpeg (loading/ready), tiến trình cắt, lỗi.
  - [ ] `src/features/file-split/lib/ffmpegClient.ts`
    - Wrapper ffmpeg.wasm: load lazily, hàm `ensureLoaded`, `getDuration`, `splitIntoSegments`.
  - [ ] `src/features/file-split/types.ts`
    - Kiểu dữ liệu dùng chung trong feature (ví dụ `SplitSegment`, `SplitStatus`).
  - [ ] `src/features/file-split/constants.ts`
    - Hằng số: `DEFAULT_CHUNK_MINUTES = 30`, `MAX_SPLIT_FILE_SIZE_MB = 200`, các thông điệp lỗi cố định.
  - [ ] `src/features/file-split/utils/segmentCalculator.ts`
    - Hàm thuần tính danh sách segments từ `durationSeconds` + `chunkLengthMinutes` (để dễ unit test).
  - [ ] (Tuỳ chọn) `src/features/file-split/__tests__/segmentCalculator.test.ts`
    - Unit test cho logic tính segments.

### 1.2. File hiện có cần sửa

- [ ] **`src/App.tsx`**
  - [ ] Thêm state hoặc refactor sang pattern “mode/page” để support nhiều tab:
    - Ví dụ: `const [mode, setMode] = useState<'notes' | 'splitter'>('notes');`
  - [ ] Tách phần top nav/tab bar ra component riêng nếu chưa có:
    - Tạo `src/components/TopNav.tsx` (hoặc chỉnh sửa `Header` hiện có nếu đúng với kiến trúc hiện tại).
  - [ ] Trong `App.tsx`, conditionally render:
    - Khi `mode === 'notes'` → flow hiện tại.
    - Khi `mode === 'splitter'` → render `FileSplitPage`.
- [ ] **`src/components/*`**
  - [ ] Nếu đã có nav/header chung, mở rộng để thêm tab “Cắt file”.
  - [ ] Đảm bảo không thay đổi behavior tab hiện tại ngoài việc thêm lựa chọn mới.

---

## 2. UI/UX Tab “Cắt file”

### 2.1. Thêm state `mode` & routing đơn giản trong `App.tsx`

- [ ] **Trong `App.tsx`**:
  - [ ] Định nghĩa state:
    - `const [mode, setMode] = useState<'notes' | 'splitter'>('notes');`
  - [ ] Pass state và handler vào nav:
    - `<TopNav mode={mode} onChangeMode={setMode} />`
  - [ ] Render theo mode:
    - [ ] `mode === 'notes'` → giữ nguyên flow upload ghi chép + các bước hiện tại.
    - [ ] `mode === 'splitter'` → `<FileSplitPage />`.
- [ ] **Trong `TopNav.tsx`**:
  - [ ] Hiển thị 2 tab:
    - Tab 1: “Ghi chép” (hoặc tên hiện có), mapping `mode='notes'`.
    - Tab 2: “Cắt file”, mapping `mode='splitter'`.
  - [ ] Highlight tab đang chọn (class active).
  - [ ] Nhấn tab đổi `mode` qua callback `onChangeMode`.

> Nếu về sau muốn chuyển sang routing thật (`react-router`), vẫn giữ interface `mode` để dễ refactor.

### 2.2. Layout UI màn “Cắt file” (`FileSplitPage.tsx`)

- [ ] **Layout tổng**:
  - [ ] Dùng container width vừa (max-width ~ 800–960px), căn giữa, có title “Cắt file”.
  - [ ] Chia layout dọc:
    - **Section 1**: Upload + thông tin file.
    - **Section 2**: Controls (chọn phút, thông tin tổng thời lượng + số đoạn).
    - **Section 3**: Nút “Cắt file” + progress.
    - **Section 4**: Kết quả (danh sách đoạn + nút download).
- [ ] **Section upload (`FileSplitUploader`)**:
  - [ ] Input type `file` (chấp nhận audio + video phổ biến: `audio/*,video/*`).
  - [ ] Hiển thị:
    - Tên file, dung lượng (MB với 2 chữ số sau dấu phẩy).
    - Thông báo rõ ràng: “Giới hạn 200MB cho tính năng cắt file”.
  - [ ] Nếu dung lượng > 200MB:
    - [ ] Disable các bước tiếp theo, hiển thị lỗi màu đỏ.
- [ ] **Section controls (`FileSplitControls`)**:
  - [ ] Input số (number) cho “Số phút mỗi đoạn”:
    - Default: 30.
    - Min: ≥ 1.
  - [ ] Hiển thị:
    - Tổng thời lượng file (MM:SS hoặc HH:MM:SS).
    - Số đoạn dự kiến (dùng kết quả từ `segmentCalculator`).
  - [ ] Nếu chưa đo được duration → hiển thị “Đang tính thời lượng…” hoặc “Chưa có file”.
- [ ] **Section hành động & trạng thái**:
  - [ ] Nút “Cắt file” (`onClick` → gọi logic ffmpeg):
    - Disabled khi:
      - Chưa chọn file.
      - File > 200MB.
      - Đang chạy ffmpeg.
  - [ ] Progress indicator:
    - Thanh progress tổng (0–100%) từ ffmpeg (nếu có) hoặc hiển thị trạng thái text:
      - “Đang chuẩn bị…”
      - “Đang cắt đoạn X/Y…”
  - [ ] Hiển thị lỗi chung (nếu ffmpeg fail, file corrupt, định dạng không hỗ trợ).
- [ ] **Section kết quả (`FileSplitResultList`)**:
  - [ ] List các đoạn:
    - Tên gợi ý: `{originalName}_part_{index+1}.ext`.
    - Thời lượng từng đoạn (ước lượng).
  - [ ] Với mỗi đoạn:
    - [ ] Nút “Tải xuống” (tạo `Blob` và dùng `URL.createObjectURL`).
  - [ ] Nếu nhiều đoạn → cho phép “Tải tất cả” (optional, có thể làm sau):
    - Option A: Zip (cần thêm lib like `jszip` – có thể để backlog).
    - Option B: Download từng cái (đơn giản, không thêm dependency).

### 2.3. Nơi hiển thị cảnh báo dung lượng 200MB

- [ ] **Trong UI upload**:
  - [ ] Dòng mô tả ngay dưới input: “Dung lượng tối đa cho Cắt file: 200MB”.
- [ ] **Thông báo lỗi khi vượt quá**:
  - [ ] Nếu file > 200MB:
    - [ ] Hiển thị message nổi bật: “File vượt quá giới hạn 200MB. Vui lòng chọn file nhỏ hơn.”
    - [ ] Disable nút “Cắt file”.
- [ ] **Không ảnh hưởng limit 100MB cho ghi chép**:
  - [ ] Đảm bảo `components/FileUpload.tsx` vẫn giữ logic 100MB riêng, không reuse validation 200MB.

---

## 3. Kỹ thuật ffmpeg.wasm

### 3.1. Thêm dependency

- [ ] **Cài package ffmpeg.wasm**:
  - [ ] Dùng: `@ffmpeg/ffmpeg` (bản chính thức).
  - [ ] Command: `npm install @ffmpeg/ffmpeg`
- [ ] (Nếu cần để đơn giản) Lock version ổn định.

### 3.2. Lazy-load ffmpeg

- [ ] **Trong `ffmpegClient.ts`**:
  - [ ] Import dạng dynamic và singleton:
    - Sử dụng `createFFmpeg`, `fetchFile` từ `@ffmpeg/ffmpeg`.
    - Giữ 1 instance `ffmpeg` và 1 flag `isLoaded`.
  - [ ] Tạo hàm `ensureLoaded(): Promise<void>`:
    - Nếu `ffmpeg` chưa khởi tạo → `createFFmpeg({ corePath?: '...' })`.
    - Nếu chưa `isLoaded` → gọi `ffmpeg.load()`.
    - Set hooks log/progress với `ffmpeg.setProgress`.
- [ ] **Lazy-load theo tab**:
  - [ ] Không import `ffmpegClient` trong `App.tsx`.
  - [ ] Chỉ import `ffmpegClient` bên trong `useFileSplitter` hoặc `FileSplitPage`.
  - [ ] Có thể dùng dynamic import: `const { ensureLoaded, getDuration, splitIntoSegments } = await import('./lib/ffmpegClient');`
- [ ] **UI**:
  - [ ] Khi `ensureLoaded` đang chạy → hiển thị “Đang tải ffmpeg (lần đầu có thể hơi lâu)…”.

### 3.3. Thiết kế wrapper `ffmpegClient.ts`

- [ ] **API đề xuất**:

  - [ ] `ensureLoaded(options?: { corePath?: string }): Promise<void>`
    - Chịu trách nhiệm khởi tạo & load ffmpeg; gọi trước khi dùng các hàm khác.
  - [ ] `getDuration(file: File): Promise<number>`
    - Kiểm tra duration (fallback cho trường hợp HTMLMediaElement không dùng được).
  - [ ] `splitIntoSegments(params: { file: File; segmentSecondsList: number[]; onProgress?: (info: { current: number; total: number; ratio?: number }) => void; }): Promise<Blob[]>`
    - Nhận file + danh sách điểm cắt (tính trước).
    - Trả về mảng `Blob` tương ứng với từng đoạn.
    - Gọi `onProgress` mỗi lần hoàn thành 1 đoạn (hoặc dùng `setProgress`).
- [ ] **Chi tiết implement chính**:
  - [ ] Dùng `fetchFile(file)` để đưa vào fs ảo của ffmpeg.
  - [ ] Chạy lệnh `ffmpeg.run` với tham số `-ss`, `-t`, `-i` cho từng segment:
    - Pattern: `ffmpeg -ss start -t duration -i input -c copy outputX.ext`
  - [ ] Đọc output mỗi segment về bằng `ffmpeg.FS('readFile', 'outputX.ext')` rồi wrap thành `Blob`.
  - [ ] Cleanup file tạm trên fs ảo sau khi xong (xóa input/output).

---

## 4. Logic cắt & giới hạn 200MB

### 4.1. Đo duration

- [ ] **Ưu tiên HTMLMediaElement**:
  - [ ] Trong `useFileSplitter`:
    - Tạo `URL.createObjectURL(file)` → gán cho `<audio>` hoặc `<video>` hidden.
    - Lắng nghe event `loadedmetadata` để lấy `duration` (giây).
    - Khi có duration:
      - Set state `durationSeconds`.
      - Tính lại `segments` thông qua hàm `computeSegments`.
  - [ ] Sau khi xong, gọi `URL.revokeObjectURL`.
- [ ] **Fallback qua ffmpeg** (optional):
  - [ ] Dùng `ffmpegClient.getDuration(file)`:
    - Chạy ffmpeg command để parse ra duration.
  - [ ] Nếu cả hai fail → báo lỗi “Không thể xác định thời lượng file này”.

### 4.2. Thuật toán tính danh sách segments (`segmentCalculator.ts`)

- [ ] **Hàm thuần**: `computeSegments(durationSeconds: number, chunkMinutes: number): { start: number; end: number }[]`
  - [ ] Input:
    - `durationSeconds` (float).
    - `chunkMinutes` integer ≥ 1.
  - [ ] Logic:
    - `const chunkSeconds = chunkMinutes * 60;`
    - Bắt đầu từ `start = 0`.
    - Trong khi `start < durationSeconds`:
      - `end = Math.min(start + chunkSeconds, durationSeconds)`.
      - Push `{ start, end }`.
      - `start = end`.
  - [ ] Edge cases:
    - File ngắn hơn `chunkSeconds` → chỉ 1 đoạn.
    - Duration có phần lẻ giây → chấp nhận end = durationSeconds.
- [ ] **Dùng trong hook**:
  - [ ] Mỗi khi `durationSeconds` hoặc `chunkMinutes` thay đổi:
    - Recompute segments → hiển thị cho user.
- [ ] **Mapping sang ffmpeg**:
  - [ ] Với mỗi `{start, end}`:
    - `segmentDuration = end - start`.
    - Lệnh ffmpeg: `-ss start -t segmentDuration`.

### 4.3. Validate 200MB

- [ ] **Trong `useFileSplitter` hoặc uploader**:
  - [ ] Khi user chọn file:
    - `const sizeMB = file.size / (1024 * 1024);`
    - Nếu `sizeMB > 200`:
      - Set `error = 'File vượt quá giới hạn 200MB cho tính năng cắt file.'`.
      - Clear `durationSeconds`, `segments`, không cho phép bấm nút “Cắt file”.
  - [ ] Nếu `sizeMB <= 200`:
    - Cho phép tiếp tục (đo duration, hiển thị segments…).
- [ ] **Không re-use logic 100MB**:
  - [ ] Giữ riêng constants: `MAX_SPLIT_FILE_SIZE_MB` trong `file-split/constants.ts`.
  - [ ] Đảm bảo `components/FileUpload.tsx` cho ghi chép vẫn dùng limit 100MB cũ.

### 4.4. Hook `useFileSplitter`

- [ ] **State chính**:
  - [ ] `file: File | null`
  - [ ] `fileSizeMB: number | null`
  - [ ] `durationSeconds: number | null`
  - [ ] `chunkMinutes: number` (default 30)
  - [ ] `segments: { start: number; end: number }[]`
  - [ ] `status: 'idle' | 'loading-ffmpeg' | 'ready' | 'splitting' | 'done' | 'error'`
  - [ ] `progress: { current: number; total: number; ratio: number }`
  - [ ] `error: string | null`
  - [ ] `blobs: Blob[]` (kết quả sau khi cắt)
- [ ] **API hook**:
  - [ ] `onSelectFile(file: File)`:
    - Validate 200MB.
    - Nếu hợp lệ:
      - Set `file`, `fileSizeMB`.
      - Trigger đo duration bằng HTMLMediaElement.
  - [ ] `setChunkMinutes(value: number)`:
    - Update state, recompute segments nếu đã có duration.
  - [ ] `splitFile()`:
    - Gọi `ensureLoaded`.
    - Từ `segments`, map ra `segmentSecondsList`.
    - Gọi `splitIntoSegments`.
    - Update `progress` mỗi lần onProgress.
    - Lưu `blobs` kết quả + chuyển `status` sang `done`.
- [ ] **Xử lý lỗi**:
  - [ ] Wrap toàn bộ process trong `try/catch`, set `status = 'error'` + `error` message.
  - [ ] Reset phù hợp khi user chọn file mới.

---

## 5. Test plan

### 5.1. Unit test (logic thuần)

- [ ] **Test cho `segmentCalculator.ts`**:
  - [ ] Case 1: `durationSeconds = 1800` (30 phút), `chunkMinutes = 30`:
    - Kết quả: 1 segment `{ start: 0, end: 1800 }`.
  - [ ] Case 2: `durationSeconds = 5400` (90 phút), `chunkMinutes = 30`:
    - Kết quả: 3 segments `[0–1800], [1800–3600], [3600–5400]`.
  - [ ] Case 3: `durationSeconds = 2000` (~33m20s), `chunkMinutes = 30`:
    - Kết quả: 2 segments `[0–1800], [1800–2000]`.
  - [ ] Case 4: `durationSeconds = 100`, `chunkMinutes = 5`:
    - Kỳ vọng 1 segment `[0–100]` (đảm bảo không tạo đoạn vượt duration).
  - [ ] Case 5: kiểm tra input corner (chunkMinutes rất nhỏ, ví dụ 1).
- [ ] **Test helper validate dung lượng** (nếu tách riêng):
  - [ ] input `sizeBytes = 199 * 1024 * 1024` → pass.
  - [ ] input `sizeBytes = 201 * 1024 * 1024` → fail + error.

### 5.2. Manual test checklist – UI & chức năng

- [ ] **Upload & giới hạn dung lượng**:
  - [ ] Upload file audio/video < 200MB:
    - Thấy tên file, dung lượng, không có lỗi.
  - [ ] Upload file > 200MB:
    - Thấy lỗi “vượt quá 200MB”.
    - Nút “Cắt file” bị disable.
- [ ] **Đo duration & hiển thị segments**:
  - [ ] Upload file dài khoảng 10 phút, chunk 30 phút:
    - Thấy 1 segment.
  - [ ] Upload file ~70 phút, chunk 30 phút:
    - Thấy 3 segments với thời lượng tương đối chính xác.
  - [ ] Thay đổi chunk từ 30 → 10 → số đoạn tăng tương ứng.
- [ ] **Flow cắt file**:
  - [ ] Với file ~5 phút, chunk 2 phút:
    - Nhấn “Cắt file”.
    - Thấy progress thay đổi (hoặc status text).
    - Sau khi xong:
      - Danh sách các đoạn xuất hiện.
      - Tải từng file về và có thể mở được (audio/video chạy bình thường).
- [ ] **Trải nghiệm lần đầu load ffmpeg**:
  - [ ] Lần đầu vào tab “Cắt file”:
    - Thấy thông báo “Đang tải ffmpeg…” khi gọi cắt lần đầu (nếu load lazy lúc bấm).
    - Sau lần đầu, các lần cắt tiếp theo nhanh hơn rõ rệt (không phải load lại).
- [ ] **Chuyển tab giữa “Ghi chép” và “Cắt file”**:
  - [ ] Đang ở “Ghi chép”, mọi thứ hoạt động như cũ.
  - [ ] Chuyển sang “Cắt file”:
    - Không reload toàn app (nếu có thể).
  - [ ] Chuyển lại “Ghi chép”:
    - State ghi chép không bị reset ngoài ý muốn (nếu chấp nhận reset thì document rõ).
- [ ] **Trải nghiệm lỗi**:
  - [ ] Simulate file định dạng lạ hoặc ffmpeg lỗi:
    - Thấy thông báo lỗi rõ, không crash app.
  - [ ] Mạng chậm (nếu ffmpeg core tải qua HTTP CDN):
    - Thấy message phù hợp trong lúc ffmpeg load.

---

## 6. Checklist thực thi cho executor (tóm tắt)

- [ ] Setup thư mục `src/features/file-split/` và các file con như mô tả.
- [ ] Cập nhật `App.tsx` + `TopNav.tsx` để hỗ trợ `mode: 'notes' | 'splitter'`.
- [ ] Implement UI `FileSplitPage` với các component uploader, controls, result list.
- [ ] Cài và tích hợp `@ffmpeg/ffmpeg`, viết `ffmpegClient.ts` với API `ensureLoaded`, `getDuration`, `splitIntoSegments`.
- [ ] Implement hook `useFileSplitter` quản lý toàn bộ flow cắt file + validate 200MB.
- [ ] Viết `segmentCalculator.ts` + unit test.
- [ ] Chạy test + thực hiện manual test checklist cho các case chính.

