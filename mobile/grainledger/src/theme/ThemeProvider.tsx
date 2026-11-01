import React, { useMemo, useSyncExternalStore, type PropsWithChildren } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { ThemeContext } from './context';
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

// Hydration itself is the only transition; the system scheme hook owns updates.
const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function AppThemeProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  // Server HTML and the browser's first hydration pass must use the same palette.
  // After hydration, follow the browser preference and continue observing changes.
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot);
  const scheme = colorScheme === 'dark' && (Platform.OS !== 'web' || hydrated) ? 'dark' : 'light';

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
