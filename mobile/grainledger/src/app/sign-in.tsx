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
  const passwordField = useRef<ComponentRef<typeof TextInput> | null>(null);
  const { colors: c, typography: t, spacing: s } = theme;
  const errors = validateLogin(email, password);

  async function submit() {
    setAttempted(true);
    setError(null);
    if (errors.email || errors.password || busy) return;
    try {
      await client.login(email, password, remember);
      setPassword('');
    } catch (failure) {
      setPassword('');
      if (!(failure instanceof AuthError && failure.code === 'cancelled')) {
        setError(failure instanceof Error ? failure.message : 'Sign-in failed. Try again.');
      }
    }
  }

  if (status === 'authenticated') return <Redirect href={safeReturnPath(returnUrl) as any} />;

  return (
    <View style={{ flex: 1, backgroundColor: c.backgroundGrouped }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[
              styles.content,
              {
                padding: s.page,
                gap: s.lg,
                maxWidth: 520,
              },
            ]}
          >
            <View style={styles.headerBlock}>
              <Text style={[t.caption, styles.brand, { color: c.primary }]}>GRAINLEDGER</Text>
              <Text accessibilityRole="header" style={[t.display, { color: c.textPrimary }]}>
                Đăng nhập
              </Text>
              <Text style={[t.body, { color: c.textSecondary }]}>
                Sử dụng tài khoản tổ chức của bạn để truy cập sổ cái chuỗi cung ứng lúa gạo.
              </Text>
            </View>

            <GlassCard opaque title="Thông tin xác thực" description="Nhập email và mật khẩu được cấp quyền.">
              <GlassInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordField.current?.focus()}
                editable={!busy}
                error={attempted ? errors.email : undefined}
              />
              <GlassInput
                ref={passwordField}
                label="Mật khẩu"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!visible}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => {
                  void submit();
                }}
                editable={!busy}
                error={attempted ? errors.password : undefined}
              />
              <View style={styles.toggleRow}>
                <Text style={[t.label, { color: c.textPrimary }]}>Hiện mật khẩu</Text>
                <Switch
                  accessibilityLabel="Hiện mật khẩu"
                  value={visible}
                  onValueChange={setVisible}
                  disabled={busy}
                  trackColor={{ false: c.controlBorder, true: c.primary }}
                  thumbColor={c.surface}
                />
              </View>
              {persistentSignInAvailable ? (
                <View style={styles.toggleRow}>
                  <Text style={[t.label, { color: c.textPrimary }]}>Duy trì đăng nhập</Text>
                  <Switch
                    accessibilityLabel="Duy trì đăng nhập"
                    value={remember}
                    onValueChange={setRemember}
                    disabled={busy}
                    trackColor={{ false: c.controlBorder, true: c.primary }}
                    thumbColor={c.surface}
                  />
                </View>
              ) : (
                <Text style={[t.caption, { color: c.textSecondary }]}>
                  Phiên đăng nhập trên bản xem trước web chỉ kéo dài trong phiên hiện tại.
                </Text>
              )}
              {error || message || client.configurationError ? (
                <View style={[styles.errorBox, { backgroundColor: c.dangerSurface }]}>
                  <Text
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                    style={[t.caption, { color: c.danger, fontWeight: '600' }]}
                  >
                    {error ?? message ?? client.configurationError}
                  </Text>
                </View>
              ) : null}
              <GlassButton
                label="Đăng nhập"
                fullWidth
                loading={busy}
                loadingLabel="Đang kết nối…"
                disabled={Boolean(client.configurationError || cleanupRequired)}
                onPress={() => {
                  void submit();
                }}
              />
              <GlassButton
                label="Quên mật khẩu?"
                variant="glass"
                fullWidth
                disabled={busy}
                onPress={() => router.push('/forgot-password')}
              />
              {cleanupRequired ? (
                <GlassButton
                  label="Xóa phiên đã lưu và thử lại"
                  variant="glass"
                  loading={busy}
                  onPress={() => {
                    void client.logout();
                  }}
                />
              ) : null}
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  headerBlock: {
    gap: 8,
  },
  brand: {
    letterSpacing: 2,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
  },
});
