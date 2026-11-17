import { Platform, type TextStyle } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ColorScheme = Exclude<ThemeMode, 'system'>;
export const themeModes: readonly ThemeMode[] = ['system', 'light', 'dark'];
export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}
export function resolveColorScheme(mode: ThemeMode, systemScheme: string | null | undefined): ColorScheme {
  return mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
}

const light = {
  background: '#F3F6F1', surface: '#FFFFFF', surfaceRaised: '#E0EBE2',
  glass: 'rgba(255,255,255,0.88)', border: '#BCCBC0', controlBorder: '#5E7566', glassBorder: 'rgba(255,255,255,0.72)',
  textPrimary: '#172D23', textSecondary: '#4B6256', textDisabled: '#53665A',
  primary: '#176347', onPrimary: '#FFFFFF', accent: '#805818',
  success: '#176347', successSurface: '#E2F1E8',
  warning: '#79530D', warningSurface: '#FFF0CE',
  danger: '#AD263C', dangerSurface: '#FCE8EC',
  info: '#225D83', infoSurface: '#E4F0FA',
  disabledSurface: '#E0E8E1', focus: '#176347',
  ambientStart: '#D7E8DD', ambientEnd: '#EEE1C9',
  shadow: 'rgba(17,46,31,0.12)', shadowStrong: 'rgba(17,46,31,0.18)',
};
const dark: typeof light = {
  background: '#0C1714', surface: '#172923', surfaceRaised: '#243D32',
  glass: 'rgba(23,41,35,0.94)', border: '#5C796A', controlBorder: '#7B9B87', glassBorder: 'rgba(215,236,222,0.24)',
  textPrimary: '#EEF6EF', textSecondary: '#ADC3B5', textDisabled: '#91A99A',
  primary: '#85DCB2', onPrimary: '#102B20', accent: '#EBC989',
  success: '#85DCB2', successSurface: '#193E2B',
  warning: '#EBC989', warningSurface: '#3A301D',
  danger: '#FF9CAB', dangerSurface: '#44232D',
  info: '#9DCEF2', infoSurface: '#1D3445',
  disabledSurface: '#243D32', focus: '#85DCB2',
  ambientStart: '#1D4936', ambientEnd: '#423A24',
  shadow: 'rgba(0,0,0,0.24)', shadowStrong: 'rgba(0,0,0,0.36)',
};
export const palettes = { light, dark };
export type ThemeColors = typeof light;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, page: 20, xl: 24, xxl: 32, section: 40, hero: 64 };
export const radius = { sm: 8, control: 14, card: 22, sheet: 28, pill: 999 };
export const fontFamilies = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  web: { sans: 'var(--font-display)', serif: 'var(--font-serif)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
});
export const typography = {
  display: { fontFamily: fontFamilies.serif, fontSize: 42, lineHeight: 48, letterSpacing: -1 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '600' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18 },
  mono: { fontFamily: fontFamilies.mono, fontSize: 12, lineHeight: 18 },
} satisfies Record<string, TextStyle>;
export const glass = { intensity: 32, borderWidth: 1 };
export const layout = { maxContentWidth: 560, minTouchTarget: 48 };

function createTheme(scheme: ColorScheme) {
  const colors = palettes[scheme];
  return {
    scheme, colors, spacing, radius, typography, glass, layout,
    gradients: { ambient: [colors.ambientStart, colors.background, colors.ambientEnd] as const },
    shadows: {
      none: { boxShadow: 'none' },
      soft: { boxShadow: `0 4px 16px ${colors.shadow}` },
      raised: { boxShadow: `0 12px 32px ${colors.shadowStrong}` },
    },
  };
}
export const themes = { light: createTheme('light'), dark: createTheme('dark') };
export type AppTheme = ReturnType<typeof createTheme>;
