-- Comics support. A book is either a novel (text) or a comic (page images the
-- reader scrolls through, webtoon-style). Whole-book kind. Safe to re-run.
--
-- Comic page image OBJECT PATHS are stored in the existing (premium-gated)
-- chapters.paragraphs array, so premium comic pages inherit the same hard-lock
-- as text (get_chapter_content). The image files live in a PRIVATE Storage
-- bucket and are handed to buyers only as short-lived signed URLs, minted by
-- functions/api/comic-pages.js with the service role.

-- 1) Book kind + a non-sensitive page count (shown as "N pages").
alter table public.stories  add column if not exists kind text not null default 'novel'
  check (kind in ('novel', 'comic'));
alter table public.chapters add column if not exists page_count int not null default 0;

-- 2) Private bucket for comic pages.
insert into storage.buckets (id, name, public)
values ('comics', 'comics', false)
on conflict (id) do nothing;

-- 3) Storage RLS: an author can manage ONLY files under their own uid folder
--    (path like "<auth.uid()>/story/chapter/1.jpg"). Buyers never read directly —
--    the function signs with the service role, which bypasses these policies.
drop policy if exists comics_owner_insert on storage.objects;
create policy comics_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comics' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists comics_owner_update on storage.objects;
create policy comics_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'comics' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'comics' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists comics_owner_delete on storage.objects;
create policy comics_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'comics' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists comics_owner_select on storage.objects;
create policy comics_owner_select on storage.objects
  for select to authenticated
  using (bucket_id = 'comics' and (storage.foldername(name))[1] = auth.uid()::text);
