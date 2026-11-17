import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { createFarmerActions } from './farmer-actions';
import { farmerErrors, type Farmer } from './farmers-api';

export type FarmerEditorTarget = { kind: 'create'; farmer: null } | { kind: 'update' | 'delete'; farmer: Farmer };
export function farmerFailure(status: number, code: string, tr: (vi: string, en: string) => string) {
  if (status === 409 || status === 412) return tr('Dữ liệu bị trùng, đã thay đổi hoặc đang được sử dụng. Đóng và tải lại để kiểm tra trước khi thử lại.', 'The record conflicts, has changed or is in use. Close and reload before retrying.');
  if (status === 403) return tr('Bạn không có quyền thực hiện thao tác này.', 'You do not have permission for this action.');
  if (code === 'configuration') return tr('Dịch vụ chưa sẵn sàng. Kiểm tra cấu hình ứng dụng.', 'The service is not configured or available.');
  if (code === 'network' || code === 'timeout') return tr('Chưa xác định kết quả lưu. Kiểm tra danh sách trước khi thử lại.', 'The save result is uncertain. Check the list before retrying.');
  return tr('Không thể lưu thay đổi. Kiểm tra thông tin và thử lại.', 'Unable to save changes. Review the information and retry.');
}

export function FarmerEditor({ target, actions, state, locale, onClose, onSaved, onReload }: {
  target: FarmerEditorTarget; actions: ReturnType<typeof createFarmerActions>;
  state: ReturnType<ReturnType<typeof createFarmerActions>['getSnapshot']>;
  locale: 'vi' | 'en'; onClose: () => void; onSaved: () => void; onReload: () => void;
}) {
  const { theme } = useAppTheme();
  const { colors: c, typography: t } = theme;
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [form, setForm] = useState(() => ({ code: target.farmer?.code ?? `FARMER-${Date.now().toString().slice(-4)}`,
    name: target.farmer?.name ?? '', contact: target.farmer?.contact ?? '' }));
  const [attempted, setAttempted] = useState(false);
  const nameInput = useRef<ComponentRef<typeof TextInput>>(null);
  const codeInput = useRef<ComponentRef<typeof TextInput>>(null);
  const contactInput = useRef<ComponentRef<typeof TextInput>>(null);
  const busy = state.status === 'saving';
  const errors = farmerErrors(form);
  const close = () => { if (!busy) onClose(); };
  async function submit() {
    if (busy) return;
    setAttempted(true);
    if (target.kind !== 'delete' && (errors.code || errors.name)) {
      (errors.code ? codeInput : nameInput).current?.focus(); return;
    }
    const accepted = target.kind === 'delete' ? await actions.remove(target.farmer) : await actions.save(form, target.farmer);
    if (accepted) onSaved();
  }
  return <Modal visible animationType="none" presentationStyle="pageSheet" onRequestClose={close}>
    <SafeAreaView style={[styles.screen, { backgroundColor: c.backgroundGrouped }]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
          <View style={styles.toolbar}>
            <Text accessibilityRole="header" style={[t.heading, styles.flex, { color: c.textPrimary }]}>{target.kind === 'delete'
              ? tr('Xóa nông hộ', 'Delete farmer') : target.kind === 'update' ? tr('Cập nhật nông hộ', 'Edit farmer') : tr('Thêm nông hộ', 'Add farmer')}</Text>
            <GlassButton opaque variant="glass" label={tr('Hủy', 'Cancel')} disabled={busy} onPress={close} />
          </View>
          <GlassCard opaque>
            {target.kind === 'delete' ? <Text style={[t.body, { color: c.textPrimary }]}>{tr('Bạn có chắc muốn xóa hồ sơ nông hộ', 'Delete the farmer record for')} “{target.farmer.name}” ({target.farmer.code})?</Text> : <>
              <GlassInput opaque ref={codeInput} label={tr('Mã nông hộ *', 'Farmer code *')} value={form.code} disabled={busy}
                autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => nameInput.current?.focus()}
                onChangeText={(code) => setForm({ ...form, code })} error={attempted && errors.code ? tr('Nhập mã nông hộ.', 'Enter a farmer code.') : undefined} />
              <GlassInput opaque ref={nameInput} label={tr('Họ và tên *', 'Full name *')} value={form.name} disabled={busy}
                autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => contactInput.current?.focus()}
                onChangeText={(name) => setForm({ ...form, name })} error={attempted && errors.name ? tr('Nhập họ và tên.', 'Enter the full name.') : undefined} />
              <GlassInput opaque ref={contactInput} label={tr('Điện thoại / thông tin liên hệ', 'Phone / contact information')} value={form.contact} disabled={busy}
                helperText={tr('Không bắt buộc. Có thể nhập số điện thoại hoặc địa chỉ liên hệ.', 'Optional. Enter a phone number or contact address.')}
                returnKeyType="done" onSubmitEditing={() => { void submit(); }} onChangeText={(contact) => setForm({ ...form, contact })} />
            </>}
            {state.error ? <>
              <Text accessibilityRole="alert" style={[t.body, { color: c.danger }]}>{farmerFailure(state.error.status, state.error.code, tr)}</Text>
              <GlassButton opaque variant="glass" label={tr('Đóng và tải lại', 'Close and reload')} disabled={busy} onPress={onReload} />
            </> : null}
            <GlassButton opaque variant={target.kind === 'delete' ? 'glass' : 'primary'}
              labelStyle={target.kind === 'delete' ? { color: c.danger } : undefined}
              label={target.kind === 'delete' ? tr('Xác nhận xóa', 'Confirm deletion') : tr('Lưu nông hộ', 'Save farmer')}
              loading={busy} loadingLabel={tr('Đang xử lý…', 'Processing…')} onPress={() => { void submit(); }} />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 20, gap: 20, width: '100%', maxWidth: 560, alignSelf: 'center' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, flex: { flex: 1, minWidth: 160 } });
