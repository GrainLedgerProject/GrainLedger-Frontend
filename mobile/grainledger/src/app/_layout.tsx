import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { ThemeProvider, useAppTheme } from '@/theme/ThemeProvider';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { safeReturnPath } from '@/features/auth/contracts';

if (Platform.OS !== 'web') void SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = { anchor: 'index' };

export default function RootLayout() {
  return <ThemeProvider><AuthProvider><RootNavigator /></AuthProvider></ThemeProvider>;
}

function RootNavigator() {
  const { theme } = useAppTheme();
  const { canAccess } = useAuth();
  const pathname = usePathname();
  const { colors, scheme } = theme;
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: { ...base.colors, primary: colors.primary, background: colors.background,
      card: colors.surface, text: colors.textPrimary, border: colors.border, notification: colors.danger },
  };

  useEffect(() => {
    if (Platform.OS !== 'web') void SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {Platform.OS === 'android' ? <NavigationBar style={scheme === 'dark' ? 'light' : 'dark'} hidden={false} /> : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" options={{ title: 'Welcome to GrainLedger' }} />
        <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
        <Stack.Screen name="forgot-password" options={{ title: 'Password recovery' }} />
        <Stack.Protected guard={canAccess()} redirectTo={{ pathname: '/sign-in', params: { returnUrl: safeReturnPath(pathname) } }}>
          <Stack.Screen name="(tabs)" options={{ title: 'GrainLedger' }} />
        </Stack.Protected>
        <Stack.Screen name="theme-demo" options={{ title: 'Theme studio', headerShown: true }} />
      </Stack>
    </NavigationThemeProvider>
  );
}
