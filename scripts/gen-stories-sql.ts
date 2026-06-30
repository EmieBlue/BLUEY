/**
 * Generates `supabase/stories.sql` from the local sample stories so the database
 * seed always matches the app's data exactly (no hand-transcription).
 *
 * Run:  npx tsx scripts/gen-stories-sql.ts
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { STORIES } from '../src/data/stories';
import type { Author } from '../src/data/types';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '..', 'supabase', 'stories.sql');

/** Dollar-quote a string so quotes/newlines/emoji need no escaping. */
function dq(s: string): string {
  let tag = 'b';
  while (s.includes(`$${tag}$`)) tag += 'b';
  return `$${tag}$${s}$${tag}$`;
}

/** Build a Postgres text[] literal from string items. */
function textArray(items: string[]): string {
  if (items.length === 0) return `array[]::text[]`;
  return `array[${items.map(dq).join(', ')}]`;
}

const lines: string[] = [];
lines.push(`-- ============================================================================
-- Bluy - stories schema + seed (generated from src/data/stories.ts)
-- Run in Supabase: SQL Editor -> New query -> paste this file -> Run.
-- Safe to re-run: tables use "if not exists" and rows use upserts.
-- ============================================================================

create table if not exists public.authors (
  id   text primary key,
  name text not null,
  bio  text
);

create table if not exists public.stories (
  id           text primary key,
  title        text not null,
  author_id    text references public.authors(id),
  format       text not null,
  genres       text[] not null default '{}',
  blurb        text,
  description  text,
  cover_color  text,
  cover_emoji  text,
  is_complete  boolean not null default false,
  rating       numeric not null default 0,
  reads_count  integer not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.chapters (
  story_id        text not null references public.stories(id) on delete cascade,
  id              text not null,
  "order"         integer not null,
  title           text not null,
  reading_minutes integer not null default 1,
  is_premium      boolean not null default false,
  paragraphs      text[] not null default '{}',
  primary key (story_id, id)
);

-- Public read access (readers browse without logging in); no public writes.
alter table public.authors  enable row level security;
alter table public.stories  enable row level security;
alter table public.chapters enable row level security;

drop policy if exists "authors_public_read" on public.authors;
create policy "authors_public_read" on public.authors for select using (true);
drop policy if exists "stories_public_read" on public.stories;
create policy "stories_public_read" on public.stories for select using (true);
drop policy if exists "chapters_public_read" on public.chapters;
create policy "chapters_public_read" on public.chapters for select using (true);
`);

// Authors (unique by id)
const authors = new Map<string, Author>();
for (const s of STORIES) authors.set(s.author.id, s.author);

lines.push(`\n-- Authors`);
for (const a of authors.values()) {
  lines.push(
    `insert into public.authors (id, name, bio) values (${dq(a.id)}, ${dq(a.name)}, ${dq(
      a.bio,
    )}) on conflict (id) do update set name = excluded.name, bio = excluded.bio;`,
  );
}

// Stories
lines.push(`\n-- Stories`);
for (const s of STORIES) {
  lines.push(
    `insert into public.stories (id, title, author_id, format, genres, blurb, description, cover_color, cover_emoji, is_complete, rating, reads_count) values (` +
      `${dq(s.id)}, ${dq(s.title)}, ${dq(s.author.id)}, ${dq(s.format)}, ${textArray(
        s.genres,
      )}, ${dq(s.blurb)}, ${dq(s.description)}, ${dq(s.coverColor)}, ${dq(s.coverEmoji)}, ${
        s.isComplete
      }, ${s.rating}, ${s.readsCount}) on conflict (id) do update set ` +
      `title = excluded.title, author_id = excluded.author_id, format = excluded.format, genres = excluded.genres, blurb = excluded.blurb, description = excluded.description, cover_color = excluded.cover_color, cover_emoji = excluded.cover_emoji, is_complete = excluded.is_complete, rating = excluded.rating, reads_count = excluded.reads_count;`,
  );
}

// Chapters
lines.push(`\n-- Chapters`);
for (const s of STORIES) {
  for (const c of s.chapters) {
    lines.push(
      `insert into public.chapters (story_id, id, "order", title, reading_minutes, is_premium, paragraphs) values (` +
        `${dq(s.id)}, ${dq(c.id)}, ${c.order}, ${dq(c.title)}, ${c.readingMinutes}, ${
          c.isPremium
        }, ${textArray(c.paragraphs)}) on conflict (story_id, id) do update set ` +
        `"order" = excluded."order", title = excluded.title, reading_minutes = excluded.reading_minutes, is_premium = excluded.is_premium, paragraphs = excluded.paragraphs;`,
    );
  }
}

lines.push('');
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${outPath} (${authors.size} authors, ${STORIES.length} stories).`);
