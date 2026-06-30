-- ============================================================================
-- Bluy - database schema
-- Run this once in your Supabase project:
--   Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- It is safe to re-run (everything is "if not exists" / "drop if exists").
-- ============================================================================

-- 1) Profiles: one row per user. Holds subscription status (Stripe will set
--    is_subscribed later; for now the in-app "Subscribe" button sets it).
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  is_subscribed boolean not null default false,
  created_at    timestamptz not null default now()
);

-- 2) Follows: which stories a user follows.
create table if not exists public.follows (
  user_id    uuid not null references auth.users(id) on delete cascade,
  story_id   text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

-- 3) Reading progress: the last chapter a user opened in each story.
create table if not exists public.reading_progress (
  user_id    uuid not null references auth.users(id) on delete cascade,
  story_id   text not null,
  chapter_id text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security: each user can only read/write their OWN rows.
-- ---------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.follows          enable row level security;
alter table public.reading_progress enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- follows
drop policy if exists "follows_select_own" on public.follows;
create policy "follows_select_own" on public.follows
  for select using (auth.uid() = user_id);
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows
  for insert with check (auth.uid() = user_id);
drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows
  for delete using (auth.uid() = user_id);

-- reading_progress
drop policy if exists "progress_select_own" on public.reading_progress;
create policy "progress_select_own" on public.reading_progress
  for select using (auth.uid() = user_id);
drop policy if exists "progress_insert_own" on public.reading_progress;
create policy "progress_insert_own" on public.reading_progress
  for insert with check (auth.uid() = user_id);
drop policy if exists "progress_update_own" on public.reading_progress;
create policy "progress_update_own" on public.reading_progress
  for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new user signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
