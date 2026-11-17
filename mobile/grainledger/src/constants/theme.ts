/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';
import { palettes, fontFamilies, spacing } from '@/theme/tokens';

const legacyColors = (colors: typeof palettes.light) => ({
  text: colors.textPrimary, background: colors.background, backgroundElement: colors.surface,
  backgroundSelected: colors.surfaceRaised, textSecondary: colors.textSecondary,
});
export const Colors = { light: legacyColors(palettes.light), dark: legacyColors(palettes.dark) };
export type ThemeColor = keyof typeof Colors.light;
export const Fonts = fontFamilies;
export const Spacing = {
  half: spacing.xs / 2,
  one: spacing.xs,
  two: spacing.sm,
  three: spacing.lg,
  four: spacing.xl,
  five: spacing.xxl,
  six: spacing.hero,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
