-- Migration 011: Remove active_workflow_group, migrate role-based plans to workflow_groups
-- After this: role = 'free' | 'admin', workflow_groups = subscribed plans

-- Step 1: For users with reporter/specialist/officer role, ensure their plan is in workflow_groups
UPDATE public.profiles
SET workflow_groups = CASE
  WHEN role IN ('reporter', 'specialist', 'officer')
    AND NOT (role = ANY(COALESCE(workflow_groups, '{}'::text[])))
  THEN ARRAY[role]::text[]
  ELSE COALESCE(workflow_groups, '{}'::text[])
END
WHERE role IN ('reporter', 'specialist', 'officer');

-- Step 2: Reset reporter/specialist/officer roles to 'free'
UPDATE public.profiles
SET role = 'free'
WHERE role IN ('reporter', 'specialist', 'officer');

-- Step 3: Drop active_workflow_group column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS active_workflow_group;
