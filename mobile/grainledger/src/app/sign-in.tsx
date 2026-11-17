import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassInput } from '@/components/glass/GlassInput';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthError, safeReturnPath, validateLogin } from '@/features/auth/contracts';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function SignInScreen() {
  const { theme } = useAppTheme();
  const { client, status, busy, message, cleanupRequired, persistentSignInAvailable } = useAuth();
  const { returnUrl } = useLocalSearchParams<{ returnUrl?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(persistentSignInAvailable);
  const [visible, setVisible] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const target = useRef<ComponentRef<typeof View> | null>(null);
  const passwordField = useRef<ComponentRef<typeof TextInput> | null>(null);
  const { colors: c, typography: t, spacing: s } = theme;
  const errors = validateLogin(email, password);

  async function submit() {
    setAttempted(true);
    setError(null);
    if (errors.email || errors.password || busy) return;
    try { await client.login(email, password, remember); setPassword(''); }
    catch (failure) {
      setPassword('');
      if (!(failure instanceof AuthError && failure.code === 'cancelled')) setError(failure instanceof Error ? failure.message : 'Sign-in failed. Try again.');
    }
  }
  if (status === 'authenticated') return <Redirect href={safeReturnPath(returnUrl)} />;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BlurTargetView ref={target} pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
        <LinearGradient colors={theme.gradients.ambient} style={StyleSheet.absoluteFill} />
      </BlurTargetView>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: s.page, gap: s.xl,
              maxWidth: theme.layout.maxContentWidth, width: '100%', alignSelf: 'center' }}>
            <Text style={[t.label, { color: c.textSecondary }]}>GRAINLEDGER</Text>
            <Text accessibilityRole="header" style={[t.display, { color: c.textPrimary }]}>Welcome back.</Text>
            <Text style={[t.body, { color: c.textSecondary }]}>Sign in with your organization account.</Text>
            <GlassCard blurTarget={target} title="Your workspace, connected.">
              <GlassInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address"
                autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"
                returnKeyType="next" onSubmitEditing={() => passwordField.current?.focus()} editable={!busy}
                error={attempted ? errors.email : undefined} />
              <GlassInput ref={passwordField} label="Password" value={password} onChangeText={setPassword}
                secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="current-password"
                textContentType="password" returnKeyType="go" onSubmitEditing={() => { void submit(); }} editable={!busy}
                error={attempted ? errors.password : undefined} />
              <View style={styles.toggleRow}>
                <Text style={[t.label, { color: c.textPrimary }]}>Show password</Text>
                <Switch accessibilityLabel="Show password" value={visible} onValueChange={setVisible} disabled={busy}
                  trackColor={{ false: c.controlBorder, true: c.primary }} thumbColor={c.surface} />
              </View>
              {persistentSignInAvailable ? <View style={styles.toggleRow}>
                <Text style={[t.label, { color: c.textPrimary }]}>Keep me signed in</Text>
                <Switch accessibilityLabel="Keep me signed in" value={remember} onValueChange={setRemember} disabled={busy}
                  trackColor={{ false: c.controlBorder, true: c.primary }} thumbColor={c.surface} />
              </View> : <Text style={[t.caption, { color: c.textSecondary }]}>Web preview sign-in lasts for this open session.</Text>}
              {error || message || client.configurationError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite"
                style={[t.caption, { color: c.danger }]}>{error ?? message ?? client.configurationError}</Text> : null}
              <GlassButton label="Sign in" fullWidth loading={busy} loadingLabel="Connecting…"
                disabled={Boolean(client.configurationError || cleanupRequired)} onPress={() => { void submit(); }} />
              <GlassButton label="Forgot password?" variant="glass" fullWidth disabled={busy}
                onPress={() => router.push('/forgot-password')} />
              {cleanupRequired ? <GlassButton label="Retry saved-session removal" variant="glass" loading={busy}
                onPress={() => { void client.logout(); }} /> : null}
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({ toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', minHeight: 48 } });
