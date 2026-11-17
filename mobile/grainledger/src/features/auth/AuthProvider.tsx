import { createContext, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';
import { readApiConfiguration } from '@/services/api/config';
import { createAuthClient } from './auth-client';
import { credentialStorage, persistentSignInAvailable } from './credential-storage';
import { hasRole, type UserRole } from './contracts';

type AuthClient = ReturnType<typeof createAuthClient>;
const AuthContext = createContext<AuthClient | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const { theme } = useAppTheme();
  const [client] = useState(() => createAuthClient({ ...readApiConfiguration(), storage: credentialStorage }));
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getServerSnapshot);
  useEffect(() => { void client.initialize(); }, [client]);
  useEffect(() => {
    if (state.status !== 'authenticated') return;
    const timeout = setTimeout(() => { void client.refresh().catch(() => {}); }, Math.min(2_147_000_000, Math.max(0, state.expiresAt - Date.now() - 15_000)));
    return () => clearTimeout(timeout);
  }, [client, state.status, state.expiresAt]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const current = client.getSnapshot();
      if (next === 'active' && current.status === 'authenticated' && current.expiresAt <= Date.now() + 15_000) {
        void client.refresh().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [client]);
  return (
    <AuthContext.Provider value={client}>
      {state.status === 'restoring'
        ? <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Restoring session" color={theme.colors.primary} /></View>
        : children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const client = useContext(AuthContext);
  if (!client) throw new Error('useAuth must be used inside AuthProvider.');
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getServerSnapshot);
  return { ...state, client, persistentSignInAvailable,
    canAccess: (roles?: readonly UserRole[]) => state.status === 'authenticated' && hasRole(state.user, roles) };
}
