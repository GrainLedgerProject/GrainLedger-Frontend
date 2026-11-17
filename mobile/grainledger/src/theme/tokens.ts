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
  background: '#FFFFFF', backgroundGrouped: '#F2F2F7', surface: '#FFFFFF', surfaceRaised: '#F2F2F7',
  glass: 'rgba(255,255,255,0.96)', border: '#D1D1D6', controlBorder: '#767680', glassBorder: '#D1D1D6',
  textPrimary: '#1C1C1E', textSecondary: '#636366', textDisabled: '#636366',
  primary: '#176347', onPrimary: '#FFFFFF', accent: '#176347',
  selectedSurface: '#E9F2ED',
  success: '#176347', successSurface: '#E9F2ED',
  warning: '#79530D', warningSurface: '#FFF0CE',
  danger: '#B42332', dangerSurface: '#FCE8EC',
  info: '#225D83', infoSurface: '#E4F0FA',
  disabledSurface: '#E5E5EA', focus: '#176347',
  ambientStart: '#F2F2F7', ambientEnd: '#FFFFFF',
  shadow: 'rgba(0,0,0,0.06)', shadowStrong: 'rgba(0,0,0,0.12)',
};
const dark: typeof light = {
  background: '#000000', backgroundGrouped: '#000000', surface: '#1C1C1E', surfaceRaised: '#2C2C2E',
  glass: 'rgba(28,28,30,0.96)', border: '#38383A', controlBorder: '#8E8E93', glassBorder: '#38383A',
  textPrimary: '#F2F2F7', textSecondary: '#AEAEB2', textDisabled: '#AEAEB2',
  primary: '#85DCB2', onPrimary: '#102B20', accent: '#85DCB2',
  selectedSurface: '#17392A',
  success: '#85DCB2', successSurface: '#17392A',
  warning: '#EBC989', warningSurface: '#3A301D',
  danger: '#FF9AA2', dangerSurface: '#44232D',
  info: '#9DCEF2', infoSurface: '#1D3445',
  disabledSurface: '#2C2C2E', focus: '#85DCB2',
  ambientStart: '#000000', ambientEnd: '#000000',
  shadow: 'rgba(0,0,0,0.36)', shadowStrong: 'rgba(0,0,0,0.50)',
};
export const palettes = { light, dark };
export type ThemeColors = typeof light;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, page: 20, xl: 24, xxl: 32, section: 40, hero: 64 };
export const radius = { sm: 8, control: 12, card: 16, sheet: 24, pill: 999 };
export const fontFamilies = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  web: { sans: 'system-ui, -apple-system, sans-serif', serif: 'ui-serif, Georgia, serif', rounded: 'ui-rounded, sans-serif', mono: 'ui-monospace, monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
});
export const typography = {
  display: { fontFamily: fontFamilies.sans, fontSize: 34, lineHeight: 42, letterSpacing: -0.5, fontWeight: '700' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '600' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  mono: { fontFamily: fontFamilies.mono, fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;
export const glass = { intensity: 20, borderWidth: 1 };
export const layout = { maxContentWidth: 560, minTouchTarget: 48 };

function createTheme(scheme: ColorScheme) {
  const colors = palettes[scheme];
  return {
    scheme, colors, spacing, radius, typography, glass, layout,
    gradients: { ambient: [colors.ambientStart, colors.background, colors.ambientEnd] as const },
    shadows: {
      none: { boxShadow: 'none' },
      soft: { boxShadow: 'none' },
      raised: { boxShadow: `0 4px 16px ${colors.shadow}` },
    },
  };
}
export const themes = { light: createTheme('light'), dark: createTheme('dark') };
export type AppTheme = ReturnType<typeof createTheme>;
