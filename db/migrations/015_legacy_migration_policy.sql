-- Migration 015: Legacy migration policy contract (D-08/D-09)
-- Purpose:
-- 1) Track auditable migration batches.
-- 2) Assign user-specific legacy sunset windows per batch.

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
