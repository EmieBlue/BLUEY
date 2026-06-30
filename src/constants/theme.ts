/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2A2017',
    background: '#FBF7F1',
    backgroundElement: '#F1E8DC',
    backgroundSelected: '#E7DACB',
    textSecondary: '#7A6E62',
    /** Brand accent — warm terracotta/amber, used on primary CTAs and links. */
    accent: '#B5651D',
    /** Text/icon color that sits on top of the accent color. */
    accentOn: '#FFFFFF',
  },
  dark: {
    text: '#F4EDE3',
    background: '#17120E',
    backgroundElement: '#241C15',
    backgroundSelected: '#31261C',
    textSecondary: '#B7A998',
    accent: '#D98E4F',
    accentOn: '#1B1208',
  },
  // Navy Blue + Gold — premium, classy (dark).
  navy: {
    text: '#F4F1E6',
    background: '#0B1F3A',
    backgroundElement: '#13294A',
    backgroundSelected: '#1C3A63',
    textSecondary: '#9FB0C9',
    accent: '#D4AF37',
    accentOn: '#0B1F3A',
  },
  // Emerald Green + White — clean, fresh (light).
  emerald: {
    text: '#0C2A22',
    background: '#FFFFFF',
    backgroundElement: '#EAF5F0',
    backgroundSelected: '#D5EBE1',
    textSecondary: '#5E7B72',
    accent: '#0F8B6D',
    accentOn: '#FFFFFF',
  },
  // Rosé Noir — deep plum + rose pink, romantic (dark).
  rose: {
    text: '#F6ECF1',
    background: '#1B1118',
    backgroundElement: '#281A24',
    backgroundSelected: '#382433',
    textSecondary: '#C0A6B6',
    accent: '#E96D8B',
    accentOn: '#1B1118',
  },
  // Midnight Violet — indigo + lavender, premium (dark).
  violet: {
    text: '#ECEAFB',
    background: '#111021',
    backgroundElement: '#1C1A33',
    backgroundSelected: '#282650',
    textSecondary: '#A8A4CC',
    accent: '#9B7BFF',
    accentOn: '#111021',
  },
  // Peach Sorbet — warm cream + coral, cheerful (light).
  peach: {
    text: '#3A2A24',
    background: '#FFF8F3',
    backgroundElement: '#FCE7DD',
    backgroundSelected: '#F7D2C3',
    textSecondary: '#8C7064',
    accent: '#FB6F5A',
    accentOn: '#FFFFFF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Selectable color themes for the in-app theme switcher. */
export type ThemeKey = 'system' | 'navy' | 'emerald' | 'rose' | 'violet' | 'peach';
export const THEMES: { key: ThemeKey; label: string }[] = [
  { key: 'navy', label: 'Navy & Gold' },
  { key: 'emerald', label: 'Emerald & White' },
  { key: 'rose', label: 'Rosé Noir' },
  { key: 'violet', label: 'Midnight Violet' },
  { key: 'peach', label: 'Peach Sorbet' },
  { key: 'system', label: 'Warm' },
];

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
/**
 * Max width of the centered content column. Phones are narrower than this so they
 * fill the screen (app-like); on desktop the site shows a wide centered column.
 */
export const MaxContentWidth = 960;
