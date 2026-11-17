import { useCallback } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { useApiResource } from '@/hooks/use-api-resource';
import { useAppTheme } from '@/theme/ThemeProvider';
import { sampleDate, type LabSample, type createLabSamplesService } from './lab-samples-api';

export function LabSampleDetail({ sample, service, locale, onClose, onHandover }: {
  sample: LabSample; service: ReturnType<typeof createLabSamplesService>; locale: 'vi' | 'en'; onClose: () => void; onHandover: () => void;
}) {
  const { theme } = useAppTheme();
  const { colors: c, typography: t } = theme;
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const unknown = tr('Chưa được cung cấp', 'Not provided');
  const load = useCallback((signal: AbortSignal) => service.handovers(sample.id, signal), [service, sample.id]);
  const state = useApiResource(load);
  const data = state.status === 'success' ? state.data : null;
  const loading = state.status === 'idle' || state.isLoading;
  const errorText = state.error?.status === 403 ? tr('Bạn không có quyền xem lịch sử bàn giao này.', 'You do not have access to this handover history.')
    : state.error?.status === 404 ? tr('Không tìm thấy lịch sử cho mẫu này. Đóng và tải lại danh sách để kiểm tra.', 'The sample history was not found. Close and refresh the list.')
      : state.error?.code === 'contract' ? tr('Dữ liệu bàn giao không đúng định dạng.', 'Unsupported handover data.')
        : tr('Không thể tải lịch sử bàn giao. Kiểm tra kết nối và thử lại.', 'Unable to load handover history. Check your connection and retry.');
  return <Modal visible presentationStyle="pageSheet" allowSwipeDismissal animationType="none" onRequestClose={onClose}>
    <SafeAreaView style={[styles.screen, { backgroundColor: c.backgroundGrouped }]}>
      <FlatList data={data ?? []} keyExtractor={(item, index) => item.id ? `id:${item.id}` : item.entityId ? `entity:${item.entityId}` : `row:${index}`}
        contentContainerStyle={styles.content} refreshing={state.isLoading} onRefresh={() => { void state.reload(); }}
        ListHeaderComponent={<View style={styles.header}>
          <View style={styles.toolbar}>
            <Text accessibilityRole="header" style={[t.heading, styles.title, { color: c.textPrimary }]}>{tr('Chi tiết mẫu', 'Sample detail')}</Text>
            <GlassButton opaque variant="glass" label={tr('Đóng', 'Close')} onPress={onClose} />
          </View>
          <GlassCard title={sample.code || sample.id}>
            <Text selectable style={[t.body, { color: c.textPrimary }]}>{tr('ID mẫu', 'Sample ID')}: {sample.id}</Text>
            <Text selectable style={[t.body, { color: c.textPrimary }]}>{tr('Mã niêm chì', 'Seal code')}: {sample.sealCode || unknown}</Text>
            <Text selectable style={[t.body, { color: c.textPrimary }]}>{tr('Lô nguyên liệu nguồn', 'Source lot')}: {sample.sourceLotId}</Text>
            <Text style={[t.body, { color: c.textSecondary }]}>{tr('Lấy mẫu lúc', 'Collected at')}: {sampleDate(sample.collectedAt, locale)}</Text>
            <Text style={[t.body, { color: c.textSecondary }]}>{tr('Mô tả nguyên liệu', 'Material description')}: {sample.materialDescription || unknown}</Text>
            <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Số lượt bàn giao trong danh sách', 'Handover count from the list')}: {sample.handoverCount}</Text>
          </GlassCard>
          <GlassButton opaque label={tr('Bàn giao mẫu tới lab', 'Hand over sample to lab')} onPress={onHandover} />
          <Text accessibilityRole="header" style={[t.heading, { color: c.textPrimary }]}>{tr('Lịch sử bàn giao', 'Handover history')}</Text>
          <GlassButton opaque variant="glass" label={tr('Tải lại lịch sử', 'Refresh history')} loading={loading}
            loadingLabel={tr('Đang tải…', 'Loading…')} onPress={() => { void state.reload(); }} />
          {state.status === 'error' ? <GlassCard>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger }]}>{errorText}</Text>
            <GlassButton opaque variant="glass" label={tr('Thử lại', 'Retry')} onPress={() => { void state.reload(); }} />
          </GlassCard> : null}
          {data ? <Text accessibilityLiveRegion="polite" style={[t.caption, { color: c.textSecondary }]}>{data.length} {tr('lượt bàn giao được trả về.', 'handover records returned.')}</Text> : null}
        </View>}
        ListEmptyComponent={state.status !== 'error' ? <GlassCard>
          <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textSecondary }]}>{loading
            ? tr('Đang tải lịch sử bàn giao…', 'Loading handover history…')
            : tr('Chưa có lượt bàn giao nào được trả về cho mẫu này.', 'No handover records were returned for this sample.')}</Text>
        </GlassCard> : undefined}
        renderItem={({ item, index }) => <GlassCard title={`${tr('Bàn giao', 'Handover')} ${index + 1}`} style={styles.row}>
          <Text style={[t.body, { color: c.textPrimary }]}>{tr('Bên giao', 'From')}: {item.fromParty || unknown}</Text>
          <Text style={[t.body, { color: c.textPrimary }]}>{tr('Bên nhận', 'To')}: {item.toParty || unknown}</Text>
          <Text style={[t.body, { color: c.textSecondary }]}>{tr('Thời gian', 'Time')}: {sampleDate(item.handedOverAt, locale)}</Text>
          <Text style={[t.body, { color: c.textSecondary }]}>{tr('Tình trạng niêm phong', 'Seal condition')}: {item.sealCondition || unknown}</Text>
          {item.handoverKind ? <Text style={[t.body, { color: c.textSecondary }]}>{tr('Loại bàn giao', 'Handover kind')}: {item.handoverKind}</Text> : null}
          <Text style={[t.body, { color: c.textSecondary }]}>{tr('Phòng xét nghiệm', 'Laboratory')}: {item.laboratoryName || unknown}</Text>
          {item.laboratoryReference ? <Text selectable style={[t.body, { color: c.textSecondary }]}>{tr('Tham chiếu lab', 'Laboratory reference')}: {item.laboratoryReference}</Text> : null}
          {item.laboratorySampleReference ? <Text selectable style={[t.body, { color: c.textSecondary }]}>{tr('Tham chiếu mẫu lab', 'Laboratory sample reference')}: {item.laboratorySampleReference}</Text> : null}
          {item.evidenceRef ? <Text selectable style={[t.body, { color: c.textSecondary }]}>{tr('Tham chiếu chứng từ', 'Evidence reference')}: {item.evidenceRef}</Text> : null}
        </GlassCard>}
        ListFooterComponent={<Text style={[t.caption, styles.footer, { color: c.textSecondary }]}>{tr('Thời gian theo cài đặt thiết bị. Lịch sử bàn giao không thay thế kết quả xét nghiệm hay đánh giá MRL.', 'Times follow device settings. Handover history does not replace lab results or MRL assessment.')}</Text>} />
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  header: { gap: 16, paddingBottom: 16 }, toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  title: { flex: 1, minWidth: 160 }, row: { marginBottom: 12 }, footer: { paddingVertical: 16 } });
