import { randomUUID } from 'expo-crypto';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAppTheme } from '@/theme/ThemeProvider';
import { createMeasurementAction, createMeasurementService, validateMeasurement, type MeasurementErrors } from './receiving-measurement';
import type { ReceivingTaskDetail } from './receiving-api';

export function ReceivingMeasurementForm({ detail, locale, onClose, onSaved, onReload }: {
  detail: ReceivingTaskDetail; locale: 'vi' | 'en'; onClose: () => void; onSaved: () => void; onReload: () => void;
}) {
  const { client, user } = useAuth();
  const { theme } = useAppTheme();
  const { colors: c, typography: t } = theme;
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  // This form is keyed by identity/task/version at its entry point. Refresh-token rotation alone is stable.
  const [owner] = useState(() => user!);
  const [context] = useState(() => ({ ...detail }));
  const [scope] = useState(() => client.getRequestScope());
  const action = useMemo(() => createMeasurementAction(createMeasurementService(client.api, owner,
    () => scope !== null && client.getRequestScope() === scope), context, randomUUID), [client, owner, scope, context]);
  const state = useSyncExternalStore(action.subscribe, action.getSnapshot, action.getServerSnapshot);
  useEffect(() => () => action.reset(), [action]);
  const [fields, setFields] = useState({ weight: context.expectedTotalKg || '', moisture: context.originMoisturePercent || '14.5' });
  const [attempted, setAttempted] = useState(false);
  const weightInput = useRef<ComponentRef<typeof TextInput>>(null);
  const moistureInput = useRef<ComponentRef<typeof TextInput>>(null);
  const busy = state.status === 'saving';
  const errors = validateMeasurement(fields).errors;
  function fieldError(field: keyof MeasurementErrors) {
    const error = attempted ? errors[field] : undefined;
    if (!error) return undefined;
    if (error === 'required') return tr('Nhập số đo.', 'Enter the measurement.');
    if (error === 'number') return tr('Nhập số hợp lệ, không dùng dấu phân cách hàng nghìn.', 'Enter a valid number without thousands separators.');
    return field === 'weight' ? tr('Nhập theo bước 0,01 kg.', 'Use increments of 0.01 kg.') : tr('Nhập theo bước 0,1%.', 'Use increments of 0.1%.');
  }
  async function submit() {
    if (busy) return;
    setAttempted(true);
    if (Object.keys(errors).length) { (errors.weight ? weightInput : moistureInput).current?.focus(); return; }
    if (await action.submit(fields)) onSaved();
  }
  const failure = state.error?.status === 409 || state.error?.status === 412
    ? tr('Phiếu đã thay đổi hoặc số đo bị từ chối. Đóng và tải lại phiếu trước khi ghi tiếp.', 'The task changed or the measurement was rejected. Close and reload before continuing.')
    : state.error?.status === 403 ? tr('Bạn không có quyền ghi số đo cho phiếu này.', 'You do not have permission to measure this task.')
      : state.error?.code === 'timeout' || state.error?.code === 'network'
        ? tr('Chưa xác định số đo đã được lưu hay chưa. Tải lại phiếu để kiểm tra trước khi thử lại.', 'The save result is uncertain. Reload the task to check before retrying.')
        : state.error?.code === 'configuration' ? tr('Dịch vụ chưa được cấu hình.', 'The service is not configured.')
          : (state.error?.status === 400 || state.error?.status === 422) && state.error.problem?.detail
            ? state.error.problem.detail
            : tr('Không thể ghi số đo. Kiểm tra thông tin hoặc tải lại phiếu để thử lại.', 'Unable to record the measurement. Review the values or reload the task.');
  return <Modal visible presentationStyle="pageSheet" animationType="none" onRequestClose={() => { if (!busy) onClose(); }}>
    <SafeAreaView style={[styles.screen, { backgroundColor: c.backgroundGrouped }]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
          <View style={styles.toolbar}>
            <Text accessibilityRole="header" style={[t.heading, styles.title, { color: c.textPrimary }]}>{tr('Ghi số đo tiếp nhận', 'Record arrival measurement')}</Text>
            <GlassButton opaque variant="glass" label={tr('Hủy', 'Cancel')} disabled={busy} onPress={onClose} />
          </View>
          <GlassCard title={context.code}>
            <Text style={[t.body, { color: c.textSecondary }]}>{tr('Cơ sở', 'Facility')}: {context.facilityName || context.facilityId}</Text>
            <Text style={[t.body, { color: c.textSecondary }]}>{tr('Giá trị điền sẵn chỉ là gợi ý. Kiểm tra và nhập số cân, độ ẩm thực tế trước khi lưu.', 'Prefilled values are suggestions. Confirm actual mass and moisture before saving.')}</Text>
            <GlassInput opaque ref={weightInput} label={tr('Khối lượng cân thực tế (kg) *', 'Actual measured mass (kg) *')}
              value={fields.weight} onChangeText={(weight) => setFields({ ...fields, weight })} error={fieldError('weight')} disabled={busy}
              keyboardType="decimal-pad" returnKeyType="next" onSubmitEditing={() => moistureInput.current?.focus()}
              helperText={tr('Bước 0,01 kg; dấu phẩy hoặc dấu chấm là phần thập phân.', 'Increment: 0.01 kg. Comma or dot is the decimal separator.')} />
            <GlassInput opaque ref={moistureInput} label={tr('Độ ẩm thực tế (%) *', 'Actual moisture (%) *')}
              value={fields.moisture} onChangeText={(moisture) => setFields({ ...fields, moisture })} error={fieldError('moisture')} disabled={busy}
              keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={() => { void submit(); }}
              helperText={tr('Bước 0,1%.', 'Increment: 0.1%.')} />
            {state.error ? <>
              <Text accessibilityRole="alert" style={[t.body, { color: c.danger }]}>{failure}</Text>
              <GlassButton opaque variant="glass" label={tr('Đóng và tải lại phiếu', 'Close and reload task')} onPress={onReload} />
            </> : null}
            <GlassButton opaque label={tr('Lưu số đo', 'Save measurement')} loading={busy} loadingLabel={tr('Đang lưu…', 'Saving…')} onPress={() => { void submit(); }} />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 20, gap: 20, width: '100%', maxWidth: 560, alignSelf: 'center' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, title: { flex: 1, minWidth: 160 } });
