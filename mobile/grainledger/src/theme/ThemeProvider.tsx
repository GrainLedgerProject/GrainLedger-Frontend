import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import {
  darkColors,
  iconSizes,
  layout,
  lightColors,
  motion,
  radii,
  shadows,
  spacing,
  typography,
  type AppTheme,
} from './tokens';

const ThemeContext = createContext<AppTheme | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  const theme = useMemo<AppTheme>(() => ({
    scheme,
    dark: scheme === 'dark',
    colors: scheme === 'dark' ? darkColors : lightColors,
    spacing,
    radii,
    typography,
    iconSizes,
    layout,
    shadows,
    motion,
  }), [scheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }
  return theme;
}
