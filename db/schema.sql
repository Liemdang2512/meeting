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
    email_verified_at timestamptz NULL,
    google_sub text NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

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
    role text DEFAULT 'free',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz,
    workflow_groups text[] NOT NULL DEFAULT '{}',
    features text[] NOT NULL DEFAULT '{}',
    free_allowance_period_utc text NULL
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

-- ==================== WALLET / BILLING (migration 014) ====================

CREATE TABLE IF NOT EXISTS public.wallet_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
    event_type IN ('topup', 'debit', 'refund', 'migration_grant', 'migration_expire', 'adjustment')
  ),
  action_type text,
  pack_id text,
  amount_credits integer NOT NULL CHECK (amount_credits <> 0),
  balance_after_credits integer NOT NULL,
  correlation_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_ledger_correlation_id
  ON public.wallet_ledger(correlation_id);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_created
  ON public.wallet_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.credit_pack_catalog (
  pack_id text PRIMARY KEY,
  price_vnd integer NOT NULL CHECK (price_vnd > 0),
  credits integer NOT NULL CHECK (credits > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.billing_rate_card (
  action_type text PRIMARY KEY,
  cost_credits integer NOT NULL CHECK (cost_credits > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.prevent_wallet_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'wallet_ledger is append-only; % is not allowed', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_ledger_no_update ON public.wallet_ledger;
CREATE TRIGGER trg_wallet_ledger_no_update
BEFORE UPDATE ON public.wallet_ledger
FOR EACH ROW
EXECUTE FUNCTION public.prevent_wallet_ledger_mutation();

DROP TRIGGER IF EXISTS trg_wallet_ledger_no_delete ON public.wallet_ledger;
CREATE TRIGGER trg_wallet_ledger_no_delete
BEFORE DELETE ON public.wallet_ledger
FOR EACH ROW
EXECUTE FUNCTION public.prevent_wallet_ledger_mutation();

INSERT INTO public.credit_pack_catalog (pack_id, price_vnd, credits, active)
VALUES
  ('specialist', 299000, 299000, true),
  ('reporter', 399000, 399000, true),
  ('officer', 499000, 499000, true)
ON CONFLICT (pack_id) DO UPDATE
SET price_vnd = EXCLUDED.price_vnd,
    credits = EXCLUDED.credits,
    active = EXCLUDED.active,
    updated_at = NOW();

INSERT INTO public.billing_rate_card (action_type, cost_credits, active)
VALUES
  ('minutes-generate', 10000, true)
ON CONFLICT (action_type) DO UPDATE
SET cost_credits = EXCLUDED.cost_credits,
    active = EXCLUDED.active,
    updated_at = NOW();

-- ==================== LEGACY MIGRATION POLICY (migration 015) ====================

CREATE TABLE IF NOT EXISTS public.legacy_migration_batches (
  code text PRIMARY KEY,
  description text,
  created_by text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.legacy_migration_assignments (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_code text NOT NULL REFERENCES public.legacy_migration_batches(code) ON DELETE RESTRICT,
  legacy_access_until timestamptz NOT NULL,
  assigned_by text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT NOW(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, batch_code)
);

CREATE INDEX IF NOT EXISTS idx_legacy_migration_assignments_user_id
  ON public.legacy_migration_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_legacy_migration_assignments_batch_code
  ON public.legacy_migration_assignments(batch_code);

CREATE INDEX IF NOT EXISTS idx_legacy_migration_assignments_access_until
  ON public.legacy_migration_assignments(legacy_access_until);

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_token_usage_logs_user_id
    ON public.token_usage_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_token_usage_logs_created_at
    ON public.token_usage_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_usage_logs_feature
    ON public.token_usage_logs(feature);

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
