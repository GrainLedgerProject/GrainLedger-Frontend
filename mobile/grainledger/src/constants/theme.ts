import '@/global.css';
import { Platform } from 'react-native';
import { darkColors, layout, lightColors, spacing, type ThemeColors } from '../theme';

export const Colors = {
  light: {
    ...lightColors,
    text: lightColors.label,
    textSecondary: lightColors.secondaryLabel,
    backgroundElement: lightColors.surfaceSecondary,
    backgroundSelected: lightColors.accentMuted,
  },
  dark: {
    ...darkColors,
    text: darkColors.label,
    textSecondary: darkColors.secondaryLabel,
    backgroundElement: darkColors.surfaceSecondary,
    backgroundSelected: darkColors.accentMuted,
  },
} as const;

export type ThemeColor = keyof ThemeColors;

export const Fonts = Platform.select({
  ios: { sans: 'System', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  android: { sans: 'sans-serif', serif: 'serif', rounded: 'sans-serif', mono: 'monospace' },
  default: { sans: 'system-ui', serif: 'serif', rounded: 'system-ui', mono: 'monospace' },
});

export const Spacing = {
  half: spacing.xxs,
  one: spacing.xs,
  two: spacing.sm,
  three: spacing.lg,
  four: spacing.xl,
  five: spacing.xxl,
  six: spacing.huge,
} as const;

export const BottomTabInset = layout.tabBarHeight;
export const MaxContentWidth = layout.maxContentWidth;
