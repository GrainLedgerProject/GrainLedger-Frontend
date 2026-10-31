import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api } from '../../services/api';
import type { ApiResult } from '../../services/endpoints/transport';
import type { RegistrationPendingDto } from '../../services/endpoints/auth';
import { spacing } from '../../theme';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { InputField } from '../common/InputField';
import { AppText } from '../ui/AppText';

type Mode = 'closed' | 'register' | 'verify' | 'forgot' | 'reset';

function check<T>(result: ApiResult<T>): T | null {
  if (result.error || result.isMock) throw new Error(result.error || 'Không thể kết nối máy chủ.');
  return result.data;
}

function pendingRegistration(result: ApiResult<RegistrationPendingDto>): RegistrationPendingDto {
  const pending = check(result);
  if (!pending || typeof pending.registrationId !== 'string' || !pending.registrationId) {
    throw new Error('Máy chủ chưa trả về mã đăng ký. Vui lòng thử lại.');
  }
  return pending;
}

export function AccountAccessPanel({ onReady }: { onReady: (email: string) => void }) {
  const [mode, setMode] = useState<Mode>('closed');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [registrationId, setRegistrationId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
    setOtp('');
    setRegistrationId('');
  };

  const run = async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try { await action(); }
    catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Vui lòng thử lại.'); }
    finally { inFlight.current = false; setBusy(false); }
  };

  const submit = () => { void run(async () => {
    const address = email.trim();
    if (!address || !address.includes('@')) throw new Error('Vui lòng nhập địa chỉ email hợp lệ.');
    if (mode === 'register') {
      if (!displayName.trim() || !password) throw new Error('Vui lòng nhập tên hiển thị và mật khẩu.');
      const pending = pendingRegistration(await api.auth.register({ email: address, displayName: displayName.trim(), password }));
      setRegistrationId(pending.registrationId);
      setEmail(pending.email || address);
      setPassword('');
      setMode('verify');
      setNotice('Kiểm tra email để lấy mã xác minh đăng ký.');
    } else if (mode === 'verify') {
      if (!otp.trim()) throw new Error('Vui lòng nhập mã xác minh trong email.');
      const user = check(await api.auth.verifyEmail({ email: address, registrationId, otp: otp.trim() }));
      if (!user) throw new Error('Chưa nhận được xác nhận tài khoản từ máy chủ.');
      switchMode('closed');
      onReady(address);
      setNotice('Đã xác minh email. Bạn có thể đăng nhập bằng tài khoản vừa tạo.');
    } else if (mode === 'forgot') {
      check(await api.auth.forgotPassword({ email: address }));
      setMode('reset');
      setNotice('Nếu email thuộc tài khoản đã đăng ký, mã khôi phục sẽ được gửi tới email đó.');
    } else if (mode === 'reset') {
      if (!otp.trim() || !password) throw new Error('Vui lòng nhập mã khôi phục và mật khẩu mới.');
      check(await api.auth.resetPassword({ email: address, otp: otp.trim(), newPassword: password }));
      switchMode('closed');
      onReady(address);
      setNotice('Đã đặt mật khẩu mới. Vui lòng đăng nhập lại.');
    }
  }); };

  return (
    <Card style={styles.card}>
      <View style={styles.content}>
        <AppText variant="title3" accessibilityRole="header">
          {mode === 'closed' ? 'Truy cập tài khoản' : mode === 'register' ? 'Tạo tài khoản' : mode === 'verify' ? 'Xác minh email' : 'Khôi phục mật khẩu'}
        </AppText>
        {notice ? <AppText variant="subheadline" accessibilityLiveRegion="polite">{notice}</AppText> : null}
        {error ? <AppText variant="subheadline" color="destructive" accessibilityRole="alert" accessibilityLiveRegion="assertive">{error}</AppText> : null}
        {mode === 'closed' ? (
          <>
            <Button title="Tạo tài khoản mới" variant="secondary" onPress={() => switchMode('register')} />
            <Button title="Quên mật khẩu" variant="outline" onPress={() => switchMode('forgot')} />
          </>
        ) : (
          <>
            <InputField label="Email" value={email} onChangeText={setEmail} editable={!busy && mode !== 'verify' && mode !== 'reset'} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" />
            {mode === 'register' ? <InputField label="Tên hiển thị" value={displayName} onChangeText={setDisplayName} editable={!busy} autoComplete="name" /> : null}
            {mode === 'verify' || mode === 'reset' ? <InputField label={mode === 'verify' ? 'Mã xác minh email' : 'Mã khôi phục'} value={otp} onChangeText={setOtp} editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete="one-time-code" /> : null}
            {mode === 'register' || mode === 'reset' ? <InputField label={mode === 'reset' ? 'Mật khẩu mới' : 'Mật khẩu'} value={password} onChangeText={setPassword} editable={!busy} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false} /> : null}
            <Button title={mode === 'register' ? 'Đăng ký' : mode === 'verify' ? 'Xác minh email' : mode === 'forgot' ? 'Gửi mã khôi phục' : 'Đặt mật khẩu mới'} onPress={submit} loading={busy} />
            {mode === 'verify' ? <Button title="Gửi lại mã xác minh" variant="secondary" disabled={busy} onPress={() => { void run(async () => {
              const pending = pendingRegistration(await api.auth.resendVerification({ email: email.trim(), registrationId }));
              setRegistrationId(pending.registrationId);
              setOtp('');
              setNotice('Đã yêu cầu gửi lại mã xác minh. Vui lòng kiểm tra email.');
            }); }} /> : null}
            {mode === 'reset' ? <Button title="Gửi lại mã khôi phục" variant="secondary" disabled={busy} onPress={() => { void run(async () => {
              check(await api.auth.forgotPassword({ email: email.trim() }));
              setOtp('');
              setNotice('Đã yêu cầu gửi lại mã khôi phục. Vui lòng kiểm tra email.');
            }); }} /> : null}
            <Button title="Trở lại đăng nhập" variant="outline" disabled={busy} onPress={() => switchMode('closed')} />
          </>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({ card: { marginBottom: spacing.lg }, content: { gap: spacing.md } });
