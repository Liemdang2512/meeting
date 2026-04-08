-- 018: Hoàn tác kiểu "đã verify" sai do bản 017 cũ (UPDATE email_verified_at cho mọi user có password).
-- Chỉ bỏ cờ verify nếu user vẫn có bản ghi token xác nhận nhưng chưa từng dùng token nào (chưa bấm link).
-- User không có dòng nào trong email_verification_tokens → coi là tài khoản cũ, giữ nguyên verified.

UPDATE auth.users u
SET email_verified_at = NULL
WHERE u.email_verified_at IS NOT NULL
  AND u.google_sub IS NULL
  AND u.password_hash IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.email_verification_tokens t
    WHERE t.user_id = u.id AND t.used_at IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM auth.email_verification_tokens t
    WHERE t.user_id = u.id
  );
