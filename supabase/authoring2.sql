-- ============================================================================
-- Bluy - Wattpad-style authoring: cover images + drafts.
-- Run via:  node scripts/run-sql.mjs supabase/authoring2.sql
-- Safe to re-run.
-- ============================================================================

-- 1) New columns on stories.
alter table public.stories add column if not exists cover_image_url text;
alter table public.stories add column if not exists status text not null default 'published';

-- 2) Draft visibility: published stories are public; drafts only to their owner.
drop policy if exists "stories_public_read" on public.stories;
create policy "stories_public_read" on public.stories
  for select using (status = 'published' or owner_id = auth.uid());

drop policy if exists "chapters_public_read" on public.chapters;
create policy "chapters_public_read" on public.chapters
  for select using (
    exists (
      select 1 from public.stories s
      where s.id = chapters.story_id
        and (s.status = 'published' or s.owner_id = auth.uid())
    )
  );

-- 3) Storage bucket for uploaded cover images (public read).
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

drop policy if exists "covers_public_read" on storage.objects;
create policy "covers_public_read" on storage.objects
  for select using (bucket_id = 'covers');

drop policy if exists "covers_auth_insert" on storage.objects;
create policy "covers_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'covers');

drop policy if exists "covers_auth_update" on storage.objects;
create policy "covers_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'covers');

drop policy if exists "covers_auth_delete" on storage.objects;
create policy "covers_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'covers');
