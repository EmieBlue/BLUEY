import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StoryCover } from '@/components/story-cover';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppState } from '@/context/app-state';
import { useAuth } from '@/context/auth';
import { useStoriesData } from '@/context/stories';
import { ALL_GENRES, type Genre, type Story } from '@/data/types';
import { publishStory, updateStory } from '@/lib/publish-story';
import { uploadCover } from '@/lib/upload-cover';
import { useTheme } from '@/hooks/use-theme';

const LANGUAGES = ['English', 'Spanish', 'French', 'Portuguese', 'German', 'Other'];
const STORY_TYPES = ['Fiction', 'Fanfic', 'Nonfiction', 'Poetry'];
const COPYRIGHTS = ['All Rights Reserved', 'Public Domain', 'Creative Commons'];
const AUDIENCES = ['Everyone', 'Teen', 'Adult'];
const COVER_COLORS = ['#B5651D', '#2F6F4E', '#2B4C7E', '#7A3B69', '#A23E54', '#3F5E5A'];

export default function WriteScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { isAuthor } = useAppState();
  const { refresh, getStoryById } = useStoriesData();
  const wide = Math.min(width, MaxContentWidth) >= 700;

  const { storyId: editId } = useLocalSearchParams<{ storyId?: string }>();
  const existing = editId ? getStoryById(editId) : undefined;
  const isEditing = !!existing;

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) || user?.email || 'Author';

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [language, setLanguage] = useState(existing?.language ?? 'English');
  const [storyType, setStoryType] = useState(existing?.storyType ?? 'Fiction');
  const [genres, setGenres] = useState<Genre[]>(existing?.genres ?? []);
  const [tags, setTags] = useState((existing?.tags ?? []).join(' '));
  const [copyright, setCopyright] = useState(existing?.copyright ?? 'All Rights Reserved');
  const [isMature, setIsMature] = useState(existing?.isMature ?? false);
  const [mainCharacters, setMainCharacters] = useState((existing?.mainCharacters ?? []).join(', '));
  const [targetAudience, setTargetAudience] = useState(existing?.targetAudience ?? 'Everyone');
  const [coverEmoji] = useState(existing?.coverEmoji ?? '');
  const [coverColor] = useState(existing?.coverColor ?? COVER_COLORS[0]);
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>(existing?.coverImageUrl);
  const [kind, setKind] = useState<'novel' | 'comic'>(existing?.kind ?? 'novel');

  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewStory = {
    id: 'preview',
    title: title || 'Untitled Story',
    author: { id: '', name: displayName, bio: '' },
    format: 'serial',
    genres,
    blurb: '',
    description: '',
    coverColor,
    coverEmoji,
    coverImageUrl,
    isComplete: false,
    rating: 0,
    ratingsCount: 0,
    readsCount: 0,
    chapters: [],
  } as Story;

  const toggleGenre = (g: Genre) =>
    setGenres((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));

  const pickCover = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0] || !user) return;
    setUploading(true);
    const up = await uploadCover(result.assets[0].uri, user.id);
    setUploading(false);
    if (up.error) setError(up.error);
    else setCoverImageUrl(up.url);
  };

  const saveAndContinue = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Please add a title.');
      return;
    }
    if (!description.trim()) {
      setError('Please add a description.');
      return;
    }
    if (!user) {
      setError('Please sign in first.');
      return;
    }
    const draft = {
      title,
      blurb: description.trim().split('\n')[0].slice(0, 140),
      description,
      genres,
      coverEmoji,
      coverColor,
      coverImageUrl,
      format: 'serial' as const,
      kind,
      status: 'draft' as const,
      language,
      storyType,
      tags: tags.split(/[\s,]+/).map((t) => t.replace(/^#+/, '').trim()).filter(Boolean),
      copyright,
      isMature,
      mainCharacters: mainCharacters.split(',').map((s) => s.trim()).filter(Boolean),
      targetAudience,
      chapters: [],
    };

    setBusy(true);
    // Edit mode: update the existing story and return to its page.
    if (isEditing && existing) {
      const res = await updateStory(existing.id, draft);
      setBusy(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      await refresh();
      router.replace({ pathname: '/story/[id]', params: { id: existing.id } });
      return;
    }
    // Create mode: make a draft then go write Part 1.
    const result = await publishStory(draft, { id: user.id, displayName });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    await refresh();
    router.replace({ pathname: '/add-chapter', params: { storyId: result.storyId as string } });
  };

  if (!isAuthor) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={{ textAlign: 'center' }}>Writing is available to authors only.</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText type="linkPrimary">Go back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const coverW = wide ? 200 : 150;
  const coverH = wide ? 286 : 214;
  const coverColumn = (
    <View style={[styles.coverCol, wide && { width: 200 }]}>
      {coverImageUrl ? (
        <>
          <StoryCover story={previewStory} width={coverW} height={coverH} />
          <View style={styles.coverLinks}>
            <Pressable onPress={pickCover} disabled={uploading} hitSlop={6}>
              <ThemedText type="small" themeColor="accent">
                {uploading ? 'Uploading…' : 'Change'}
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => setCoverImageUrl(undefined)} hitSlop={6}>
              <ThemedText type="small" themeColor="textSecondary">
                Remove
              </ThemedText>
            </Pressable>
          </View>
        </>
      ) : (
        <Pressable
          onPress={pickCover}
          disabled={uploading}
          style={[
            styles.coverPlaceholder,
            {
              width: coverW,
              height: coverH,
              borderColor: theme.backgroundSelected,
              backgroundColor: theme.backgroundElement,
            },
          ]}>
          {uploading ? (
            <ActivityIndicator color={theme.accent} />
          ) : (
            <>
              <Ionicons name="add" size={28} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                Add a cover
              </ThemedText>
            </>
          )}
        </Pressable>
      )}
    </View>
  );

  const detailsColumn = (
    <View style={[styles.detailsCol, styles.flex]}>
      <ThemedText style={styles.sectionTitle}>Story Details</ThemedText>

      <Field label="Title *">
        <Input value={title} onChangeText={setTitle} placeholder="Untitled Story" />
      </Field>
      <Field label="Description *">
        <Input value={description} onChangeText={setDescription} placeholder="What's your story about?" multiline minHeight={100} />
      </Field>
      {!isEditing && (
        <Field label="Format">
          <View style={styles.chips}>
            <Chip label="📖 Novel (text)" active={kind === 'novel'} onPress={() => setKind('novel')} />
            <Chip label="🖼️ Comic (pages)" active={kind === 'comic'} onPress={() => setKind('comic')} />
          </View>
        </Field>
      )}
      <Field label="Language">
        <SingleChips options={LANGUAGES} value={language} onSelect={setLanguage} />
      </Field>
      <Field label="Story type">
        <SingleChips options={STORY_TYPES} value={storyType} onSelect={setStoryType} />
      </Field>
      <Field label="Genres">
        <View style={styles.chips}>
          {ALL_GENRES.map((g) => (
            <Chip key={g} label={g} active={genres.includes(g)} onPress={() => toggleGenre(g)} />
          ))}
        </View>
      </Field>
      <Field label="Tags">
        <Input value={tags} onChangeText={setTags} placeholder="Separate tags with a space" autoCapitalize="none" />
      </Field>
      <Field label="Copyright">
        <SingleChips options={COPYRIGHTS} value={copyright} onSelect={setCopyright} />
      </Field>
      <View style={styles.matureRow}>
        <View style={styles.flex}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Rating: Mature (18+)
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Turn on if your story contains mature content.
          </ThemedText>
        </View>
        <Switch
          value={isMature}
          onValueChange={setIsMature}
          trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
        />
      </View>
      <Field label="Main characters">
        <Input value={mainCharacters} onChangeText={setMainCharacters} placeholder="Separate names with commas" />
      </Field>
      <Field label="Target audience">
        <SingleChips options={AUDIENCES} value={targetAudience} onSelect={setTargetAudience} />
      </Field>

      {isEditing && existing && (
        <Field label="Chapters">
          {existing.chapters.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              No chapters yet.
            </ThemedText>
          )}
          {existing.chapters.map((c) => (
            <Pressable
              key={c.id}
              onPress={() =>
                router.push({
                  pathname: '/add-chapter',
                  params: { storyId: existing.id, chapterId: c.id },
                })
              }
              style={[styles.editChapterRow, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="create-outline" size={18} color={theme.accent} />
              <View style={styles.flex}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {c.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Chapter {c.order} · tap to edit
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => router.push({ pathname: '/add-chapter', params: { storyId: existing.id } })}
            style={[styles.addChapterBtn, { borderColor: theme.accent }]}>
            <Ionicons name="add" size={18} color={theme.accent} />
            <ThemedText type="smallBold" themeColor="accent">
              Add chapter
            </ThemedText>
          </Pressable>
        </Field>
      )}

      {error && (
        <ThemedText type="small" style={{ color: '#C0392B' }}>
          {error}
        </ThemedText>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={[styles.headerBar, { borderBottomColor: theme.backgroundElement }]}>
          <View style={styles.flex}>
            <ThemedText type="small" themeColor="textSecondary">
              {isEditing ? 'Edit story' : 'Add Story Info'}
            </ThemedText>
            <ThemedText type="smallBold" numberOfLines={1}>
              {title || 'Untitled Story'}
            </ThemedText>
          </View>
          <Pressable onPress={() => router.back()} style={[styles.cancelBtn, { borderColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold">Cancel</ThemedText>
          </Pressable>
          <Pressable
            onPress={saveAndContinue}
            disabled={busy}
            style={[styles.saveBtn, { backgroundColor: theme.accent, opacity: busy ? 0.6 : 1 }]}>
            {busy ? (
              <ActivityIndicator color={theme.accentOn} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.accentOn }}>
                {isEditing ? 'Save changes' : 'Save & Continue'}
              </ThemedText>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[wide ? styles.rowWide : styles.colNarrow]}>
            {coverColumn}
            {detailsColumn}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

function Input({
  multiline,
  minHeight,
  ...props
}: { multiline?: boolean; minHeight?: number } & React.ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      multiline={multiline}
      style={[
        styles.input,
        {
          backgroundColor: theme.backgroundElement,
          color: theme.text,
          minHeight: minHeight ?? 48,
          textAlignVertical: multiline ? 'top' : 'center',
        },
      ]}
      {...props}
    />
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: active ? theme.accent : theme.backgroundElement }]}>
      <ThemedText type="small" style={{ color: active ? theme.accentOn : theme.text, fontWeight: '600' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function SingleChips({
  options,
  value,
  onSelect,
}: {
  options: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Chip key={o} label={o} active={value === o} onPress={() => onSelect(o)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 999, borderWidth: 1 },
  saveBtn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 999 },
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  rowWide: { flexDirection: 'row', gap: Spacing.five, alignItems: 'flex-start' },
  colNarrow: { flexDirection: 'column', gap: Spacing.four },
  coverCol: { alignItems: 'center', gap: Spacing.three },
  coverLinks: { flexDirection: 'row', gap: Spacing.three },
  coverPlaceholder: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  detailsCol: { gap: Spacing.three },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  field: { gap: Spacing.two },
  input: { borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 999 },
  matureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  editChapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 12,
    marginBottom: Spacing.two,
  },
  addChapterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: Spacing.three,
  },
});
