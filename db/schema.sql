-- =====================================================
-- Full schema for meeting-main integration testing
-- Source: lib/database.types.ts + setup_token_usage_logs.sql
-- Run on: postgres:16-alpine (gen_random_uuid() built-in, no pgcrypto needed)
-- =====================================================

-- ==================== AUTH STUB ====================
-- Simulates Supabase's auth schema for local testing

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text,
    password_hash text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- auth.uid() reads from JWT claims config var — same mechanism as real Supabase
-- Source: https://github.com/supabase/supabase/issues/4244
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
  )
$$;

-- Role required by RLS policies that check SET LOCAL ROLE
DO $$ BEGIN
  CREATE ROLE authenticated;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==================== PUBLIC SCHEMA ====================

CREATE TABLE IF NOT EXISTS public.transcriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now() NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    transcription_text text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.summaries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now() NOT NULL,
    transcription_id uuid REFERENCES public.transcriptions(id) ON DELETE SET NULL,
    summary_text text NOT NULL,
    prompt_used text
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role text DEFAULT 'user',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.user_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gemini_api_key text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT user_settings_user_id_key UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.token_usage_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL,
    action_type text NOT NULL,
    feature text NOT NULL,
    input_tokens integer,
    output_tokens integer,
    total_tokens integer,
    model text NOT NULL,
    metadata jsonb
);

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_token_usage_logs_user_id
    ON public.token_usage_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_token_usage_logs_created_at
    ON public.token_usage_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_usage_logs_feature
    ON public.token_usage_logs(feature);

-- ==================== FUNCTIONS ====================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role
    FROM public.profiles
    WHERE user_id = auth.uid();
    RETURN coalesce(v_role, '') = 'admin';
END;
$$;

-- ==================== RLS ====================

ALTER TABLE public.token_usage_logs ENABLE ROW LEVEL SECURITY;

-- Drop policies before recreating to ensure idempotency
DROP POLICY IF EXISTS "Users can insert their own token logs" ON public.token_usage_logs;
DROP POLICY IF EXISTS "Users can view their own token logs" ON public.token_usage_logs;
DROP POLICY IF EXISTS "Admins can view all token logs" ON public.token_usage_logs;

CREATE POLICY "Users can insert their own token logs"
    ON public.token_usage_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own token logs"
    ON public.token_usage_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all token logs"
    ON public.token_usage_logs FOR SELECT
    USING (public.is_admin());
