-- ============================================================================
-- Bluy - authoring migration: let the author write/publish from the app.
-- Run via:  node scripts/run-sql.mjs supabase/authoring.sql
-- Safe to re-run.
-- ============================================================================

-- 1) Author flag (who may publish). New signups default to false.
alter table public.profiles add column if not exists is_author boolean not null default false;

-- 2) Ownership of user-created stories.
alter table public.stories add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- 3) Write policies (public read stays as-is; these only ADD write access).

-- stories: an author inserts stories they own; owner edits/deletes their own.
drop policy if exists "stories_insert_author" on public.stories;
create policy "stories_insert_author" on public.stories for insert
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_author)
  );
drop policy if exists "stories_update_own" on public.stories;
create policy "stories_update_own" on public.stories for update
  using (owner_id = auth.uid());
drop policy if exists "stories_delete_own" on public.stories;
create policy "stories_delete_own" on public.stories for delete
  using (owner_id = auth.uid());

-- authors: a user upserts their own author row (id = their auth uid).
drop policy if exists "authors_insert_own" on public.authors;
create policy "authors_insert_own" on public.authors for insert
  with check (id = auth.uid()::text);
drop policy if exists "authors_update_own" on public.authors;
create policy "authors_update_own" on public.authors for update
  using (id = auth.uid()::text);

-- chapters: manage chapters of stories you own.
drop policy if exists "chapters_insert_own" on public.chapters;
create policy "chapters_insert_own" on public.chapters for insert
  with check (exists (select 1 from public.stories s where s.id = chapters.story_id and s.owner_id = auth.uid()));
drop policy if exists "chapters_update_own" on public.chapters;
create policy "chapters_update_own" on public.chapters for update
  using (exists (select 1 from public.stories s where s.id = chapters.story_id and s.owner_id = auth.uid()));
drop policy if exists "chapters_delete_own" on public.chapters;
create policy "chapters_delete_own" on public.chapters for delete
  using (exists (select 1 from public.stories s where s.id = chapters.story_id and s.owner_id = auth.uid()));

-- 4) Make the existing (owner's) profiles authors so they can publish now.
--    New signups remain non-authors ("just me for now").
update public.profiles set is_author = true;
