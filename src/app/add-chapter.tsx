import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ChapterCanvas } from '@/components/chapter-canvas';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useStoriesData } from '@/context/stories';
import { fetchComicPages } from '@/lib/comic';
import { addChapterToStory, updateChapter, type ChapterDraft } from '@/lib/publish-story';
import { supabase } from '@/lib/supabase';

export default function AddChapterScreen() {
  const { storyId, chapterId } = useLocalSearchParams<{ storyId: string; chapterId?: string }>();
  const router = useRouter();
  const { refresh, getStoryById } = useStoriesData();
  const story = getStoryById(storyId);
  const comic = story?.kind === 'comic';
  const existingChapter = chapterId ? story?.chapters.find((c) => c.id === chapterId) : undefined;
  const isEditing = !!existingChapter;
  const hadPages = (existingChapter?.pageCount ?? 0) > 0;

  const [chapter, setChapter] = useState<ChapterDraft>(
    existingChapter
      ? {
          title: existingChapter.title,
          body: '', // real content is fetched below via the gated RPC (owner-allowed)
          isPremium: existingChapter.isPremium,
          imageUrl: existingChapter.imageUrl,
          videoUrl: existingChapter.videoUrl,
          pages: comic ? [] : undefined,
        }
      : { title: '', body: '', isPremium: false, pages: comic ? [] : undefined },
  );
  // For editing a comic chapter: existing pages as {path (to save), url (to preview)}.
  const [initialPages, setInitialPages] = useState<{ path: string; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefilledRef = useRef(false);
  // A comic being edited must load its existing pages before Save is allowed —
  // otherwise a title-only save would overwrite the pages with an empty list.
  const [pagesLoaded, setPagesLoaded] = useState<boolean>(() => !(comic && isEditing));

  // Chapter content isn't in the loaded story list (paragraphs are column-locked).
  // When editing, pull it via the gated `get_chapter_content` RPC (owner allowed):
  // a novel gets its text body; a comic gets its page paths (+ signed previews).
  useEffect(() => {
    if (!isEditing || !chapterId || !supabase || prefilledRef.current) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase!.rpc('get_chapter_content', {
        p_story_id: storyId,
        p_chapter_id: chapterId,
      });
      if (cancelled) return;
      prefilledRef.current = true;
      const items = (data as string[] | null) ?? [];
      if (comic) {
        const signed = await fetchComicPages(storyId, chapterId);
        if (cancelled) return;
        if (items.length > 0) {
          setInitialPages(items.map((p, i) => ({ path: p, url: signed.pages[i] ?? p })));
          setChapter((c) => ({ ...c, pages: items }));
          setPagesLoaded(true);
        } else if (hadPages) {
          // This chapter should have pages but they didn't load — keep Save
          // disabled so a stray save can't wipe them.
          setError('Couldn’t load this chapter’s pages. Please refresh and try again.');
        } else {
          setPagesLoaded(true); // genuinely a 0-page chapter
        }
      } else {
        setChapter((c) => ({ ...c, body: items.join('\n\n') }));
        setPagesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditing, chapterId, storyId, comic, hadPages]);

  const goToStory = () => router.replace({ pathname: '/story/[id]', params: { id: storyId } });

  const onDone = async () => {
    const hasPages = !!(chapter.pages && chapter.pages.length);

    // Never overwrite a comic chapter's real pages before they've loaded.
    if (comic && isEditing && hadPages && !hasPages) {
      setError('Still loading this chapter’s pages — please wait a moment.');
      return;
    }

    const hasContent = comic ? hasPages : !!chapter.body.trim();
    if (!isEditing && !hasContent) {
      if (comic) {
        setError('Add at least one page before saving.');
        return;
      }
      goToStory();
      return;
    }

    setBusy(true);
    const res =
      isEditing && chapterId
        ? await updateChapter(storyId, chapterId, chapter)
        : await addChapterToStory(storyId, chapter);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    await refresh();
    goToStory();
  };

  if (!story) {
    return (
      <ThemedView style={styles.c}>
        <ThemedText>Story not found.</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText type="linkPrimary">Go back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ChapterCanvas
      value={chapter}
      comic={comic}
      initialPages={initialPages}
      pagesLoading={comic && isEditing && !pagesLoaded}
      onChange={(p) => setChapter((c) => ({ ...c, ...p }))}
      onDone={onDone}
      doneLabel={isEditing ? 'Save changes' : 'Save chapter'}
      headerLabel={isEditing ? 'Edit chapter' : `Add to "${story.title}"`}
      busy={busy}
      error={error}
    />
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
});
