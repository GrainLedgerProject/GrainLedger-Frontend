import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { api } from '../../services/api';
import { parseCorrections, type CorrectionItem } from '../../services/corrections';
import { spacing } from '../../theme';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { InputField } from '../common/InputField';
import { AppText } from '../ui/AppText';
import { EmptyState, ErrorState, LoadingState } from '../ui/States';

const labels: Record<CorrectionItem['status'], string> = {
  PENDING_REVIEW: 'Chờ quản lý duyệt', RECONCILED: 'Đã đối soát',
  COMMITTED: 'Đã chốt bút toán bù', CANCELLED: 'Đã hủy',
};

async function fetchList(): Promise<CorrectionItem[]> {
  const result = await api.ledger.getCorrections();
  if (result.error || result.isMock) throw new Error(result.error || 'Không thể kết nối máy chủ.');
  return parseCorrections(result.data);
}

export function CorrectionsPanel() {
  const [items, setItems] = useState<CorrectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [limit, setLimit] = useState(10);
  const revision = useRef(0);
  const actionInFlight = useRef(false);

  const load = useCallback(async () => {
    const current = ++revision.current;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchList();
      if (current === revision.current) setItems(list);
    } catch (reason: unknown) {
      if (current === revision.current) setError(reason instanceof Error ? reason.message : 'Không thể tải yêu cầu hiệu chỉnh.');
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchList().then((list) => {
      if (active) setItems(list);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Không thể tải yêu cầu hiệu chỉnh.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const act = async (item: CorrectionItem, action: 'commit' | 'cancel') => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = action === 'commit'
        ? await api.ledger.commitCorrection(item.id, { notes: notes.trim() })
        : await api.ledger.cancelCorrection(item.id, { notes: notes.trim() || 'Cancelled by user' });
      if (result.error || result.isMock) throw new Error(result.error || 'Chưa ghi nhận được thao tác trên máy chủ.');
      setSelectedId(null);
      setNotes('');
      await load();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật yêu cầu.');
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  };

  const confirm = (item: CorrectionItem, action: 'commit' | 'cancel') => {
    Alert.alert(action === 'commit' ? 'Chốt bút toán bù?' : 'Hủy yêu cầu hiệu chỉnh?',
      action === 'commit' ? 'Bút toán bù được ghi nhận; lịch sử gốc được giữ nguyên.' : `Yêu cầu ${item.id} sẽ được hủy.`,
      [{ text: 'Trở lại', style: 'cancel' }, {
        text: action === 'commit' ? 'Chốt bút toán' : 'Hủy yêu cầu',
        style: action === 'cancel' ? 'destructive' : 'default',
        onPress: () => { void act(item, action); },
      }]);
  };

  return (
    <View style={styles.section}>
      <AppText variant="title2" accessibilityRole="header">Yêu cầu hiệu chỉnh</AppText>
      <AppText variant="subheadline" color="secondaryLabel">Danh sách từ máy chủ. Quyền xử lý do máy chủ kiểm tra.</AppText>
      <Button title="Tải lại yêu cầu" variant="secondary" size="small" onPress={() => { void load(); }} disabled={busy || loading} />
      {loading ? <LoadingState label="Đang tải yêu cầu hiệu chỉnh" /> : error ? (
        <ErrorState title="Chưa thể tải hoặc cập nhật" message={error} actionLabel="Thử lại" onAction={() => { void load(); }} />
      ) : items.length === 0 ? <EmptyState title="Chưa có yêu cầu hiệu chỉnh" /> : (
        <>
          {items.slice(0, limit).map((item) => (
            <Card key={item.id}>
              <View style={styles.item}>
                <AppText variant="headline">{item.operationId}</AppText>
                <AppText variant="footnote" color={item.status === 'COMMITTED' ? 'success' : 'secondaryLabel'}>{labels[item.status]}</AppText>
                <AppText>{item.reason}</AppText>
                <AppText variant="caption" color="secondaryLabel">{item.id} · {item.createdAt}</AppText>
                {item.reconciliationNotes ? <AppText variant="subheadline" color="secondaryLabel">{item.reconciliationNotes}</AppText> : null}
                {['PENDING_REVIEW', 'RECONCILED'].includes(item.status) ? selectedId === item.id ? (
                  <View style={styles.item}>
                    <InputField label="Ghi chú xử lý" value={notes} onChangeText={setNotes} editable={!busy} multiline />
                    <Button title="Chốt bút toán bù" onPress={() => confirm(item, 'commit')} loading={busy} />
                    <Button title="Hủy yêu cầu" variant="danger" onPress={() => confirm(item, 'cancel')} disabled={busy} />
                    <Button title="Đóng" variant="secondary" disabled={busy} onPress={() => setSelectedId(null)} />
                  </View>
                ) : <Button title="Xử lý yêu cầu" variant="secondary" disabled={busy} onPress={() => { setSelectedId(item.id); setNotes(''); }} /> : null}
              </View>
            </Card>
          ))}
          {items.length > limit ? <Button title="Xem thêm yêu cầu" variant="secondary" onPress={() => setLimit((value) => value + 10)} /> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginTop: spacing.xl },
  item: { gap: spacing.sm },
});
