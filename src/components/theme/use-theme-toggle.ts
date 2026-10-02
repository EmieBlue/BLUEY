import { useEffect, useRef } from 'react';

import { type ThemeKey } from '@/constants/theme';
import { useThemeMode } from '@/context/theme';

export function useThemeToggle() {
  const theme = useThemeMode();
  const choices = useRef<{ light: ThemeKey; dark: ThemeKey }>({
    light: 'emerald',
    dark: 'emeralddark',
  });

  useEffect(() => {
    // Warm follows the device, so it cannot be a reliable opposite-mode target.
    if (theme.themeKey !== 'system') {
      choices.current[theme.isDark ? 'dark' : 'light'] = theme.themeKey;
    }
  }, [theme.themeKey, theme.isDark]);

  return {
    ...theme,
    oppositeKey: choices.current[theme.isDark ? 'light' : 'dark'],
  };
}
