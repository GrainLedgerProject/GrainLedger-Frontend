import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { api } from '../../services/api';
import type { AdminUserDto, OrganizationDto } from '../../services/endpoints/admin';
import { buildAccessUpdate, isAdminUser, isOrganization, parseManagementList, requireResult } from '../../services/management';
import { ROLE_DEFINITIONS } from '../../types/roles';
import { spacing } from '../../theme';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { InputField } from '../common/InputField';
import { AppText } from '../ui/AppText';
import { ChoiceField } from '../ui/ChoiceField';
import { EmptyState, LoadingState } from '../ui/States';

export function AdminPanel() {
  const [expanded, setExpanded] = useState(false);
  const [section, setSection] = useState<'organizations' | 'users'>('organizations');
  const [organizations, setOrganizations] = useState<OrganizationDto[]>([]);
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('Customer');
  const [selected, setSelected] = useState<AdminUserDto | null>(null);
  const [role, setRole] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const lock = useRef(false);
  const disabled = busy || loading;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orgResult, userResult] = await Promise.all([api.admin.getOrganizations(), api.admin.getUsers()]);
      const orgs = parseManagementList(requireResult(orgResult), isOrganization);
      const people = parseManagementList(requireResult(userResult), isAdminUser);
      setOrganizations(orgs);
      setUsers(people);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu quản trị.');
    } finally { setLoading(false); }
  };

  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try { await action(); }
    catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Không thể lưu thay đổi.'); }
    finally { lock.current = false; setBusy(false); }
  };

  const saveAccess = () => { void run(async () => {
    if (!selected) return;
    const update = buildAccessUpdate(selected, role, organizationId, isActive);
    requireResult(await api.admin.updateUserAccess(selected.id, update.etag, update.request));
    setSelected(null);
    setNotice('Đã cập nhật quyền truy cập.');
    await load();
  }); };

  const search = query.trim().toLocaleLowerCase('vi');
  const matchingUsers = users.filter((user) => [user.email, user.displayName ?? '', user.organizationName ?? ''].some((value) => value.toLocaleLowerCase('vi').includes(search)));
  const matchingOrganizations = organizations.filter((org) => org.name.toLocaleLowerCase('vi').includes(search));

  return (
    <Card style={styles.card}>
      <View style={styles.stack}>
        <AppText variant="title3" accessibilityRole="header">Quản trị tổ chức & tài khoản</AppText>
        <Button title={expanded ? 'Thu gọn quản trị' : 'Mở quản trị'} variant="secondary" disabled={disabled} onPress={() => {
          setExpanded((value) => !value);
          if (!expanded) void load();
        }} />
        {expanded ? <>
          <ChoiceField label="Nhóm quản trị" value={section} disabled={disabled} options={[{ value: 'organizations', label: 'Tổ chức' }, { value: 'users', label: 'Tài khoản' }]} onChange={(value) => {
            setSection(value === 'users' ? 'users' : 'organizations'); setSelected(null); setCreating(false); setQuery(''); setLimit(10);
          }} />
          <Button title="Tải lại dữ liệu quản trị" size="small" variant="secondary" disabled={disabled} onPress={() => { setSelected(null); void load(); }} />
          {notice ? <AppText variant="subheadline" color="success" accessibilityLiveRegion="polite">{notice}</AppText> : null}
          {error ? <AppText color="destructive" accessibilityRole="alert">{error}</AppText> : null}
          {loading ? <LoadingState label="Đang tải dữ liệu quản trị" /> : <>
            <InputField label={section === 'users' ? 'Tìm tài khoản hoặc tổ chức' : 'Tìm tên tổ chức'} value={query} editable={!busy} onChangeText={(value) => { setQuery(value); setLimit(10); }} />
            {section === 'organizations' ? <>
              {creating ? <View style={styles.stack}>
                <InputField label="Tên tổ chức" value={name} onChangeText={setName} editable={!busy} required />
                <ChoiceField label="Loại tổ chức" value={kind} onChange={setKind} disabled={busy} options={[{ value: 'Customer', label: 'Khách hàng' }, { value: 'Mill', label: 'Nhà máy' }]} />
                <Button title="Tạo tổ chức" loading={busy} disabled={!name.trim()} onPress={() => { void run(async () => {
                  if (!name.trim()) throw new Error('Vui lòng nhập tên tổ chức.');
                  requireResult(await api.admin.createOrganization({ name: name.trim(), kind: kind === 'Mill' ? 'Mill' : 'Customer' }));
                  setName(''); setCreating(false); setNotice('Đã tạo tổ chức.'); await load();
                }); }} />
                <Button title="Hủy tạo tổ chức" variant="outline" disabled={busy} onPress={() => setCreating(false)} />
              </View> : <Button title="Thêm tổ chức" onPress={() => setCreating(true)} disabled={busy} />}
              {!error && matchingOrganizations.length === 0 ? <EmptyState title="Không có tổ chức phù hợp" /> : null}
              {matchingOrganizations.slice(0, limit).map((org) => <View key={org.id} style={styles.item}>
                <AppText variant="headline">{org.name}</AppText><AppText variant="footnote" color="secondaryLabel">{org.kind === 'Mill' ? 'Nhà máy' : 'Khách hàng'}</AppText>
              </View>)}
              {matchingOrganizations.length > limit ? <Button title="Xem thêm tổ chức" variant="secondary" disabled={busy} onPress={() => setLimit((value) => value + 10)} /> : null}
            </> : selected ? <View style={styles.stack}>
              <AppText variant="headline">{selected.displayName || selected.email}</AppText>
              <AppText variant="footnote" color="secondaryLabel">{selected.email}</AppText>
              <ChoiceField label="Vai trò" value={role} onChange={setRole} disabled={busy} options={[{ value: '', label: 'Chưa gán vai trò' }, ...Object.entries(ROLE_DEFINITIONS).map(([value, meta]) => ({ value, label: meta.labelVi }))]} />
              <ChoiceField label="Tổ chức" value={organizationId} onChange={setOrganizationId} disabled={busy} options={[{ value: '', label: 'Chưa gán tổ chức' }, ...organizations.map((org) => ({ value: org.id, label: org.name }))]} />
              <ChoiceField label="Trạng thái tài khoản" value={isActive ? 'active' : 'inactive'} onChange={(value) => setIsActive(value === 'active')} disabled={busy} options={[{ value: 'active', label: 'Hoạt động' }, { value: 'inactive', label: 'Tạm ngừng' }]} />
              {!selected.etag ? <AppText color="secondaryLabel">Hồ sơ chưa có phiên bản cập nhật. Hãy tải lại danh sách trước khi lưu.</AppText> : null}
              <Button title="Lưu quyền truy cập" loading={busy} disabled={!selected.etag} onPress={() => Alert.alert('Cập nhật quyền truy cập?', `Thay đổi sẽ áp dụng cho ${selected.email}.`, [{ text: 'Trở lại', style: 'cancel' }, { text: 'Lưu thay đổi', onPress: saveAccess }])} />
              <Button title="Đóng chỉnh sửa" variant="outline" disabled={busy} onPress={() => setSelected(null)} />
            </View> : <>
              {!error && matchingUsers.length === 0 ? <EmptyState title="Không có tài khoản phù hợp" /> : null}
              {matchingUsers.slice(0, limit).map((user) => <View key={user.id} style={styles.item}>
                <AppText variant="headline">{user.displayName || user.email}</AppText>
                <AppText variant="footnote" color="secondaryLabel">{user.email} · {user.isActive ? 'Hoạt động' : 'Tạm ngừng'}</AppText>
                <AppText variant="footnote" color="secondaryLabel">{user.organizationName || 'Chưa gán tổ chức'}</AppText>
                <Button title={`Chỉnh quyền: ${user.displayName || user.email}`} variant="secondary" size="small" disabled={busy} onPress={() => { setSelected(user); setRole(user.role || ''); setOrganizationId(user.organizationId || ''); setIsActive(user.isActive); setError(null); }} />
              </View>)}
              {matchingUsers.length > limit ? <Button title="Xem thêm tài khoản" variant="secondary" disabled={busy} onPress={() => setLimit((value) => value + 10)} /> : null}
            </>}
          </>}
        </> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({ card: { marginBottom: spacing.lg }, stack: { gap: spacing.md }, item: { gap: spacing.sm, paddingVertical: spacing.md } });
