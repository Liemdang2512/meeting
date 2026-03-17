-- Migration 007: Add per-user daily quota limit override
-- Idempotent: safe to run multiple times

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_limit integer;

-- NULL = use system default (1 for free tier)
