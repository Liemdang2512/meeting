-- Script tạo bảng token_usage_logs và cấu hình RLS cho chức năng theo dõi token

-- 1. Tạo bảng token_usage_logs
CREATE TABLE IF NOT EXISTS public.token_usage_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    action_type text NOT NULL,
    feature text NOT NULL,
    input_tokens integer,
    output_tokens integer,
    total_tokens integer,
    model text NOT NULL,
    metadata jsonb
);

-- 2. Đánh index để tối ưu truy vấn cho Admin và lọc dữ liệu
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_user_id ON public.token_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_created_at ON public.token_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_feature ON public.token_usage_logs(feature);

-- 3. Tạo function kiểm tra admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  -- Lấy role từ bảng profiles của user hiện tại
  SELECT role INTO v_role
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- Trả về true nếu role là admin
  RETURN coalesce(v_role, '') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Đảm bảo bảng profiles có cột role
-- Chú ý: Nếu bảng profiles của bạn chưa có cột role thì un-comment dòng dưới đây
-- ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 5. Bật Row Level Security (RLS) cho bảng token_usage_logs
ALTER TABLE public.token_usage_logs ENABLE ROW LEVEL SECURITY;

-- 6. Tạo policy: user có thể tự insert dữ liệu của mình (khi dùng app)
CREATE POLICY "Users can insert their own token logs"
    ON public.token_usage_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 7. Tạo policy: user có thể xem dữ liệu token_logs của chính mình
CREATE POLICY "Users can view their own token logs"
    ON public.token_usage_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- 8. Tạo policy: admin có thể xem toàn bộ data của tất cả user
CREATE POLICY "Admins can view all token logs"
    ON public.token_usage_logs
    FOR SELECT
    USING (public.is_admin());
