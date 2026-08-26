import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const isWeb = Platform.OS === 'web';

/**
 * Immersive comic reader: one page at a time, flipped LEFT/RIGHT (no vertical
 * scroll). Each page is scaled to fit the viewport (contain) so the whole page
 * is visible and readable without pinch-zoom, on phone and web.
 *
 * Flip with: swipe (touch), tapping the left/right side of the page, the on-screen
 * arrows, or the ← → keys on web. Advancing past the last page calls `onNext`.
 */
export function ComicPager({
  pages,
  loading,
  onNext,
}: {
  pages: string[];
  loading?: boolean;
  onNext?: () => void;
}) {
  const theme = useTheme();
  const listRef = useRef<FlatList<string>>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [index, setIndex] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width && height) setSize({ w: Math.round(width), h: Math.round(height) });
  };

  const go = useCallback(
    (delta: 1 | -1) => {
      const target = index + delta;
      if (target < 0) return;
      if (target >= pages.length) {
        if (delta === 1) onNext?.(); // flip past the end → next chapter
        return;
      }
      listRef.current?.scrollToOffset({ offset: target * size.w, animated: true });
      setIndex(target);
    },
    [index, pages.length, size.w, onNext],
  );

  // Keyboard arrows on web.
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!size.w) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / size.w);
    if (i !== index) setIndex(Math.max(0, Math.min(pages.length - 1, i)));
  };

  if (loading) {
    return (
      <View style={styles.center} onLayout={onLayout}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  if (!pages.length) {
    return (
      <View style={styles.center} onLayout={onLayout}>
        <ThemedText themeColor="textSecondary">This chapter isn’t available to read yet.</ThemedText>
      </View>
    );
  }

  const atStart = index <= 0;
  const atEnd = index >= pages.length - 1;

  return (
    <View style={styles.fill} onLayout={onLayout}>
      {size.w > 0 && (
        <FlatList
          ref={listRef}
          data={pages}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          getItemLayout={(_, i) => ({ length: size.w, offset: size.w * i, index: i })}
          initialNumToRender={2}
          windowSize={3}
          renderItem={({ item }) => (
            <View style={{ width: size.w, height: size.h }}>
              <Image
                source={{ uri: item }}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                transition={120}
              />
            </View>
          )}
        />
      )}

      {/* Tap zones: left third = previous, right third = next. Center is free so
          it doesn't fight future controls. pointerEvents box-none lets the list
          still receive swipes. */}
      <View style={styles.tapRow} pointerEvents="box-none">
        <Pressable style={styles.tapZone} onPress={() => go(-1)} />
        <View style={styles.tapCenter} pointerEvents="none" />
        <Pressable style={styles.tapZone} onPress={() => go(1)} />
      </View>

      {/* Arrow buttons (discoverable on desktop; harmless on phone). */}
      {!atStart && (
        <Pressable style={[styles.arrow, styles.arrowLeft]} onPress={() => go(-1)} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </Pressable>
      )}
      <Pressable style={[styles.arrow, styles.arrowRight]} onPress={() => go(1)} hitSlop={8}>
        <Ionicons name={atEnd && onNext ? 'play-forward' : 'chevron-forward'} size={24} color="#FFFFFF" />
      </Pressable>

      {/* Page counter */}
      <View style={styles.counter} pointerEvents="none">
        <ThemedText type="small" style={styles.counterText}>
          {index + 1} / {pages.length}
        </ThemedText>
      </View>
    </View>
  );
}

const HIT = 'rgba(0,0,0,0.35)';
const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tapRow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  tapZone: { flex: 1 },
  tapCenter: { flex: 1 },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HIT,
  },
  arrowLeft: { left: 10 },
  arrowRight: { right: 10 },
  counter: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: HIT,
  },
  counterText: { color: '#FFFFFF', fontWeight: '700' },
});
