import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { useAuth } from '@/features/auth/AuthProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { readApiConfiguration } from '@/services/api/config';
import { useAppTheme } from '@/theme/ThemeProvider';
import { createFarmerActions } from './farmer-actions';
import { FarmerEditor, type FarmerEditorTarget } from './FarmerEditor';
import { canManageFarmers, createFarmerCache, createFarmerService, farmerCacheKey } from './farmers-api';

export function FarmersScreen() {
  const auth = useAuth();
  const { theme } = useAppTheme();
  const scope = auth.client.getRequestScope();
  if (!auth.user || scope === null) return null;
  if (!canManageFarmers(auth.user)) return <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.backgroundGrouped }]}>
    <View style={styles.content}><GlassCard title="Không có quyền truy cập / Access denied">
      <Text accessibilityRole="alert" style={[theme.typography.body, { color: theme.colors.textPrimary }]}>Chức năng này dành cho nhân viên thu mua và quản trị nhà máy.</Text>
      <GlassButton label="Về Trang chủ / Home" onPress={() => router.dismissTo('/home')} />
    </GlassCard></View>
  </SafeAreaView>;
  return <FarmerList key={scope} scope={scope} />;
}
function FarmerList({ scope }: { scope: string }) {
  const { client, user } = useAuth();
  const { theme } = useAppTheme();
  const { colors: c, typography: t } = theme;
  // The parent is keyed by request scope. Token rotation alone must not replace a pending action.
  const [owner] = useState(() => user!);
  const [locale, setLocale] = useState<'vi' | 'en'>('vi');
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<FarmerEditorTarget | null>(null);
  const service = useMemo(() => {
    const cache = createFarmerCache(AsyncStorage, farmerCacheKey(readApiConfiguration().origin, owner));
    return createFarmerService(client.api, owner, cache, () => client.getRequestScope() === scope);
  }, [client, scope, owner]);
  const load = useCallback((signal: AbortSignal) => service.list(search, signal), [service, search]);
  const resource = useApiResource(load);
  const actions = useMemo(() => createFarmerActions(service, randomUUID), [service]);
  const mutation = useSyncExternalStore(actions.subscribe, actions.getSnapshot, actions.getServerSnapshot);
  useEffect(() => () => actions.reset(), [actions]);
  const data = resource.status === 'success' ? resource.data : null;
  const loading = resource.status === 'idle' || resource.isLoading;
  const busy = mutation.status === 'saving';
  const open = (target: FarmerEditorTarget) => { actions.reset(); setEditor(target); };
  const close = () => { actions.reset(); setEditor(null); };
  const reload = () => { void resource.reload(); };
  const cached = data?.source === 'cache';
  const unknown = tr('Chưa ghi nhận', 'Not provided');
  const errorText = resource.error?.status === 403 ? tr('Bạn không có quyền xem nông hộ trong phạm vi này.', 'You do not have access to farmers in this scope.')
    : resource.error?.code === 'contract' ? tr('Dữ liệu nông hộ không đúng định dạng.', 'Unsupported farmer data.')
      : resource.error?.code === 'configuration' ? tr('Chưa cấu hình dịch vụ nông hộ.', 'The farmer service is not configured.')
        : tr('Không thể tải nông hộ và không có bản lưu phù hợp. Kiểm tra kết nối rồi thử lại.', 'Unable to load farmers or a matching saved list. Check your connection and retry.');
  return <SafeAreaView style={[styles.screen, { backgroundColor: c.backgroundGrouped }]}>
    <FlatList data={data?.items ?? []} keyExtractor={(item) => item.id} contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" refreshing={resource.isLoading}
      onRefresh={busy ? undefined : reload}
      ListHeaderComponent={<View style={styles.header}>
        <View style={styles.toolbar}>
          <GlassButton opaque variant="glass" label={tr('Về Trang chủ', 'Home')} onPress={() => router.dismissTo('/home')} />
          <GlassButton opaque variant="glass" label={locale === 'vi' ? 'English' : 'Tiếng Việt'} onPress={() => setLocale(locale === 'vi' ? 'en' : 'vi')} />
        </View>
        <Text accessibilityRole="header" style={[t.display, { color: c.textPrimary }]}>{tr('Nông hộ', 'Farmers')}</Text>
        <Text style={[t.body, { color: c.textSecondary }]}>{user?.organizationName || tr('Phạm vi tài khoản', 'Account scope')}</Text>
        <View style={styles.toolbar}>
          <GlassButton opaque label={tr('Thêm nông hộ', 'Add farmer')} disabled={cached || busy} onPress={() => open({ kind: 'create', farmer: null })} />
          <GlassButton opaque variant="glass" label={tr('Tải lại', 'Refresh')} loading={loading} loadingLabel={tr('Đang tải…', 'Loading…')} disabled={busy} onPress={reload} />
        </View>
        <GlassCard opaque>
          <GlassInput opaque label={tr('Tìm tên hoặc mã nông hộ', 'Search farmer name or code')} value={draft} onChangeText={setDraft}
            autoCorrect={false} returnKeyType="search" onSubmitEditing={() => setSearch(draft)} />
          <View style={styles.toolbar}>
            <GlassButton opaque variant="glass" label={tr('Tìm kiếm', 'Search')} onPress={() => setSearch(draft)} />
            <GlassButton opaque variant="glass" label={tr('Xóa tìm kiếm', 'Clear search')} onPress={() => { setDraft(''); setSearch(''); }} />
          </View>
        </GlassCard>
        {mutation.status === 'success' ? <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textPrimary }]}>{mutation.kind === 'delete'
          ? tr('Đã xóa hồ sơ nông hộ.', 'Farmer record deleted.') : tr('Đã lưu hồ sơ nông hộ.', 'Farmer record saved.')}</Text> : null}
        {cached ? <GlassCard opaque title={tr('Đang xem bản lưu trên thiết bị', 'Viewing a saved list')}>
          <Text style={[t.body, { color: c.textSecondary }]}>{tr('Không kết nối được máy chủ. Tìm kiếm chỉ trong trang đã lưu; có thể còn nông hộ chưa hiển thị. Kết nối lại để thêm, sửa hoặc xóa.', 'The server is unavailable. Search covers the saved page only; other farmers may exist. Reconnect to add, edit or delete.')}</Text>
          <Text style={[t.caption, { color: c.textSecondary }]}>{tr('Lưu lúc', 'Saved at')}: {new Date(data.updatedAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}</Text>
        </GlassCard> : null}
        {data?.cacheWarning || mutation.cacheWarning ? <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textSecondary }]}>{tr('Thao tác máy chủ đã hoàn tất nhưng chưa cập nhật được bản lưu trên thiết bị.', 'The server operation completed, but the saved list could not be updated.')}</Text> : null}
        {resource.status === 'error' ? <GlassCard title={tr('Không thể tải danh sách', 'Farmers unavailable')}>
          <Text accessibilityRole="alert" style={[t.body, { color: c.danger }]}>{errorText}</Text>
          <GlassButton opaque variant="glass" label={tr('Thử lại', 'Retry')} onPress={reload} />
        </GlassCard> : null}
        {data ? <Text accessibilityLiveRegion="polite" style={[t.caption, { color: c.textSecondary }]}>{tr('Đang hiển thị', 'Showing')} {data.items.length} {tr('nông hộ trên trang đã tải (tối đa 50). Đây không phải tổng toàn bộ nông hộ.', 'farmers on the loaded page (up to 50). This is not the full farmer count.')}</Text> : null}
      </View>}
      ListEmptyComponent={resource.status !== 'error' ? <GlassCard title={loading ? tr('Đang tải nông hộ…', 'Loading farmers…') : tr('Không có nông hộ phù hợp', 'No matching farmers')}>
        <Text style={[t.body, { color: c.textSecondary }]}>{loading ? tr('Vui lòng chờ.', 'Please wait.') : tr('Thử đổi tìm kiếm hoặc thêm nông hộ khi có kết nối.', 'Change the search or add a farmer when connected.')}</Text>
      </GlassCard> : undefined}
      renderItem={({ item }) => <GlassCard title={item.name} style={styles.row}>
        <Text selectable style={[t.body, { color: c.textPrimary }]}>{tr('Mã nông hộ', 'Farmer code')}: {item.code || unknown}</Text>
        <Text selectable style={[t.body, { color: c.textSecondary }]}>{tr('Liên hệ', 'Contact')}: {item.contact || unknown}</Text>
        <Text style={[t.body, { color: c.textSecondary }]}>{tr('Thửa ruộng liên kết', 'Linked plots')}: {item.totalPlots ?? unknown}</Text>
        <View style={styles.toolbar}>
          <GlassButton opaque variant="glass" label={tr('Chỉnh sửa', 'Edit')} accessibilityLabel={`${tr('Chỉnh sửa', 'Edit')} ${item.name}`}
            disabled={cached || busy} onPress={() => open({ kind: 'update', farmer: item })} />
          <GlassButton opaque variant="glass" label={tr('Xóa', 'Delete')} accessibilityLabel={`${tr('Xóa', 'Delete')} ${item.name}`}
            labelStyle={cached || busy ? undefined : { color: c.danger }} disabled={cached || busy} onPress={() => open({ kind: 'delete', farmer: item })} />
        </View>
      </GlassCard>} />
    {editor ? <FarmerEditor target={editor} actions={actions} state={mutation} locale={locale} onClose={close}
      onSaved={() => { setEditor(null); reload(); }} onReload={() => { close(); reload(); }} /> : null}
  </SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 20, width: '100%', maxWidth: 800, alignSelf: 'center' },
  header: { gap: 16, paddingBottom: 20 }, toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, row: { marginBottom: 12 } });
