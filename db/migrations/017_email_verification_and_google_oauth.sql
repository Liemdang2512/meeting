-- 017_email_verification_and_google_oauth: email verification + Google account linking
-- Idempotent for re-runs.

ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz NULL;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS google_sub text NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_users_google_sub
  ON auth.users (google_sub)
  WHERE google_sub IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_email_verification_tokens_token_hash UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id
  ON auth.email_verification_tokens (user_id);

-- Không set hàng loạt email_verified_at: nếu làm vậy mọi user có password (kể cả vừa đăng ký)
-- trước khi migration chạy) đều bị coi là đã verify → đăng nhập không cần email, đăng ký lại bị 409.
-- Grandfather tài khoản cũ (nếu cần): chạy SQL thủ công một lần trên prod, có ngày cắt cụ thể, ví dụ:
-- UPDATE auth.users SET email_verified_at = now()
-- WHERE email_verified_at IS NULL AND password_hash IS NOT NULL AND created_at < TIMESTAMPTZ '2026-04-01 00:00:00Z';
