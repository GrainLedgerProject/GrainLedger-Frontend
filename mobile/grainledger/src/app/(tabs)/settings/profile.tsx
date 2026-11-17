import { NavigationPlaceholder } from '@/components/navigation/NavigationPlaceholder';
import { GlassButton } from '@/components/glass/GlassButton';
import { Text, View } from 'react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function ProfileRoute() {
  const { user, client, busy, message } = useAuth();
  const { theme } = useAppTheme();
  return <NavigationPlaceholder title="Account" path="/settings/profile" description="Your authenticated session is shown below. Profile editing and security workflows remain future tasks.">
    <View style={{ gap: theme.spacing.md }}>
      <Text style={[theme.typography.heading, { color: theme.colors.textPrimary }]}>{user?.displayName}</Text>
      <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{user?.email}</Text>
      <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>Role: {user?.normalizedRole}</Text>
      {message ? <Text accessibilityLiveRegion="polite" style={[theme.typography.caption, { color: theme.colors.danger }]}>{message}</Text> : null}
      <GlassButton label="Sign out" loading={busy} loadingLabel="Signing out…" onPress={() => { void client.logout(); }} />
    </View>
  </NavigationPlaceholder>;
}
