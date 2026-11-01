import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const lightColors = {
  background: '#FFFFFF',
  surface: '#F8F8F8',
  surfaceSecondary: '#EFEFEF',
  groupedBackground: '#F3F3F3',
  elevatedSurface: '#FFFFFF',
  label: '#191919',
  secondaryLabel: '#555555',
  tertiaryLabel: '#666666',
  separator: '#DEDEDE',
  accent: '#2F6B3A',
  accentMuted: '#F0F5F1',
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
  scrim: 'rgba(0, 0, 0, 0.42)',
  glassTint: 'rgba(255, 255, 255, 0.78)',
  glassTintClear: 'rgba(255, 255, 255, 0.58)',
  glassBorder: 'rgba(255, 255, 255, 0.82)',
  glassHighlight: 'rgba(255, 255, 255, 0.46)',
  shadow: '#000000',
} as const;

export const darkColors: ThemeColors = {
  background: '#101010',
  surface: '#1A1A1A',
  surfaceSecondary: '#242424',
  groupedBackground: '#141414',
  elevatedSurface: '#292929',
  label: '#F5F5F5',
  secondaryLabel: '#BDBDBD',
  tertiaryLabel: '#A3A3A3',
  separator: '#383838',
  accent: '#78BC83',
  accentMuted: '#1C261E',
  onAccent: '#101810',
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
  glassTint: 'rgba(28, 28, 28, 0.82)',
  glassTintClear: 'rgba(28, 28, 28, 0.62)',
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
export const layout = { compactGutter: 16, regularGutter: 24, maxContentWidth: 760, tabBarHeight: 64, minTouchTarget: Platform.OS === 'android' ? 48 : 44 } as const;

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
