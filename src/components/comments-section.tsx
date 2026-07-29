import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { addComment, deleteComment, fetchComments, type Comment } from '@/lib/comments';

/** Compact relative time, e.g. "just now", "5m ago", "3d ago", else a date. */
function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Comments for a single chapter. Reading is public; posting requires sign-in. */
export function CommentsSection({
  storyId,
  chapterId,
  canModerate,
}: {
  storyId: string;
  chapterId: string;
  canModerate?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { user, configured } = useAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchComments(storyId, chapterId)
      .then((r) => {
        if (!active) return;
        setComments(r.comments);
        setLoadFailed(r.failed);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [configured, storyId, chapterId]);

  const onPost = useCallback(async () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    const body = text.trim();
    if (!body) return;
    setPosting(true);
    setError(null);
    const res = await addComment({ storyId, chapterId, body });
    setPosting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.comment) {
      setComments((cs) => [...cs, res.comment as Comment]);
      setText('');
      setLoadFailed(false);
    }
  }, [user, text, storyId, chapterId, router]);

  const onDelete = useCallback(
    async (id: string) => {
      setError(null);
      const prev = comments;
      setComments((cs) => cs.filter((c) => c.id !== id)); // optimistic
      const res = await deleteComment(id);
      if (res.error) {
        setComments(prev); // roll back
        setError(res.error);
      }
    },
    [comments],
  );

  if (!configured) return null;

  const canPost = !!text.trim() && !posting;

  return (
    <View style={styles.wrap}>
      <ThemedText style={styles.heading}>
        {loading || loadFailed ? 'Comments' : `Comments (${comments.length})`}
      </ThemedText>

      {user ? (
        <View style={[styles.composer, { borderColor: theme.backgroundSelected }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Share your thoughts on this chapter…"
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={1000}
            style={[styles.input, { color: theme.text }]}
          />
          <Pressable
            onPress={onPost}
            disabled={!canPost}
            style={({ pressed }) => [
              styles.postBtn,
              { backgroundColor: theme.accent, opacity: !canPost ? 0.5 : pressed ? 0.85 : 1 },
            ]}>
            {posting ? (
              <ActivityIndicator color={theme.accentOn} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.accentOn }}>
                Post
              </ThemedText>
            )}
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => router.push('/auth')}
          style={[styles.signIn, { borderColor: theme.backgroundSelected }]}>
          <Ionicons name="chatbubble-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            Sign in to join the conversation
          </ThemedText>
        </Pressable>
      )}

      {error ? (
        <ThemedText type="small" style={[styles.error, { color: '#E5484D' }]}>
          {error}
        </ThemedText>
      ) : null}

      {loading ? (
        <ActivityIndicator style={styles.loading} color={theme.textSecondary} />
      ) : loadFailed ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          Couldn’t load comments — an ad or privacy blocker may be blocking them. Try allowing this
          site.
        </ThemedText>
      ) : comments.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          No comments yet. Be the first to say something.
        </ThemedText>
      ) : (
        comments.map((c) => {
          const canDelete = !!(canModerate || (user && c.userId === user.id));
          return (
            <View key={c.id} style={[styles.comment, { borderColor: theme.backgroundSelected }]}>
              <View style={styles.commentHead}>
                <ThemedText type="smallBold" numberOfLines={1} style={styles.author}>
                  {c.authorName}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {timeAgo(c.createdAt)}
                </ThemedText>
                {canDelete ? (
                  <Pressable onPress={() => onDelete(c.id)} hitSlop={8} style={styles.delete}>
                    <Ionicons name="trash-outline" size={15} color={theme.textSecondary} />
                  </Pressable>
                ) : null}
              </View>
              <ThemedText style={styles.body}>{c.body}</ThemedText>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing.five, gap: Spacing.three },
  heading: { fontSize: 20, fontWeight: '800' },
  composer: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  input: { minHeight: 44, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
  postBtn: {
    alignSelf: 'flex-end',
    minWidth: 76,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  signIn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.three,
  },
  error: { marginTop: -Spacing.two },
  loading: { marginTop: Spacing.three },
  empty: { paddingVertical: Spacing.two },
  comment: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  author: { flexShrink: 1 },
  delete: { marginLeft: 'auto', padding: 2 },
  body: { fontSize: 15, lineHeight: 22 },
});
