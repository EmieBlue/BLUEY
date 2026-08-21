import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

const GOLD = '#F5A623';

/**
 * Read-only star rating. Supports halves (e.g. 4.3 → 4 full + 1 half).
 */
export function Stars({
  value,
  size = 16,
  color = GOLD,
  style,
}: {
  value: number;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', gap: 2 }, style]}>
      {[1, 2, 3, 4, 5].map((i) => {
        const name = value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline';
        return <Ionicons key={i} name={name} size={size} color={color} />;
      })}
    </View>
  );
}

/**
 * Interactive 1–5 star picker. Tap a star to set the rating.
 */
export function StarPicker({
  value,
  onChange,
  size = 34,
  color = GOLD,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
  color?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`}>
          <Ionicons name={value >= i ? 'star' : 'star-outline'} size={size} color={color} />
        </Pressable>
      ))}
    </View>
  );
}
