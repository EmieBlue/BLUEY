import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';

import { BackButton } from '@/components/back-button';
import { LoadingError } from '@/components/loading-error';
import { LoadingView } from '@/components/loading-view';
import { ChapterCanvas } from '@/components/chapter-canvas';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useStoriesData } from '@/context/stories';
import { fetchComicPages } from '@/lib/comic';
import { addChapterToStory, updateChapter, type ChapterDraft } from '@/lib/publish-story';
import { supabase } from '@/lib/supabase';
import { useBackNavigation } from '@/hooks/use-back-navigation';

export default function AddChapterScreen() {
  const { storyId, chapterId } = useLocalSearchParams<{ storyId: string; chapterId?: string }>();
  const { loading, error, refresh } = useStoriesData();
  const goBack = useBackNavigation(storyId ? { pathname: '/story/[id]', params: { id: storyId } } : '/library');
  if (loading) return <LoadingView onBack={goBack} />;
  if (error) return <LoadingError message={error} onRetry={refresh} onBack={goBack} />;
  return <ChapterForm key={`${storyId}:${chapterId ?? 'new'}`} />;
}

function ChapterForm() {
  const { storyId, chapterId } = useLocalSearchParams<{ storyId: string; chapterId?: string }>();
  const router = useRouter();
  const goBack = useBackNavigation(storyId ? { pathname: '/story/[id]', params: { id: storyId } } : '/library');
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
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefilledRef = useRef(false);
  // Load existing content before mounting editable fields or allowing Save.
  const [pagesLoaded, setPagesLoaded] = useState(!isEditing);
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Chapter content isn't in the loaded story list (paragraphs are column-locked).
  // When editing, pull it via the gated `get_chapter_content` RPC (owner allowed):
  // a novel gets its text body; a comic gets its page paths (+ signed previews).
  useEffect(() => {
    if (!isEditing || !chapterId || !supabase || prefilledRef.current) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    (async () => {
      try {
        const { data, error: loadError } = await supabase!.rpc('get_chapter_content', {
          p_story_id: storyId,
          p_chapter_id: chapterId,
        }).abortSignal(controller.signal);
        if (cancelled) return;
        if (loadError || !Array.isArray(data) || !data.every(item => typeof item === 'string')) throw new Error('Chapter load failed');
        const items = data as string[];
        if (comic) {
          const signed = items.length ? await fetchComicPages(storyId, chapterId, controller.signal) : { pages: [], failed: false, locked: false };
          if (cancelled) return;
          if (signed.failed || signed.locked || signed.pages.length !== items.length || (hadPages && !items.length)) throw new Error('Comic pages failed to load');
          setInitialPages(items.map((p, i) => ({ path: p, url: signed.pages[i] })));
          setChapter((c) => ({ ...c, pages: items }));
        } else {
          setChapter((c) => ({ ...c, body: items.join('\n\n') }));
        }
        setPagesLoaded(true);
        prefilledRef.current = true;
      } catch {
        if (!cancelled) setError('Could not load this chapter. Your existing content has not been changed.');
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [isEditing, chapterId, storyId, comic, hadPages, loadAttempt]);

  const goToStory = () => router.dismissTo({ pathname: '/story/[id]', params: { id: storyId } });

  const onBack = () => {
    if (!dirty) {
      goBack();
      return;
    }
    if (Platform.OS === 'web') {
      if (window.confirm('Discard your unsaved chapter changes?')) goBack();
    } else {
      Alert.alert('Discard changes?', 'Your chapter changes have not been saved.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: goBack },
      ]);
    }
  };

  const onDone = async () => {
    if (busy || (isEditing && !pagesLoaded)) return;
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
    try {
      const res =
        isEditing && chapterId
          ? await updateChapter(storyId, chapterId, chapter)
          : await addChapterToStory(storyId, chapter);
      if (res.error) {
        setError(res.error);
        return;
      }
      await refresh();
      goToStory();
    } catch {
      setError('Could not save this chapter. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!story) {
    return (
      <ThemedView style={styles.c}>
        <ThemedText>Story not found.</ThemedText>
        <BackButton onPress={goBack} />
      </ThemedView>
    );
  }

  if (chapterId && !existingChapter) return (
    <ThemedView style={styles.c}><ThemedText>Chapter not found.</ThemedText><BackButton onPress={goBack} /></ThemedView>
  );

  if (isEditing && !pagesLoaded) {
    return error
      ? <LoadingError title="Could not load this chapter" message={error} onBack={onBack}
          onRetry={() => { setError(null); setLoadAttempt(attempt => attempt + 1); }} />
      : <LoadingView onBack={onBack} />;
  }

  return (
    <ChapterCanvas
      value={chapter}
      comic={comic}
      initialPages={initialPages}
      pagesLoading={comic && isEditing && !pagesLoaded}
      onChange={(p) => {
        setDirty(true);
        setChapter((c) => ({ ...c, ...p }));
      }}
      onBack={onBack}
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
