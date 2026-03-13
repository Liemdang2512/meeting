-- Drop all objects in FK dependency order (children first)
-- Use CASCADE to handle any remaining FK references
DROP TABLE IF EXISTS public.token_usage_logs CASCADE;
DROP TABLE IF EXISTS public.summaries CASCADE;
DROP TABLE IF EXISTS public.transcriptions CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP TABLE IF EXISTS auth.users CASCADE;
DROP FUNCTION IF EXISTS auth.uid() CASCADE;
DROP FUNCTION IF EXISTS auth.role() CASCADE;
DROP SCHEMA IF EXISTS auth CASCADE;
DROP ROLE IF EXISTS authenticated;
