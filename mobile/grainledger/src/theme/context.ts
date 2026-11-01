import { createContext, useContext } from 'react';
import type { AppTheme } from './tokens';

// Keep context identity stable when Fast Refresh replaces the provider component.
export const ThemeContext = createContext<AppTheme | null>(null);

export function useAppTheme(): AppTheme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }
  return theme;
}
