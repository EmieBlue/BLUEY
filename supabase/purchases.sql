-- Buy-the-book model: one row per (reader, book) they have unlocked with a
-- one-time payment. Replaces the all-access subscription flag as the premium
-- gate. Rows are written by the Paystack webhook (direct pg connection, which
-- bypasses RLS); readers can only read their own purchases.
create table if not exists public.purchases (
  user_id    uuid not null references auth.users(id) on delete cascade,
  story_id   text not null references public.stories(id) on delete cascade,
  reference  text,
  amount     integer,
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

alter table public.purchases enable row level security;

drop policy if exists purchases_own_read on public.purchases;
create policy purchases_own_read on public.purchases
  for select using (auth.uid() = user_id);
