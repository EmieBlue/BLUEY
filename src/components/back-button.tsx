import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { WalkingArrow } from '@/components/walking-arrow';

export function BackButton({
  onPress,
  close = false,
  disabled = false,
  accessibilityLabel,
  direction = 'back',
}: {
  onPress: () => void;
  close?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  direction?: 'back' | 'forward';
}) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (close ? 'Close' : direction === 'back' ? 'Go back' : 'Go forward')}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: !disabled && (hovered || pressed) ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: !disabled && (hovered || focused || pressed) ? theme.accent : `${theme.accent}66`,
          opacity: disabled ? 0.4 : 1,
          boxShadow: pressed || disabled
            ? 'none'
            : focused ? `0 0 0 3px ${theme.accent}40` : '0 3px 8px rgba(0, 0, 0, 0.12)',
        },
      ]}>
      {({ pressed }) => close
        ? <Ionicons name="close" size={22} color={theme.text} />
        : <WalkingArrow direction={direction} active={hovered || focused || pressed} disabled={disabled} color={theme.text} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
