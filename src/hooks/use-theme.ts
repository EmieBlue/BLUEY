/**
 * Returns the active color palette for the currently-selected theme
 * (Navy & Gold / Emerald & White / Warm). Driven by AppThemeProvider so the
 * whole app recolors from one place.
 */

import { useThemeMode } from '@/context/theme';

export function useTheme() {
  return useThemeMode().palette;
}
