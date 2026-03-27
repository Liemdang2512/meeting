-- Migration 010: Add features column to profiles
-- Stores list of features each user has access to (based on role)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}';

-- Free: transcription + summary only
UPDATE public.profiles
  SET features = ARRAY['transcription', 'summary']
  WHERE role = 'free' AND features = '{}';

-- Pro: all features
UPDATE public.profiles
  SET features = ARRAY['transcription', 'summary', 'mindmap', 'export_pdf', 'export_docx', 'email', 'diagram']
  WHERE role = 'pro' AND features = '{}';

-- Admin: all features
UPDATE public.profiles
  SET features = ARRAY['transcription', 'summary', 'mindmap', 'export_pdf', 'export_docx', 'email', 'diagram']
  WHERE role = 'admin' AND features = '{}';
