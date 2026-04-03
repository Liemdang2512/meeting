-- Migration 012: Add performance-focused indexes for high-traffic auth/log queries
-- Idempotent: safe to run multiple times

CREATE INDEX IF NOT EXISTS idx_auth_users_email
  ON auth.users(email);

CREATE INDEX IF NOT EXISTS idx_token_usage_logs_user_created_at
  ON public.token_usage_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_usage_logs_feature_created_at
  ON public.token_usage_logs(feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_usage_logs_user_feature_created_at
  ON public.token_usage_logs(user_id, feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transcriptions_user_created_at
  ON public.transcriptions(user_id, created_at DESC);
