import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
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
}: ChapterCanvasProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

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
});
