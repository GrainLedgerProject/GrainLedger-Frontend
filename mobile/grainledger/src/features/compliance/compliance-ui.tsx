import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassInput, type GlassInputProps } from '@/components/glass/GlassInput';
import { useAppTheme } from '@/theme/ThemeProvider';
import { type ApiError } from '@/services/api/errors';
import { createComplianceAction } from './compliance-actions';

export type Locale = 'vi' | 'en';
export type Translate = (vi: string, en: string) => string;
export function useComplianceAction<T>(execute: (command: T, signal: AbortSignal) => Promise<unknown>) {
  const action = useMemo(() => createComplianceAction(execute), [execute]);
  const state = useSyncExternalStore(action.subscribe, action.getSnapshot, action.getServerSnapshot);
  useEffect(() => () => action.reset(), [action]);
  return { action, state, busy: state.status === 'saving' };
}
export function ComplianceText({ children, error = false, heading = false }: { children: ReactNode; error?: boolean; heading?: boolean }) {
  const { theme } = useAppTheme();
  return <Text accessibilityRole={error ? 'alert' : heading ? 'header' : undefined} selectable
    style={[heading ? theme.typography.heading : theme.typography.body, { color: error ? theme.colors.danger : theme.colors.textPrimary }]}>{children}</Text>;
}
export function ComplianceField(props: GlassInputProps) {
  return <GlassInput opaque autoCorrect={false} autoCapitalize="none" {...props} />;
}
export function Check({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const { theme } = useAppTheme();
  return <View style={formStyles.row}><Text style={[theme.typography.body, { color: theme.colors.textPrimary, flex: 1 }]}>{label}</Text>
    <Switch accessibilityLabel={label} value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: theme.colors.primary }} />
  </View>;
}
export function failureText(error: ApiError, tr: Translate, mutation = false) {
  if (error.status === 403) return tr('Bạn không có quyền thực hiện thao tác trong phạm vi này.', 'You do not have access to this action in this scope.');
  if (error.status === 404) return tr('Không tìm thấy bản ghi. Tải lại danh sách để kiểm tra.', 'The record was not found. Reload the list to check.');
  if (error.status === 409 || error.status === 412) return tr('Bản ghi đã thay đổi hoặc trạng thái không cho phép. Đóng và tải lại trước khi thử tiếp.', 'The record changed or its state prevents this action. Close and reload before continuing.');
  if (error.status === 400 || error.status === 422) return error.problem?.detail || tr('Máy chủ từ chối thông tin. Kiểm tra các trường đã nhập.', 'The server rejected the information. Review the entered fields.');
  if (error.code === 'configuration') return tr('Dịch vụ chưa được cấu hình.', 'The service is not configured.');
  if (mutation && (error.retryable || error.code === 'contract')) return tr('Chưa xác định được kết quả. Đóng và tải lại để kiểm tra trước khi thử lại. Thử lại cùng dữ liệu sẽ giữ mã thao tác.', 'The outcome is uncertain. Close and reload to check before retrying. Retrying unchanged data keeps the operation ID.');
  if (error.code === 'contract') return tr('Dữ liệu trả về không đúng định dạng.', 'The response data is unsupported.');
  return tr('Không thể hoàn tất. Kiểm tra kết nối và thử lại.', 'Unable to complete. Check your connection and retry.');
}
export function ActionFailure({ error, tr, onReload }: { error: ApiError | null; tr: Translate; onReload: () => void }) {
  return error ? <><ComplianceText error>{failureText(error, tr, true)}</ComplianceText>
    <GlassButton opaque variant="glass" label={tr('Đóng và tải lại', 'Close and reload')} onPress={onReload} /></> : null;
}
export function ComplianceSheet({ title, busy, onClose, children, tr }: { title: string; busy: boolean; onClose: () => void; children: ReactNode; tr: Translate }) {
  const { theme } = useAppTheme();
  const close = () => { if (!busy) onClose(); };
  return <Modal visible presentationStyle="pageSheet" animationType="none" onRequestClose={close} allowSwipeDismissal={!busy}>
    <SafeAreaView style={[formStyles.screen, { backgroundColor: theme.colors.backgroundGrouped }]}>
      <KeyboardAvoidingView style={formStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={formStyles.content}>
          <View style={formStyles.row}><Text accessibilityRole="header" style={[theme.typography.heading, { color: theme.colors.textPrimary, flex: 1 }]}>{title}</Text>
            <GlassButton opaque variant="glass" label={tr('Hủy', 'Cancel')} disabled={busy} onPress={close} /></View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
export const formStyles = StyleSheet.create({ screen: { flex: 1 }, content: { width: '100%', maxWidth: 800, alignSelf: 'center', padding: 20, paddingBottom: 40, gap: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 } });
