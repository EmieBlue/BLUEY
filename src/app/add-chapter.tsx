import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ChapterCanvas } from '@/components/chapter-canvas';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useStoriesData } from '@/context/stories';
import { addChapterToStory, updateChapter, type ChapterDraft } from '@/lib/publish-story';
import { supabase } from '@/lib/supabase';

export default function AddChapterScreen() {
  const { storyId, chapterId } = useLocalSearchParams<{ storyId: string; chapterId?: string }>();
  const router = useRouter();
  const { refresh, getStoryById } = useStoriesData();
  const story = getStoryById(storyId);
  const existingChapter = chapterId ? story?.chapters.find((c) => c.id === chapterId) : undefined;
  const isEditing = !!existingChapter;

  const [chapter, setChapter] = useState<ChapterDraft>(
    existingChapter
      ? {
          title: existingChapter.title,
          body: '', // real text is fetched below via the gated RPC (owner-allowed)
          isPremium: existingChapter.isPremium,
          imageUrl: existingChapter.imageUrl,
          videoUrl: existingChapter.videoUrl,
        }
      : { title: '', body: '', isPremium: false },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefilledRef = useRef(false);

  // Chapter text isn't in the loaded story list (premium paragraphs are column-
  // locked in the DB). When editing, pull the real body through the gated
  // `get_chapter_content` RPC — the author owns the story, so it's allowed.
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
      const paras = (data as string[] | null) ?? [];
      setChapter((c) => ({ ...c, body: paras.join('\n\n') }));
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditing, chapterId, storyId]);

  const goToStory = () => router.replace({ pathname: '/story/[id]', params: { id: storyId } });

  const onDone = async () => {
    if (!chapter.body.trim()) {
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
