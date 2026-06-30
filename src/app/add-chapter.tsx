import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ChapterCanvas } from '@/components/chapter-canvas';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useStoriesData } from '@/context/stories';
import { addChapterToStory, updateChapter, type ChapterDraft } from '@/lib/publish-story';

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
          body: existingChapter.paragraphs.join('\n\n'),
          isPremium: existingChapter.isPremium,
          imageUrl: existingChapter.imageUrl,
          videoUrl: existingChapter.videoUrl,
        }
      : { title: '', body: '', isPremium: false },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
