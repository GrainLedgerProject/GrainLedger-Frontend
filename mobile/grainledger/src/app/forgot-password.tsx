import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState, useSyncExternalStore, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { useAuth } from '@/features/auth/AuthProvider';
import { PasswordResetForm } from '@/features/auth/PasswordResetForm';
import { createPasswordRecovery, recoveryEmailError, type RecoveryFailure } from '@/features/auth/password-recovery';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function ForgotPasswordScreen() {
  const { client } = useAuth();
  const { theme } = useAppTheme();
  const { colors: c, typography: t, spacing: s } = theme;
  const [email, setEmail] = useState('');
  const [locale, setLocale] = useState<'vi' | 'en'>('en');
  const [resetting, setResetting] = useState(false);
  const [operation] = useState(() => createPasswordRecovery(client.forgotPassword));
  const state = useSyncExternalStore(operation.subscribe, operation.getSnapshot, operation.getServerSnapshot);
  const pending = state.status === 'loading';
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const target = useRef<ComponentRef<typeof View> | null>(null);
  const fieldError = state.status === 'invalid' ? recoveryEmailError(email) : undefined;
  const failures: Record<RecoveryFailure, string> = {
    configuration: tr('Dịch vụ khôi phục chưa sẵn sàng trên bản cài đặt này.', 'Password recovery is unavailable in this installation.'),
    network: tr('Không thể kết nối. Kiểm tra mạng và thử lại.', 'Could not connect. Check your connection and try again.'),
    timeout: tr('Yêu cầu quá thời gian chờ. Vui lòng thử lại.', 'The request timed out. Please try again.'),
    'rate-limit': tr('Có quá nhiều yêu cầu. Vui lòng thử lại sau.', 'Too many requests. Please try again later.'),
    request: tr('Không thể gửi yêu cầu khôi phục. Vui lòng thử lại.', 'Unable to request password recovery. Please try again.'),
  };
  useEffect(() => () => operation.reset(), [operation]);

  function backToSignIn() {
    operation.reset();
    router.dismissTo('/sign-in');
  }
  return <View style={{ flex: 1, backgroundColor: c.background }}>
    <BlurTargetView ref={target} pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <LinearGradient colors={theme.gradients.ambient} style={StyleSheet.absoluteFill} />
    </BlurTargetView>
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.content, { padding: s.page, gap: s.xl }]}>
          <View style={styles.header}>
            <Text style={[t.label, { color: c.primary }]}>GRAINLEDGER</Text>
            <GlassButton label={locale === 'en' ? 'Tiếng Việt' : 'English'} variant="glass" onPress={() => setLocale(locale === 'en' ? 'vi' : 'en')} />
          </View>
          <Text accessibilityRole="header" style={[t.title, { color: c.textPrimary }]}>{tr('Khôi phục mật khẩu', 'Password recovery')}</Text>
          <Text style={[t.body, { color: c.textSecondary }]}>{tr('Yêu cầu khôi phục quyền truy cập qua email.', 'Request account recovery by email.')}</Text>
          {resetting ? <PasswordResetForm initialEmail={email.trim()} locale={locale} blurTarget={target}
            onRequestCode={() => { operation.reset(); setResetting(false); }} onBackToSignIn={backToSignIn} />
          : <GlassCard blurTarget={target} title={state.status === 'success' ? tr('Yêu cầu đã được tiếp nhận', 'Request received') : tr('Email tài khoản', 'Account email')}>
            {state.status === 'success' ? <>
              <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: c.successSurface }]}>
                <Text accessibilityRole="header" style={[t.label, { color: c.success }]}>{tr('Yêu cầu đã được tiếp nhận', 'Request received')}</Text>
                <Text style={[t.body, { color: c.textPrimary }]}>{tr(
                  'Nếu địa chỉ email đã được đăng ký trong GrainLedger, hướng dẫn khôi phục sẽ được gửi tới hộp thư.',
                  'If this email is registered in GrainLedger, recovery instructions will be sent to the address.')}</Text>
                <Text selectable style={[t.label, { color: c.textPrimary }]}>{state.submittedEmail}</Text>
              </View>
              <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Để bảo vệ quyền riêng tư, hệ thống không tiết lộ email có tồn tại hay không.',
                'To protect privacy, the system does not disclose whether an email address exists.')}</Text>
            </> : <>
              <Text style={[t.body, { color: c.textSecondary }]}>{tr('Nhập địa chỉ email tài khoản đã được cấp quyền để yêu cầu mã khôi phục.',
                'Enter your authorized account email to request a recovery code.')}</Text>
              <GlassInput label={tr('Địa chỉ email', 'Email address')} value={email} onChangeText={setEmail}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"
                placeholder={tr('ten.ban@congty.com', 'your.name@company.com')} returnKeyType="send" editable={!pending}
                error={fieldError === 'required' ? tr('Email không được để trống.', 'Enter your email address.')
                  : fieldError === 'format' ? tr('Định dạng email không hợp lệ.', 'Enter a valid email address.') : undefined}
                onSubmitEditing={() => { if (!client.configurationError) void operation.submit(email); }} />
              {state.status === 'error' || client.configurationError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite"
                style={[t.caption, { color: c.danger }]}>{client.configurationError ? failures.configuration : state.status === 'error' ? failures[state.reason] : null}</Text> : null}
              <GlassButton label={tr('Gửi mã khôi phục', 'Request recovery code')} fullWidth loading={pending}
                loadingLabel={tr('Đang gửi yêu cầu…', 'Sending request…')} disabled={Boolean(client.configurationError)} onPress={() => { void operation.submit(email); }} />
              <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Hệ thống không tiết lộ email có tồn tại hay không.', 'The system does not disclose whether an email address exists.')}</Text>
            </>}
            <GlassButton label={tr('Tôi đã có mã khôi phục', 'I have a recovery code')} variant="glass" fullWidth disabled={pending}
              onPress={() => { operation.reset(); setResetting(true); }} />
            <GlassButton label={tr('Quay lại đăng nhập', 'Back to sign in')} variant="glass" fullWidth onPress={backToSignIn} />
          </GlassCard>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </View>;
}
const styles = StyleSheet.create({ content: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  notice: { padding: 16, borderRadius: 14, gap: 12 } });
