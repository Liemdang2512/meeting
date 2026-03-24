-- Migration 009: Add multi-group workflow support
-- Per D-05: 1 user can belong to multiple groups (text[] array)
-- Per D-08: Legacy users backfilled to specialist

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS workflow_groups text[] NOT NULL DEFAULT '{specialist}';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_workflow_group text NOT NULL DEFAULT 'specialist';

-- Backfill legacy users who may have NULL values (D-08)
UPDATE public.profiles
  SET workflow_groups = '{specialist}',
      active_workflow_group = 'specialist'
  WHERE workflow_groups IS NULL
     OR active_workflow_group IS NULL;
