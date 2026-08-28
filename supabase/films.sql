-- Short films: a third book kind. A film is a title + cover + a YouTube link,
-- played in-app. Free to watch; the creator earns on YouTube. Films have no
-- chapters and no paywall. Safe to re-run.

-- 1) Widen the stories.kind check to allow 'film' (drop whatever it's named now).
do $$
declare c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.stories'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%kind%';
  if c is not null then
    execute 'alter table public.stories drop constraint ' || quote_ident(c);
  end if;
end $$;
alter table public.stories
  add constraint stories_kind_check check (kind in ('novel', 'comic', 'film'));

-- 2) The film's YouTube link.
alter table public.stories add column if not exists video_url text;

-- 3) Refresh PostgREST's schema cache so the client's select('*') sees video_url.
notify pgrst, 'reload schema';
