import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const lightColors = {
  background: '#F4F6F4',
  surface: '#FFFFFF',
  surfaceSecondary: '#E9EEE9',
  groupedBackground: '#EEF2EE',
  elevatedSurface: '#FFFFFF',
  label: '#13251D',
  secondaryLabel: '#4F6258',
  tertiaryLabel: '#5D6E64',
  separator: '#D5DDD7',
  accent: '#246B4B',
  accentMuted: '#DCEDE4',
  onAccent: '#FFFFFF',
  onDestructive: '#FFFFFF',
  destructive: '#BA2D35',
  destructiveMuted: '#F8E5E6',
  success: '#237A4B',
  successMuted: '#DFF1E7',
  warning: '#9A5B0A',
  warningMuted: '#F7EBD6',
  info: '#246394',
  infoMuted: '#DFECF5',
  scrim: 'rgba(10, 24, 17, 0.42)',
  glassTint: 'rgba(250, 252, 250, 0.78)',
  glassTintClear: 'rgba(250, 252, 250, 0.58)',
  glassBorder: 'rgba(255, 255, 255, 0.82)',
  glassHighlight: 'rgba(255, 255, 255, 0.46)',
  shadow: '#102219',
} as const;

export const darkColors: ThemeColors = {
  background: '#0E1511',
  surface: '#17211B',
  surfaceSecondary: '#202C25',
  groupedBackground: '#111A15',
  elevatedSurface: '#243129',
  label: '#F2F6F3',
  secondaryLabel: '#B7C4BC',
  tertiaryLabel: '#8FA097',
  separator: '#33443A',
  accent: '#6EC89B',
  accentMuted: '#234D39',
  onAccent: '#082317',
  onDestructive: '#310C10',
  destructive: '#FF8A8F',
  destructiveMuted: '#52292D',
  success: '#6EC89B',
  successMuted: '#214936',
  warning: '#F3BA67',
  warningMuted: '#50391B',
  info: '#7DBCEB',
  infoMuted: '#203F55',
  scrim: 'rgba(0, 0, 0, 0.62)',
  glassTint: 'rgba(25, 35, 29, 0.82)',
  glassTintClear: 'rgba(25, 35, 29, 0.62)',
  glassBorder: 'rgba(255, 255, 255, 0.16)',
  glassHighlight: 'rgba(255, 255, 255, 0.10)',
  shadow: '#000000',
};

export type ThemeColors = { [K in keyof typeof lightColors]: string };

export const spacing = {
  zero: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  sheet: 32,
  pill: 999,
} as const;

const fontFamily = Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' });

function type(size: number, lineHeight: number, weight: TextStyle['fontWeight'], letterSpacing = 0): TextStyle {
  return { fontFamily, fontSize: size, lineHeight, fontWeight: weight, letterSpacing };
}

export const typography = {
  largeTitle: type(34, 41, '700', -0.8),
  title1: type(28, 34, '700', -0.55),
  title2: type(22, 28, '700', -0.35),
  title3: type(20, 25, '600', -0.2),
  headline: type(17, 22, '600', -0.1),
  body: type(17, 25, '400'),
  callout: type(16, 22, '400'),
  subheadline: type(15, 20, '400'),
  footnote: type(13, 18, '400', 0.05),
  caption: type(12, 16, '400', 0.1),
  captionStrong: type(12, 16, '600', 0.1),
} as const;

export type TypographyVariant = keyof typeof typography;

export const iconSizes = { sm: 16, md: 20, lg: 24, xl: 32 } as const;
export const layout = { compactGutter: 16, regularGutter: 24, maxContentWidth: 760, tabBarHeight: 64 } as const;

export const shadows = {
  subtle: {
    shadowColor: lightColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  } satisfies ViewStyle,
  floating: {
    shadowColor: lightColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  } satisfies ViewStyle,
} as const;

export const motion = {
  duration: { quick: 150, standard: 240, deliberate: 350 },
  spring: { damping: 20, stiffness: 260, mass: 0.8 },
  springGentle: { damping: 22, stiffness: 190, mass: 0.9 },
} as const;

export type AppTheme = {
  scheme: 'light' | 'dark';
  dark: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  iconSizes: typeof iconSizes;
  layout: typeof layout;
  shadows: typeof shadows;
  motion: typeof motion;
};
