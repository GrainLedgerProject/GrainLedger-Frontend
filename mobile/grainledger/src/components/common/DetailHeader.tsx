import React, { type ReactNode } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useAppTheme } from '../../theme';

/** Native iOS large title; Android retains the existing screen toolbar. */
export function DetailHeader({ title, fallback, rightAction }: { title: string; fallback: ReactNode; rightAction?: ReactNode }) {
  const theme = useAppTheme();
  if (Platform.OS !== 'ios') return <>{fallback}</>;
  return (
    <Stack.Screen options={{
      headerShown: true,
      title,
      headerLargeTitleEnabled: true,
      headerTintColor: theme.colors.accent,
      headerLargeTitleStyle: { color: theme.colors.label },
      headerTitleStyle: { color: theme.colors.label },
      headerStyle: { backgroundColor: theme.colors.background },
      headerShadowVisible: false,
      headerRight: rightAction ? () => rightAction : undefined,
    }} />
  );
}
