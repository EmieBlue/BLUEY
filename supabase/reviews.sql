-- Book ratings & reviews. One review per reader per book (upsert to edit).
-- Mirrors the reader_notes design: reading is public, writing requires a signed-in
-- user (RLS), and the reviewer's display name is stored on the row because
-- public.profiles is read-your-own-only. Safe to re-run.
--
-- A trigger keeps public.stories.rating (avg, 0–5) and stories.ratings_count in
-- sync, so every card/list that already reads `rating` shows the live average
-- with no query changes.

create table if not exists public.reviews (
  user_id     uuid not null references auth.users(id) on delete cascade,
  story_id    text not null references public.stories(id) on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  body        text,
  author_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, story_id)
);

create index if not exists reviews_story_created_idx
  on public.reviews (story_id, created_at desc);

alter table public.reviews enable row level security;

-- Anyone (even signed-out) can read reviews.
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select using (true);

-- A signed-in user may create / edit only their own review.
drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews
  for insert with check (auth.uid() = user_id);

drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A user can delete their own review; a story's author can delete any review on
-- their own book (moderation).
drop policy if exists reviews_delete_own_or_author on public.reviews;
create policy reviews_delete_own_or_author on public.reviews
  for delete using (
    auth.uid() = user_id
    or auth.uid()::text = (select author_id from public.stories where id = reviews.story_id)
  );

-- Aggregate columns on stories (rating already exists; add the count).
alter table public.stories add column if not exists ratings_count int not null default 0;

-- Recompute a book's average rating + count whenever its reviews change.
create or replace function public.recompute_story_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sid text := coalesce(new.story_id, old.story_id);
begin
  update public.stories s set
    rating = coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.story_id = sid), 0),
    ratings_count = (select count(*) from public.reviews r where r.story_id = sid)
  where s.id = sid;
  return null;
end;
$$;

drop trigger if exists reviews_recompute_rating on public.reviews;
create trigger reviews_recompute_rating
  after insert or update or delete on public.reviews
  for each row execute function public.recompute_story_rating();

-- Backfill once so existing books reflect current data (0 when none).
update public.stories s set
  rating = coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.story_id = s.id), 0),
  ratings_count = (select count(*) from public.reviews r where r.story_id = s.id);
