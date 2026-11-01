import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { api } from '../../services/api';
import { buildMrlVersion, createMrlManager, type MrlLimit, type MrlSummary } from '../../services/mrlManagement';
import type { CatalogItem } from '../../services/management';
import { spacing } from '../../theme';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { InputField } from '../common/InputField';
import { AppText } from '../ui/AppText';
import { ChoiceField } from '../ui/ChoiceField';
import { EmptyState, LoadingState } from '../ui/States';

const manager = createMrlManager(api.request.bind(api));
const statusLabels = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã công bố', ARCHIVED: 'Đã lưu trữ' };
const choices = (items: CatalogItem[]) => items.map((item) => ({ value: item.id, label: `${item.name} · ${item.code}` }));

export function MrlVersionsPanel() {
  const [opened, setOpened] = useState(false);
  const [versions, setVersions] = useState<MrlSummary[]>([]);
  const [markets, setMarkets] = useState<CatalogItem[]>([]);
  const [commodities, setCommodities] = useState<CatalogItem[]>([]);
  const [substances, setSubstances] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [marketId, setMarketId] = useState('');
  const [commodityId, setCommodityId] = useState('');
  const [date, setDate] = useState('');
  const [source, setSource] = useState('');
  const [selected, setSelected] = useState<MrlSummary | null>(null);
  const [limits, setLimits] = useState<MrlLimit[]>([]);
  const [substanceId, setSubstanceId] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('mg/kg');
  const [limit, setLimit] = useState(10);
  const [limitCount, setLimitCount] = useState(20);
  const lock = useRef(false);
  const disabled = loading || busy;

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const result = await manager.load();
      setVersions(result.versions); setMarkets(result.markets); setCommodities(result.commodities); setSubstances(result.substances);
      setSelected(null); setLimit(10);
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Không thể tải phiên bản MRL.'); }
    finally { setLoading(false); }
  };
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null); setNotice(null);
    try { await action(); }
    catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Thao tác chưa hoàn tất.'); }
    finally { lock.current = false; setBusy(false); }
  };

  return <Card style={styles.card}><View style={styles.stack}>
    <AppText variant="title3" accessibilityRole="header">Phiên bản giới hạn MRL</AppText>
    <Button title={opened ? 'Thu gọn phiên bản MRL' : 'Quản lý phiên bản MRL'} variant="secondary" disabled={disabled} onPress={() => { setOpened((state) => !state); if (!opened) void load(); }} />
    {opened ? <>
      <Button title="Tải lại phiên bản & danh mục" size="small" variant="secondary" disabled={disabled} onPress={() => { void load(); }} />
      {notice ? <AppText color="success" accessibilityLiveRegion="polite">{notice}</AppText> : null}
      {error ? <AppText color="destructive" accessibilityRole="alert">{error}</AppText> : null}
      {loading ? <LoadingState label="Đang tải phiên bản MRL" /> : <>
        {creating ? <View style={styles.stack}>
          <ChoiceField label="Thị trường" value={marketId} options={choices(markets)} onChange={setMarketId} disabled={busy} />
          <ChoiceField label="Hàng hóa" value={commodityId} options={choices(commodities)} onChange={setCommodityId} disabled={busy} />
          <InputField label="Ngày hiệu lực" placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} editable={!busy} autoCorrect={false} />
          <InputField label="Nguồn tham chiếu" value={source} onChangeText={setSource} editable={!busy} multiline />
          <Button title="Tạo bản nháp MRL" loading={busy} onPress={() => { void run(async () => {
            await manager.create(buildMrlVersion(marketId, commodityId, date, source)); setCreating(false); setNotice('Đã tạo bản nháp MRL.'); await load();
          }); }} />
          <Button title="Hủy tạo bản nháp" variant="outline" disabled={busy} onPress={() => setCreating(false)} />
        </View> : <Button title="Thêm bản nháp MRL" disabled={busy} onPress={() => { setCreating(true); setSelected(null); }} />}
        {selected ? <View style={styles.stack}>
          <AppText variant="headline">{selected.marketName} · {selected.commodityName}</AppText>
          <AppText variant="footnote" color="secondaryLabel">{statusLabels[selected.status]}</AppText>
          {selected.status === 'DRAFT' ? <>
            <ChoiceField label="Hoạt chất" value={substanceId} options={choices(substances)} onChange={setSubstanceId} disabled={busy} />
            <InputField label="Giới hạn hoạt chất" value={value} onChangeText={setValue} editable={!busy} keyboardType="decimal-pad" />
            <InputField label="Đơn vị" value={unit} onChangeText={setUnit} editable={!busy} autoCorrect={false} />
            <Button title="Lưu giới hạn" loading={busy} onPress={() => { void run(async () => {
              await manager.saveLimit(selected.id, substanceId, value, unit); setNotice('Đã lưu giới hạn.'); setLimits(await manager.limits(selected.id));
            }); }} />
          </> : null}
          {limits.length === 0 ? <EmptyState title="Chưa có giới hạn hoạt chất" /> : limits.slice(0, limitCount).map((entry) => <View key={entry.substanceId} style={styles.item}>
            <AppText variant="headline">{entry.substanceName || substances.find((substance) => substance.id === entry.substanceId)?.name || entry.substanceId}</AppText>
            <AppText>{entry.limitValue} {entry.unit}</AppText>
            {selected.status === 'DRAFT' ? <>
              <Button title="Sửa giới hạn này" size="small" variant="secondary" disabled={busy} onPress={() => { setSubstanceId(entry.substanceId); setValue(String(entry.limitValue)); setUnit(entry.unit); }} />
              <Button title="Xóa giới hạn" size="small" variant="outline" disabled={busy} onPress={() => Alert.alert('Xóa giới hạn hoạt chất?', 'Giới hạn sẽ được xóa khỏi bản nháp này.', [{ text: 'Trở lại', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: () => { void run(async () => {
                await manager.removeLimit(selected.id, entry.substanceId); setNotice('Đã xóa giới hạn.'); setLimits(await manager.limits(selected.id));
              }); } }])} />
            </> : null}
          </View>)}
          {limits.length > limitCount ? <Button title="Xem thêm giới hạn" size="small" variant="secondary" onPress={() => setLimitCount((count) => count + 20)} disabled={busy} /> : null}
          <Button title="Đóng chi tiết phiên bản" variant="outline" disabled={busy} onPress={() => setSelected(null)} />
        </View> : !error ? <>
          {versions.length === 0 ? <EmptyState title="Chưa có phiên bản MRL" /> : versions.slice(0, limit).map((version) => <View key={version.id} style={styles.item}>
            <AppText variant="headline">{version.marketName} · {version.commodityName}</AppText>
            <AppText variant="footnote" color="secondaryLabel">{statusLabels[version.status]} · {version.effectiveFrom}</AppText>
            {version.sourceRef ? <AppText variant="subheadline" color="secondaryLabel">{version.sourceRef}</AppText> : null}
            <Button title="Xem giới hạn hoạt chất" variant="secondary" size="small" disabled={busy} onPress={() => { void run(async () => {
              const entries = await manager.limits(version.id); setLimits(entries); setSelected(version); setLimitCount(20); setSubstanceId(''); setValue('');
            }); }} />
            {version.status === 'DRAFT' ? <Button title="Công bố phiên bản" variant="outline" size="small" disabled={busy} onPress={() => Alert.alert('Công bố phiên bản MRL?', `${version.marketName} · ${version.commodityName}. Phiên bản sẽ được áp dụng cho kiểm định.`, [{ text: 'Trở lại', style: 'cancel' }, { text: 'Công bố', onPress: () => { void run(async () => {
              await manager.publish(version.id); setNotice('Đã công bố phiên bản MRL.'); await load();
            }); } }])} /> : null}
          </View>)}
          {versions.length > limit ? <Button title="Xem thêm phiên bản" variant="secondary" disabled={busy} onPress={() => setLimit((count) => count + 10)} /> : null}
        </> : null}
      </>}
    </> : null}
  </View></Card>;
}

const styles = StyleSheet.create({ card: { marginBottom: spacing.lg }, stack: { gap: spacing.md }, item: { gap: spacing.sm, paddingVertical: spacing.md } });
