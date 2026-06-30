-- ============================================================================
-- Bluy - chapter media (image + video at the top of a chapter).
-- Run via:  node scripts/run-sql.mjs supabase/authoring4.sql
-- Safe to re-run.
-- ============================================================================
alter table public.chapters add column if not exists image_url text;
alter table public.chapters add column if not exists video_url text;
