# Hướng Dẫn Deploy: GitHub + Vercel + Supabase

## 📋 Tổng Quan

Hướng dẫn này sẽ giúp bạn:
1. ✅ Đưa code lên GitHub
2. ✅ Deploy lên Vercel (hosting miễn phí)
3. ✅ Tích hợp Supabase để lưu transcriptions và summaries

---

## 🗄️ Bước 1: Setup Supabase Database

### 1.1. Tạo Supabase Project

1. Truy cập [supabase.com](https://supabase.com)
2. Đăng ký/Đăng nhập
3. Click **"New Project"**
4. Điền thông tin:
   - **Name**: `meeting-scribe-ai-pro`
   - **Database Password**: (tạo password mạnh)
   - **Region**: Singapore (gần VN nhất)
5. Click **"Create new project"** (chờ ~2 phút)

### 1.2. Tạo Database Tables

Vào **SQL Editor** và chạy script sau:

```sql
-- Table: transcriptions
CREATE TABLE transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_name TEXT NOT NULL,
  file_size BIGINT,
  transcription_text TEXT NOT NULL,
  user_id TEXT
);

-- Table: summaries
CREATE TABLE summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  prompt_used TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (vì app không có authentication)
CREATE POLICY "Allow anonymous access" ON transcriptions FOR ALL USING (true);
CREATE POLICY "Allow anonymous access" ON summaries FOR ALL USING (true);
```

### 1.3. Lấy Supabase Credentials

1. Vào **Settings** > **API**
2. Copy 2 giá trị:
   - **Project URL** (ví dụ: `https://xxxxx.supabase.co`)
   - **anon public key** (key dài bắt đầu bằng `eyJ...`)

---

## 📦 Bước 2: Chuẩn Bị Code

### 2.1. Cài đặt Supabase Client

```bash
cd /Users/tanliem/Downloads/meeting-scribe-ai-pro
npm install @supabase/supabase-js
```

### 2.2. Tạo file cấu hình

**Tạo `.env.example`** (template cho người khác):
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Cập nhật `.env.local`** (thêm Supabase credentials):
```env
VITE_GEMINI_API_KEY=PLACEHOLDER_API_KEY
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 🐙 Bước 3: Push lên GitHub

### 3.1. Kiểm tra .gitignore

Đảm bảo file `.gitignore` có:
```
node_modules
dist
.env.local
.DS_Store
```

### 3.2. Initialize Git & Push

```bash
# Nếu chưa có git
git init

# Add tất cả files
git add .

# Commit
git commit -m "Initial commit: Meeting Scribe AI Pro with Supabase"

# Tạo repo trên GitHub (cần cài GitHub CLI: brew install gh)
gh auth login
gh repo create meeting-scribe-ai-pro --public --source=. --push
```

**Hoặc tạo repo thủ công:**
1. Vào [github.com/new](https://github.com/new)
2. Tạo repo tên `meeting-scribe-ai-pro`
3. Chạy:
```bash
git remote add origin https://github.com/YOUR_USERNAME/meeting-scribe-ai-pro.git
git branch -M main
git push -u origin main
```

---

## 🚀 Bước 4: Deploy lên Vercel

### 4.1. Import Project

1. Truy cập [vercel.com](https://vercel.com)
2. Đăng nhập bằng GitHub
3. Click **"Add New Project"**
4. Import repo `meeting-scribe-ai-pro`

### 4.2. Configure Project

**Framework Preset**: Vite
**Root Directory**: `./`
**Build Command**: `npm run build`
**Output Directory**: `dist`

### 4.3. Environment Variables

Thêm 2 biến môi trường:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` |

> **Lưu ý**: Không cần thêm `VITE_GEMINI_API_KEY` vì users sẽ nhập qua UI

### 4.4. Deploy

Click **"Deploy"** và chờ ~2 phút

---

## ✅ Bước 5: Verify Deployment

1. Mở URL Vercel (ví dụ: `https://meeting-scribe-ai-pro.vercel.app`)
2. Nhập API key
3. Upload file audio và test transcription
4. Kiểm tra Supabase > Table Editor xem data đã được lưu chưa

---

## 🔄 Cập Nhật Sau Này

Mỗi khi bạn thay đổi code:

```bash
git add .
git commit -m "Your commit message"
git push
```

Vercel sẽ **tự động deploy** lại!

---

## 🆘 Troubleshooting

### Lỗi build trên Vercel
- Kiểm tra `npm run build` chạy được local không
- Xem build logs trên Vercel

### Không kết nối được Supabase
- Kiểm tra environment variables đã đúng chưa
- Verify RLS policies đã enable chưa

### API key không hoạt động
- Đảm bảo users nhập đúng API key từ Google AI Studio
- Check browser console để xem error messages

---

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
