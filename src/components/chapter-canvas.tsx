import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NaturalImage } from '@/components/natural-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import type { ChapterDraft } from '@/lib/publish-story';
import { uploadComicPage } from '@/lib/upload-comic-page';
import { uploadCover } from '@/lib/upload-cover';
import { useTheme } from '@/hooks/use-theme';

interface ChapterCanvasProps {
  value: ChapterDraft;
  onChange: (patch: Partial<ChapterDraft>) => void;
  onDone: () => void;
  doneLabel?: string;
  headerLabel?: string;
  busy?: boolean;
  error?: string | null;
  /** Comic book → collect ordered page images instead of a text body. */
  comic?: boolean;
  /** Editing a comic chapter: its existing pages ({path to save, url to preview}). */
  initialPages?: { path: string; url: string }[];
}

/** Distraction-free chapter editor with optional image/video at the top. */
export function ChapterCanvas({
  value,
  onChange,
  onDone,
  doneLabel = 'Done',
  headerLabel = 'Write',
  busy = false,
  error,
  comic = false,
  initialPages,
}: ChapterCanvasProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Comic pages: {path} is stored, {preview} is a displayable URL for the editor.
  const [pages, setPages] = useState<{ path: string; preview: string }[]>([]);
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current || !initialPages || initialPages.length === 0) return;
    loadedRef.current = true;
    setPages(initialPages.map((p) => ({ path: p.path, preview: p.url })));
  }, [initialPages]);

  const syncPages = (next: { path: string; preview: string }[]) => {
    setPages(next);
    onChange({ pages: next.map((p) => p.path) });
  };

  const pickImage = async () => {
    setMediaError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0] || !user) return;
    setUploading(true);
    const up = await uploadCover(result.assets[0].uri, user.id);
    setUploading(false);
    if (up.error) setMediaError(up.error);
    else onChange({ imageUrl: up.url });
  };

  const addPages = async () => {
    setMediaError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length || !user) return;
    setUploading(true);
    const added: { path: string; preview: string }[] = [];
    for (const asset of result.assets) {
      const up = await uploadComicPage(asset.uri, user.id);
      if (up.error) {
        setMediaError(up.error);
        break;
      }
      if (up.path) added.push({ path: up.path, preview: asset.uri });
    }
    setUploading(false);
    if (added.length) syncPages([...pages, ...added]);
  };

  const removePage = (i: number) => syncPages(pages.filter((_, idx) => idx !== i));
  const movePage = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= pages.length) return;
    const next = [...pages];
    [next[i], next[j]] = [next[j], next[i]];
    syncPages(next);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <View style={[styles.bar, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={onDone} hitSlop={12} disabled={busy}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.barTitle}>
            {headerLabel}
          </ThemedText>
          <Pressable onPress={onDone} disabled={busy} hitSlop={8}>
            {busy ? (
              <ActivityIndicator color={theme.accent} />
            ) : (
              <ThemedText type="smallBold" themeColor="accent">
                {doneLabel}
              </ThemedText>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="smallBold" themeColor="textSecondary">
            Chapter title
          </ThemedText>
          <TextInput
            value={value.title}
            onChangeText={(t) => onChange({ title: t })}
            placeholder="e.g. Chapter 1 — The Beginning"
            placeholderTextColor={theme.textSecondary}
            style={[styles.titleInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />

          {comic ? (
            <View style={styles.pagesWrap}>
              <ThemedText type="small" themeColor="textSecondary">
                Comic pages — add them in reading order (top to bottom). Readers scroll down through them.
              </ThemedText>
              {pages.map((p, i) => (
                <View key={p.path} style={[styles.pageRow, { borderColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.pageNum}>
                    {i + 1}
                  </ThemedText>
                  <Image source={{ uri: p.preview }} style={styles.pageThumb} contentFit="cover" />
                  <View style={styles.pageActions}>
                    <Pressable onPress={() => movePage(i, -1)} hitSlop={6} disabled={i === 0}>
                      <Ionicons name="arrow-up" size={20} color={i === 0 ? theme.backgroundSelected : theme.text} />
                    </Pressable>
                    <Pressable onPress={() => movePage(i, 1)} hitSlop={6} disabled={i === pages.length - 1}>
                      <Ionicons name="arrow-down" size={20} color={i === pages.length - 1 ? theme.backgroundSelected : theme.text} />
                    </Pressable>
                    <Pressable onPress={() => removePage(i)} hitSlop={6}>
                      <Ionicons name="trash-outline" size={20} color="#C0392B" />
                    </Pressable>
                  </View>
                </View>
              ))}
              <Pressable
                onPress={addPages}
                disabled={uploading}
                style={[styles.mediaBtn, { borderColor: theme.backgroundSelected }]}>
                {uploading ? (
                  <ActivityIndicator color={theme.accent} />
                ) : (
                  <>
                    <Ionicons name="images-outline" size={18} color={theme.accent} />
                    <ThemedText type="small" themeColor="accent">
                      {pages.length ? 'Add more pages' : 'Add pages'}
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <>
              {/* Media at the top of the chapter */}
              <View style={styles.mediaBar}>
                {value.imageUrl ? (
                  <View style={styles.thumbWrap}>
                    <NaturalImage uri={value.imageUrl} style={styles.thumb} />
                    <Pressable onPress={() => onChange({ imageUrl: undefined })} hitSlop={6}>
                      <ThemedText type="small" themeColor="accent">
                        Remove image
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={pickImage}
                    disabled={uploading}
                    style={[styles.mediaBtn, { borderColor: theme.backgroundSelected }]}>
                    {uploading ? (
                      <ActivityIndicator color={theme.accent} />
                    ) : (
                      <>
                        <Ionicons name="image-outline" size={18} color={theme.accent} />
                        <ThemedText type="small" themeColor="accent">
                          Add image
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                )}
              </View>

              <ThemedText type="small" themeColor="textSecondary">
                Video link (optional — paste a YouTube URL)
              </ThemedText>
              <TextInput
                value={value.videoUrl ?? ''}
                onChangeText={(t) => onChange({ videoUrl: t || undefined })}
                placeholder="https://youtube.com/watch?v=…"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                style={[styles.videoInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              />

              <TextInput
                value={value.body}
                onChangeText={(t) => onChange({ body: t })}
                placeholder="Start writing… Leave a blank line between paragraphs."
                placeholderTextColor={theme.textSecondary}
                multiline
                textAlignVertical="top"
                style={[styles.bodyInput, { color: theme.text }]}
              />
            </>
          )}

          <Pressable
            onPress={() => onChange({ isPremium: !value.isPremium })}
            style={styles.premiumRow}
            hitSlop={6}>
            <Ionicons
              name={value.isPremium ? 'lock-closed' : 'lock-open-outline'}
              size={18}
              color={value.isPremium ? '#F5A623' : theme.textSecondary}
            />
            <ThemedText type="small" themeColor={value.isPremium ? 'text' : 'textSecondary'}>
              {value.isPremium ? 'Premium (requires purchase)' : 'Free to read'}
            </ThemedText>
          </Pressable>

          {(error || mediaError) && (
            <ThemedText type="small" style={{ color: '#C0392B' }}>
              {error || mediaError}
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safe: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barTitle: { flex: 1, textAlign: 'center' },
  content: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.six },
  titleInput: {
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 18,
    fontWeight: '700',
  },
  mediaBar: { marginTop: Spacing.two },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: Spacing.three,
  },
  thumbWrap: { gap: Spacing.two, alignItems: 'flex-start' },
  thumb: { maxWidth: 260 },
  videoInput: {
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  bodyInput: {
    marginTop: Spacing.two,
    fontSize: 17,
    lineHeight: 26,
    minHeight: 360,
  },
  premiumRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three },
  pagesWrap: { gap: Spacing.two, marginTop: Spacing.two },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.two,
  },
  pageNum: { width: 22, textAlign: 'center' },
  pageThumb: { width: 60, height: 84, borderRadius: 8, backgroundColor: '#0002' },
  pageActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginLeft: 'auto' },
});
