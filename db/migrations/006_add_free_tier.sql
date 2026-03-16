-- Migration 006: Add free tier support
-- Idempotent: safe to run multiple times

-- 1. Daily conversion quota table (date-keyed, no cron job needed — old dates ignored naturally)
CREATE TABLE IF NOT EXISTS public.daily_conversion_usage (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date  date NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC'),
  count       integer NOT NULL DEFAULT 0,
  CONSTRAINT daily_conversion_usage_user_date_key UNIQUE (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_conversion_usage_user_date
  ON public.daily_conversion_usage(user_id, usage_date DESC);
