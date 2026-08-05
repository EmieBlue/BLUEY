import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { Colors, THEMES, type ThemeColor, type ThemeKey } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Palette = Record<ThemeColor, string>;

/** Every selectable key, used to validate the persisted value. */
const VALID_KEYS = new Set<string>(THEMES.map((t) => t.key));

/** Custom (non-system) themes and whether each is dark. */
const CUSTOM_THEMES: Partial<Record<ThemeKey, { palette: Palette; isDark: boolean }>> = {
  navy: { palette: Colors.navy, isDark: true },
  emerald: { palette: Colors.emerald, isDark: false },
  rose: { palette: Colors.rose, isDark: true },
  violet: { palette: Colors.violet, isDark: true },
  peach: { palette: Colors.peach, isDark: false },
};

interface ThemeMode {
  themeKey: ThemeKey;
  setThemeKey: (key: ThemeKey) => void;
  palette: Palette;
  isDark: boolean;
}

const STORAGE_KEY = 'bluey.theme';
const ThemeContext = createContext<ThemeMode | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [themeKey, setThemeKeyState] = useState<ThemeKey>('emerald');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v && VALID_KEYS.has(v)) setThemeKeyState(v as ThemeKey);
    });
  }, []);

  const setThemeKey = (key: ThemeKey) => {
    setThemeKeyState(key);
    AsyncStorage.setItem(STORAGE_KEY, key).catch(() => {});
  };

  const value = useMemo<ThemeMode>(() => {
    const custom = CUSTOM_THEMES[themeKey];
    if (custom) {
      return { themeKey, setThemeKey, palette: custom.palette, isDark: custom.isDark };
    }
    // 'system' (Warm) follows the device light/dark setting.
    const systemDark = scheme === 'dark';
    return {
      themeKey,
      setThemeKey,
      palette: systemDark ? Colors.dark : Colors.light,
      isDark: systemDark,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKey, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode(): ThemeMode {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within AppThemeProvider');
  }
  return ctx;
}
