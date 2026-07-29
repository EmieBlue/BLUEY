-- Per-chapter comments. NOTE: this table is deliberately NOT named "comments" —
-- ad-blockers / privacy shields (uBlock Origin, Brave, AdGuard, EasyPrivacy…)
-- block any request whose URL path contains "comments", which silently breaks the
-- Supabase REST endpoint for readers who run those blockers. "reader_notes" is a
-- neutral name that dodges the filters. The UI still calls them "Comments".
--
-- Reading is public; posting requires a signed-in user (RLS). The commenter's
-- display name is stored on the row because public.profiles is read-your-own-only
-- under RLS (and holds emails), so we can't join to it for other users' names.
-- Safe to re-run.

-- Retire the old (ad-blocked) table name. It held no real data.
drop table if exists public.comments cascade;

create table if not exists public.reader_notes (
  id          uuid primary key default gen_random_uuid(),
  story_id    text not null,
  chapter_id  text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  author_name text,
  body        text not null,
  created_at  timestamptz not null default now(),
  foreign key (story_id, chapter_id) references public.chapters(story_id, id) on delete cascade
);

create index if not exists reader_notes_story_chapter_idx
  on public.reader_notes (story_id, chapter_id, created_at);

alter table public.reader_notes enable row level security;

-- Anyone (even signed-out) can read.
drop policy if exists reader_notes_public_read on public.reader_notes;
create policy reader_notes_public_read on public.reader_notes
  for select using (true);

-- Signed-in users may post, but only as themselves.
drop policy if exists reader_notes_insert_own on public.reader_notes;
create policy reader_notes_insert_own on public.reader_notes
  for insert with check (auth.uid() = user_id);

-- A user can delete their own note; a story's author can delete any note on their
-- own story (moderation).
drop policy if exists reader_notes_delete_own_or_author on public.reader_notes;
create policy reader_notes_delete_own_or_author on public.reader_notes
  for delete using (
    auth.uid() = user_id
    or auth.uid()::text = (select author_id from public.stories where id = reader_notes.story_id)
  );
