import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { api } from '../../services/api';
import { createCatalogManager } from '../../services/catalogManagement';
import type { CatalogItem, CatalogKind } from '../../services/management';
import { spacing } from '../../theme';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { InputField } from '../common/InputField';
import { AppText } from '../ui/AppText';
import { ChoiceField } from '../ui/ChoiceField';
import { EmptyState, LoadingState } from '../ui/States';

const groups: { value: CatalogKind; label: string }[] = [
  { value: 'commodities', label: 'Hàng hóa' }, { value: 'units', label: 'Đơn vị đo' },
  { value: 'substances', label: 'Hoạt chất' }, { value: 'markets', label: 'Thị trường' },
  { value: 'varieties', label: 'Giống lúa' }, { value: 'attributes', label: 'Chỉ tiêu chất lượng' },
];
const manager = createCatalogManager(api.request.bind(api));

export function CatalogPanel() {
  const [expanded, setExpanded] = useState(false);
  const [kind, setKind] = useState<CatalogKind>('commodities');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ id: string | null } | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [extra, setExtra] = useState('');
  const [limit, setLimit] = useState(10);
  const lock = useRef(false);
  const disabled = loading || busy;

  const load = async (nextKind = kind, search = query) => {
    setLoading(true); setError(null); setItems([]);
    try { setItems(await manager.list(nextKind, search)); setLimit(10); }
    catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Không thể tải danh mục.'); }
    finally { setLoading(false); }
  };
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null); setNotice(null);
    try { await action(); }
    catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Không thể lưu danh mục.'); }
    finally { lock.current = false; setBusy(false); }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.stack}>
        <AppText variant="title3" accessibilityRole="header">Danh mục vận hành</AppText>
        <Button title={expanded ? 'Thu gọn danh mục' : 'Mở danh mục'} variant="secondary" disabled={disabled} onPress={() => {
          setExpanded((value) => !value); if (!expanded) void load();
        }} />
        {expanded ? <>
          <ChoiceField label="Nhóm danh mục" value={kind} options={groups} disabled={disabled} onChange={(value) => {
            const next = groups.find((group) => group.value === value)?.value;
            if (!next) return;
            setKind(next); setQuery(''); setEditor(null); setNotice(null); void load(next, '');
          }} />
          <InputField label="Tìm mã hoặc tên danh mục" value={query} onChangeText={setQuery} editable={!disabled} returnKeyType="search" onSubmitEditing={() => { if (!disabled) void load(); }} />
          <Button title="Tìm & tải lại danh mục" size="small" variant="secondary" disabled={disabled} onPress={() => { setEditor(null); void load(); }} />
          {notice ? <AppText variant="subheadline" color="success" accessibilityLiveRegion="polite">{notice}</AppText> : null}
          {error ? <AppText color="destructive" accessibilityRole="alert">{error}</AppText> : null}
          {loading ? <LoadingState label="Đang tải danh mục" /> : <>
            {editor ? <View style={styles.stack}>
              <AppText variant="headline">{editor.id === null ? 'Thêm mục danh mục' : 'Chỉnh sửa danh mục'}</AppText>
              <InputField label="Mã" value={code} onChangeText={setCode} required editable={!busy && (editor.id === null || kind === 'units' || kind === 'attributes')} autoCapitalize="characters" />
              <InputField label="Tên" value={name} onChangeText={setName} required editable={!busy} />
              {kind === 'units' || kind === 'attributes' ? <InputField label={kind === 'units' ? 'Đại lượng đo' : 'Đơn vị chỉ tiêu'} value={extra} onChangeText={setExtra} placeholder={kind === 'units' ? 'MASS' : '%'} editable={!busy} /> : null}
              <Button title="Lưu danh mục" loading={busy} disabled={!name.trim() || !code.trim()} onPress={() => { void run(async () => {
                await manager.save(kind, editor.id, code, name, extra); setEditor(null); setNotice('Đã lưu danh mục.'); await load();
              }); }} />
              <Button title="Hủy chỉnh sửa" variant="outline" disabled={busy} onPress={() => setEditor(null)} />
            </View> : <Button title="Thêm mục danh mục" disabled={busy} onPress={() => { setEditor({ id: null }); setCode(''); setName(''); setExtra(''); setError(null); }} />}
            {!error && items.length === 0 ? <EmptyState title="Chưa có mục danh mục phù hợp" /> : null}
            {!error && items.slice(0, limit).map((item) => <View key={item.id} style={styles.item}>
              <AppText variant="headline">{item.name}</AppText>
              <AppText variant="footnote" color="secondaryLabel">{item.code}{item.quantityKind ? ` · ${item.quantityKind}` : ''}{item.unit ? ` · ${item.unit}` : ''}</AppText>
              <Button title={`Sửa ${item.name}`} variant="secondary" size="small" disabled={busy} onPress={() => { setEditor({ id: item.id }); setCode(item.code); setName(item.name); setExtra(item.quantityKind || item.unit || ''); setError(null); }} />
              {['commodities', 'units', 'substances'].includes(kind) ? <Button title={`Xóa ${item.name}`} variant="outline" size="small" disabled={busy} onPress={() => Alert.alert('Xóa mục danh mục?', `Bạn muốn xóa ${item.name}?`, [{ text: 'Trở lại', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: () => { void run(async () => {
                await manager.remove(kind, item.id); if (editor?.id === item.id) setEditor(null); setNotice('Đã xóa mục danh mục.'); await load();
              }); } }])} /> : null}
            </View>)}
            {!error && items.length > limit ? <Button title="Xem thêm mục danh mục" variant="secondary" disabled={busy} onPress={() => setLimit((value) => value + 10)} /> : null}
          </>}
        </> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({ card: { marginBottom: spacing.lg }, stack: { gap: spacing.md }, item: { gap: spacing.sm, paddingVertical: spacing.md } });
