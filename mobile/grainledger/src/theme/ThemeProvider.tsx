import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { isThemeMode, palettes, resolveColorScheme, themes, type AppTheme, type ThemeMode } from './tokens';

export const THEME_STORAGE_KEY = 'grainledger.appearance.v1';
type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  hydrated: boolean;
  storageError: string | null;
  setMode: (mode: ThemeMode) => Promise<void>;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const pendingWrite = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => { if (active && isThemeMode(stored)) setModeState(stored); })
      .catch(() => { if (active) setStorageError('Saved appearance could not be loaded. Using the system setting.'); })
      .finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, []);

  const scheme = resolveColorScheme(mode, systemScheme);
  const theme = themes[scheme];
  const setMode = (next: ThemeMode) => {
    setModeState(next);
    // Serialize writes so rapid taps cannot restore an older choice on the next launch.
    pendingWrite.current = pendingWrite.current.then(async () => {
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, next);
        setStorageError(null);
      } catch {
        setStorageError('Appearance changed for this session. Your selection could not be saved. Tap a mode to retry.');
      }
    });
    return pendingWrite.current;
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, hydrated, storageError, setMode }}>
      {hydrated ? children : <View style={{ flex: 1, backgroundColor: palettes.dark.background }} />}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useAppTheme must be used inside ThemeProvider.');
  return value;
}
