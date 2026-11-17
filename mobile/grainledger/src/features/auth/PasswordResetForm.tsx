import { useEffect, useRef, useState, useSyncExternalStore, type ComponentRef } from 'react';
import { Text, TextInput, View } from 'react-native';

import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import type { GlassViewProps } from '@/components/glass/GlassView';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAuth } from './AuthProvider';
import type { RecoveryFailure } from './password-recovery';
import { createPasswordReset, resetPasswordErrors } from './password-reset';

type Props = { initialEmail: string; locale: 'vi' | 'en'; blurTarget: GlassViewProps['blurTarget'];
  onRequestCode: () => void; onBackToSignIn: () => void };

export function PasswordResetForm({ initialEmail, locale, blurTarget, onRequestCode, onBackToSignIn }: Props) {
  const { client } = useAuth();
  const { theme } = useAppTheme();
  const { colors: c, typography: t } = theme;
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [operation] = useState(() => createPasswordReset(client.resetPassword));
  const state = useSyncExternalStore(operation.subscribe, operation.getSnapshot, operation.getServerSnapshot);
  const mounted = useRef(false);
  const otpField = useRef<ComponentRef<typeof TextInput> | null>(null);
  const passwordField = useRef<ComponentRef<typeof TextInput> | null>(null);
  const pending = state.status === 'loading';
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const errors = state.status === 'invalid' ? resetPasswordErrors({ email, otp, newPassword }) : {};
  const failures: Record<RecoveryFailure, string> = {
    configuration: tr('Dịch vụ khôi phục chưa sẵn sàng trên bản cài đặt này.', 'Password recovery is unavailable in this installation.'),
    network: tr('Mất kết nối, chưa thể xác nhận kết quả. Hãy thử đăng nhập trước khi gửi lại.', 'Connection lost; the result could not be confirmed. Try signing in before submitting again.'),
    timeout: tr('Quá thời gian chờ, chưa thể xác nhận kết quả. Hãy thử đăng nhập trước khi gửi lại.', 'The request timed out; the result could not be confirmed. Try signing in before submitting again.'),
    'rate-limit': tr('Có quá nhiều yêu cầu. Vui lòng thử lại sau.', 'Too many requests. Please try again later.'),
    request: tr('Không thể đặt lại mật khẩu. Kiểm tra email, mã khôi phục và mật khẩu rồi thử lại.', 'Unable to reset the password. Check the email, recovery code and password, then try again.'),
  };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; operation.reset(); }; }, [operation]);
  async function submit() {
    if (client.configurationError) return;
    await operation.submit({ email, otp, newPassword });
    if (mounted.current && operation.getSnapshot().status !== 'invalid') {
      setOtp(''); setNewPassword(''); setVisible(false);
    }
  }
  return <GlassCard blurTarget={blurTarget} title={state.status === 'success' ? tr('Đã đặt lại mật khẩu', 'Password reset complete') : tr('Đặt mật khẩu mới', 'Set a new password')}>
    {state.status === 'success' ? <View accessibilityLiveRegion="polite" style={{ gap: theme.spacing.md }}>
      <Text accessibilityRole="header" style={[t.label, { color: c.success }]}>{tr('Yêu cầu đặt lại mật khẩu đã hoàn tất.', 'The password reset request completed.')}</Text>
      <Text style={[t.body, { color: c.textPrimary }]}>{tr('Quay lại đăng nhập bằng mật khẩu mới.', 'Return to sign in with your new password.')}</Text>
    </View> : <>
      <Text style={[t.body, { color: c.textSecondary }]}>{tr('Nhập mã khôi phục trong email và mật khẩu mới phù hợp với chính sách tài khoản.',
        'Enter the recovery code from your email and a new password that meets your account policy.')}</Text>
      <GlassInput label={tr('Địa chỉ email', 'Email address')} value={email} onChangeText={setEmail} editable={!pending}
        keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" returnKeyType="next"
        onSubmitEditing={() => otpField.current?.focus()}
        error={errors.email === 'required' ? tr('Email không được để trống.', 'Enter your email address.')
          : errors.email === 'format' ? tr('Định dạng email không hợp lệ.', 'Enter a valid email address.') : undefined} />
      <GlassInput ref={otpField} label={tr('Mã khôi phục', 'Recovery code')} value={otp} onChangeText={setOtp}
        editable={!pending} autoCapitalize="none" autoCorrect={false} autoComplete="one-time-code" returnKeyType="next"
        onSubmitEditing={() => passwordField.current?.focus()}
        error={errors.otp ? tr('Vui lòng nhập mã khôi phục.', 'Enter your recovery code.') : undefined} />
      <GlassInput ref={passwordField} label={tr('Mật khẩu mới', 'New password')} value={newPassword} onChangeText={setNewPassword}
        editable={!pending} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="new-password"
        returnKeyType="go" onSubmitEditing={() => { void submit(); }}
        error={errors.newPassword ? tr('Vui lòng nhập mật khẩu mới.', 'Enter a new password.') : undefined} />
      <GlassButton label={visible ? tr('Ẩn mật khẩu mới', 'Hide new password') : tr('Hiện mật khẩu mới', 'Show new password')}
        variant="glass" disabled={pending} accessibilityState={{ selected: visible }} onPress={() => setVisible(!visible)} />
      {state.status === 'error' || client.configurationError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite"
        style={[t.caption, { color: c.danger }]}>{client.configurationError ? failures.configuration : state.status === 'error' ? failures[state.reason] : null}</Text> : null}
      <GlassButton label={tr('Đặt lại mật khẩu', 'Reset password')} fullWidth loading={pending}
        loadingLabel={tr('Đang đặt lại mật khẩu…', 'Resetting password…')} disabled={Boolean(client.configurationError)} onPress={() => { void submit(); }} />
      <GlassButton label={tr('Yêu cầu mã khôi phục khác', 'Request another recovery code')} variant="glass" fullWidth onPress={onRequestCode} />
    </>}
    <GlassButton label={tr('Quay lại đăng nhập', 'Back to sign in')} variant="glass" fullWidth onPress={onBackToSignIn} />
  </GlassCard>;
}
