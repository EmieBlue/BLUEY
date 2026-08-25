-- Hard-lock premium chapter text (server-enforced), applied 2026-08-16.
--
-- Problem: chapter bodies live in public.chapters.paragraphs (text[]). The app's
-- story-list query used to select chapters(*), so EVERY chapter's paragraphs —
-- including locked, premium ones — were shipped to the browser. The paywall was
-- only visual; the text was reachable via dev-tools without paying.
--
-- Fix: the paragraphs column is no longer selectable by the API roles. Chapter
-- text is served only through a SECURITY DEFINER function that checks access
-- (free chapter, story owner, or a purchase row). Writes are unaffected because
-- INSERT/UPDATE privileges are separate from SELECT.
--
-- Re-runnable (idempotent). Run against the project DB after any rebuild/restore,
-- or this lock silently disappears and premium text leaks again.

-- 1) Purchase-gated reader for a single chapter's paragraphs. Runs as the owner
--    (definer) so it can read the column the calling role cannot; auth.uid()
--    still identifies the caller for the access check. Returns NULL when the
--    caller may not read the chapter.
--
--    Buy-the-book gating: the paywall begins at the FIRST premium chapter and
--    covers that chapter AND everything ordered after it — so a free chapter
--    placed after a locked one can't be used to skip the paywall. A chapter is
--    free to read only when NO premium chapter exists at or before its `order`.
create or replace function public.get_chapter_content(p_story_id text, p_chapter_id text)
returns text[]
language sql
security definer
stable
set search_path = public
as $$
  select c.paragraphs
  from public.chapters c
  join public.stories s on s.id = c.story_id
  where c.story_id = p_story_id
    and c.id = p_chapter_id
    and (
      s.owner_id = auth.uid()
      or exists (
        select 1 from public.purchases p
        where p.user_id = auth.uid() and p.story_id = s.id
      )
      or not exists (
        select 1 from public.chapters cp
        where cp.story_id = c.story_id
          and cp.is_premium = true
          and cp."order" <= c."order"
      )
    )
$$;

-- 2) Remove the API roles' ability to read paragraphs directly. A column-level
--    `revoke select (paragraphs)` is INEFFECTIVE while a table-level GRANT SELECT
--    exists (the table grant covers every column), so drop the table grant and
--    re-grant SELECT on every column EXCEPT paragraphs. Keep this list in sync if
--    columns are ever added to public.chapters.
revoke select on public.chapters from anon, authenticated;
grant select (story_id, id, "order", title, reading_minutes, is_premium, image_url, video_url, page_count)
  on public.chapters to anon, authenticated;

-- 3) Let the app call the gated reader.
grant execute on function public.get_chapter_content(text, text) to anon, authenticated;
