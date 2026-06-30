-- ============================================================================
-- Bluy - Wattpad-style story-info fields.
-- Run via:  node scripts/run-sql.mjs supabase/authoring3.sql
-- Safe to re-run. All columns are nullable/defaulted, so existing rows are fine.
-- ============================================================================
alter table public.stories add column if not exists language text;
alter table public.stories add column if not exists story_type text;
alter table public.stories add column if not exists tags text[] not null default '{}';
alter table public.stories add column if not exists copyright text;
alter table public.stories add column if not exists is_mature boolean not null default false;
alter table public.stories add column if not exists main_characters text[] not null default '{}';
alter table public.stories add column if not exists target_audience text;
