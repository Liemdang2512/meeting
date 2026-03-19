-- Migration 008: Add app_settings key-value store
-- Idempotent: safe to run multiple times

CREATE TABLE IF NOT EXISTS public.app_settings (
  key   text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
