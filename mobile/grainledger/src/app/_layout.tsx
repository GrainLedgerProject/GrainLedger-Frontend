import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppThemeProvider, useAppTheme } from '../theme';
import { useAuthStore } from '../store/authStore';
import { useOfflineStore } from '../store/offlineStore';
import { useFieldStore } from '../store/fieldStore';
import { useMillStore } from '../store/millStore';
import { useComplianceStore } from '../store/complianceStore';
import { useRiskStore } from '../store/riskStore';

function AppNavigator() {
  const theme = useAppTheme();
  const formPresentation = {
    presentation: Platform.OS === 'ios' ? 'formSheet' as const : 'modal' as const,
    sheetAllowedDetents: [0.5, 1],
    sheetInitialDetentIndex: 1,
    sheetGrabberVisible: true,
    sheetCornerRadius: theme.radii.sheet,
  };
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, initAuth } = useAuthStore();
  const initQueue = useOfflineStore((state) => state.initQueue);
  const initFieldData = useFieldStore((state) => state.initFieldData);
  const initMillData = useMillStore((state) => state.initMillData);
  const initComplianceData = useComplianceStore((state) => state.initComplianceData);
  const initRiskData = useRiskStore((state) => state.initRiskData);

  useEffect(() => {
    initAuth();
    initQueue();
    initFieldData();
    initMillData();
    initComplianceData();
    initRiskData();
  }, [initAuth, initQueue, initFieldData, initMillData, initComplianceData, initRiskData]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="farmer-form" options={formPresentation} />
        <Stack.Screen name="plot-form" options={formPresentation} />
        <Stack.Screen name="spray-form" options={formPresentation} />
        <Stack.Screen name="procurement-form" options={formPresentation} />
        <Stack.Screen name="receiving-form" options={formPresentation} />
        <Stack.Screen name="operation-form" options={formPresentation} />
        <Stack.Screen name="lab-sample-form" options={formPresentation} />
        <Stack.Screen name="hold-management" options={formPresentation} />
        <Stack.Screen name="correction-form" options={formPresentation} />
        <Stack.Screen name="lot-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="offline-queue" options={{ presentation: 'card' }} />
        <Stack.Screen name="login" options={{ presentation: 'card' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AppNavigator />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
