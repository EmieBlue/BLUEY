import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Stars, StarPicker } from '@/components/stars';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { deleteReview, fetchReviews, submitReview, type Review } from '@/lib/reviews';

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

/** Book ratings & reviews. Reading is public; rating requires sign-in. */
export function ReviewsSection({
  storyId,
  canModerate,
}: {
  storyId: string;
  canModerate?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { user, configured } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [rating, setRating] = useState(0);
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
    fetchReviews(storyId)
      .then((r) => {
        if (!active) return;
        setReviews(r.reviews);
        setLoadFailed(r.failed);
        // Prefill the composer with the reader's existing review, if any.
        const mine = user ? r.reviews.find((rv) => rv.userId === user.id) : undefined;
        if (mine) {
          setRating(mine.rating);
          setText(mine.body);
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [configured, storyId, user]);

  const { count, average } = useMemo(() => {
    const c = reviews.length;
    const a = c ? reviews.reduce((s, r) => s + r.rating, 0) / c : 0;
    return { count: c, average: a };
  }, [reviews]);

  const mine = user ? reviews.find((r) => r.userId === user.id) : undefined;

  const onSubmit = useCallback(async () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (rating < 1) {
      setError('Tap a star rating first.');
      return;
    }
    setPosting(true);
    setError(null);
    const res = await submitReview({ storyId, rating, body: text.trim() });
    setPosting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.review) {
      const saved = res.review;
      setReviews((rs) => [saved, ...rs.filter((r) => r.userId !== saved.userId)]);
      setLoadFailed(false);
    }
  }, [user, rating, text, storyId, router]);

  const onRemove = useCallback(
    async (targetUserId: string) => {
      setError(null);
      const prev = reviews;
      setReviews((rs) => rs.filter((r) => r.userId !== targetUserId)); // optimistic
      const res = await deleteReview(storyId, user && targetUserId === user.id ? undefined : targetUserId);
      if (res.error) {
        setReviews(prev); // roll back
        setError(res.error);
        return;
      }
      if (user && targetUserId === user.id) {
        setRating(0);
        setText('');
      }
    },
    [reviews, storyId, user],
  );

  if (!configured) return null;

  const canPost = rating >= 1 && !posting;

  return (
    <View style={styles.wrap}>
      <ThemedText style={styles.heading}>Ratings & reviews</ThemedText>

      {/* Average summary */}
      {!loading && !loadFailed && (
        <View style={styles.summary}>
          {count > 0 ? (
            <>
              <ThemedText style={styles.bigNum}>{average.toFixed(1)}</ThemedText>
              <View style={{ gap: 2 }}>
                <Stars value={average} size={18} />
                <ThemedText type="small" themeColor="textSecondary">
                  {count} {count === 1 ? 'rating' : 'ratings'}
                </ThemedText>
              </View>
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              No ratings yet — be the first.
            </ThemedText>
          )}
        </View>
      )}

      {/* Composer */}
      {user ? (
        <View style={[styles.composer, { borderColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">{mine ? 'Your rating' : 'Rate this book'}</ThemedText>
          <StarPicker value={rating} onChange={setRating} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a few words (optional)…"
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={4000}
            style={[styles.input, { color: theme.text }]}
          />
          <View style={styles.composerActions}>
            {mine ? (
              <Pressable onPress={() => onRemove(mine.userId)} hitSlop={8}>
                <ThemedText type="small" themeColor="textSecondary">
                  Remove
                </ThemedText>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              onPress={onSubmit}
              disabled={!canPost}
              style={({ pressed }) => [
                styles.postBtn,
                { backgroundColor: theme.accent, opacity: !canPost ? 0.5 : pressed ? 0.85 : 1 },
              ]}>
              {posting ? (
                <ActivityIndicator color={theme.accentOn} />
              ) : (
                <ThemedText type="smallBold" style={{ color: theme.accentOn }}>
                  {mine ? 'Update' : 'Post rating'}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => router.push('/auth')}
          style={[styles.signIn, { borderColor: theme.backgroundSelected }]}>
          <Ionicons name="star-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            Sign in to rate this book
          </ThemedText>
        </Pressable>
      )}

      {error ? (
        <ThemedText type="small" style={[styles.error, { color: '#E5484D' }]}>
          {error}
        </ThemedText>
      ) : null}

      {/* List */}
      {loading ? (
        <ActivityIndicator style={styles.loading} color={theme.textSecondary} />
      ) : loadFailed ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          Couldn’t load reviews — an ad or privacy blocker may be blocking them. Try allowing this site.
        </ThemedText>
      ) : (
        reviews.map((r) => {
          const canDelete = !!(canModerate || (user && r.userId === user.id));
          return (
            <View key={r.userId} style={[styles.review, { borderColor: theme.backgroundSelected }]}>
              <View style={styles.reviewHead}>
                <ThemedText type="smallBold" numberOfLines={1} style={styles.author}>
                  {r.authorName}
                  {user && r.userId === user.id ? ' (you)' : ''}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {timeAgo(r.createdAt)}
                </ThemedText>
                {canDelete ? (
                  <Pressable onPress={() => onRemove(r.userId)} hitSlop={8} style={styles.delete}>
                    <Ionicons name="trash-outline" size={15} color={theme.textSecondary} />
                  </Pressable>
                ) : null}
              </View>
              <Stars value={r.rating} size={14} />
              {r.body ? <ThemedText style={styles.body}>{r.body}</ThemedText> : null}
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
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bigNum: { fontSize: 44, fontWeight: '800', lineHeight: 48 },
  composer: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  input: { minHeight: 44, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
  composerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  postBtn: {
    minWidth: 96,
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
  review: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  author: { flexShrink: 1 },
  delete: { marginLeft: 'auto', padding: 2 },
  body: { fontSize: 15, lineHeight: 22, marginTop: 2 },
});
