import { randomUUID } from 'expo-crypto';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Decimal } from 'decimal.js';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { ComplianceField, ComplianceText, type Locale } from '../compliance/compliance-ui';
import { idSchema } from './api-common';
import { RequestSheet, ResourceFeedback, StructuredData, type FieldSpec } from './domain-ui';
import { textField } from './residue-forms';
import { assessmentPolicyInput, createSafetyPolicyService, mayPublishAssessmentPolicy, mayReadAssessmentPolicy, type AssessmentPolicy } from './safety-policy-api';
import { useDomainRefresh } from './use-domain-refresh';

export function AssessmentPolicyPanel({ locale }: { locale: Locale }) {
  const { client, user } = useAuth(); const scope = client.getRequestScope();
  return user && scope !== null ? <PolicyLookup key={scope} scope={scope} locale={locale} /> : null;
}
function PolicyLookup({ scope, locale }: { scope: string; locale: Locale }) {
  const { user, client } = useAuth(); const [owner] = useState(() => user!); const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [market, setMarket] = useState(''); const [commodity, setCommodity] = useState(''); const [at, setAt] = useState('');
  const [query, setQuery] = useState<{ market: string; commodity: string; at: string } | null>(null); const [publish, setPublish] = useState<AssessmentPolicy | 'new' | null>(null);
  const [notice, setNotice] = useState('');
  const service = useMemo(() => createSafetyPolicyService(client.api, owner, () => client.getRequestScope() === scope), [client, owner, scope]);
  const execute = useCallback((data: unknown, signal: AbortSignal) => service.publish(data, signal), [service]);
  const fields: FieldSpec[] = [textField('id', 'ID phiên bản mới', 'New version ID', { readonly: true }), textField('marketId', 'ID thị trường *', 'Market ID *'), textField('commodityId', 'ID loại hàng *', 'Commodity ID *'),
    textField('versionNo', 'Số phiên bản mới *', 'New version number *', { kind: 'number' }), textField('effectiveFrom', 'Hiệu lực từ (ISO, có múi giờ) *', 'Effective from (ISO with timezone) *'),
    textField('effectiveTo', 'Hiệu lực đến (không bắt buộc)', 'Effective until (optional)', { nullable: true }), textField('requiredSubstanceIds', 'ID hoạt chất bắt buộc *', 'Required substance IDs *', { kind: 'ids' }),
    textField('mrlMarginFraction', 'Biên MRL (tỷ lệ 0 ≤ biên < 1) *', 'MRL margin fraction (0 ≤ margin < 1) *', { hint: ['Ví dụ 0.2 tương ứng biên 20%. Tối đa 12 chữ số thập phân.', 'For example, 0.2 means a 20% margin. Up to 12 decimal places.'] }), textField('residueBasis', 'Cơ sở vật liệu so sánh *', 'Comparable material basis *'),
    { key: 'qualityRules', label: ['Quy tắc chất lượng', 'Quality rules'], kind: 'array', createRow: () => ({ attributeId: '', unit: '', calculation: 'MASS_WEIGHTED_MEAN' }), fields: [textField('attributeId', 'ID thuộc tính *', 'Attribute ID *'), textField('unit', 'Đơn vị *', 'Unit *'), textField('calculation', 'Phương pháp tính', 'Calculation', { readonly: true })] },
    textField('evidenceReference', 'Tham chiếu bằng chứng *', 'Evidence reference *'), textField('reviewedBy', 'Người thẩm định *', 'Reviewed by *'), textField('reviewAuthority', 'Cơ quan thẩm định *', 'Review authority *'), textField('reviewedAt', 'Thời điểm đã thẩm định (ISO) *', 'Completed review time (ISO) *')];
  const initial = publish && publish !== 'new' ? { ...publish, id: randomUUID(), versionNo: publish.versionNo + 1, reviewedAt: '', reviewedBy: '', reviewAuthority: '', evidenceReference: '' }
    : { id: randomUUID(), marketId: market.trim(), commodityId: commodity.trim(), versionNo: 1, effectiveFrom: new Date().toISOString(), effectiveTo: null, requiredSubstanceIds: [], mrlMarginFraction: '', residueBasis: '', qualityRules: [], evidenceReference: '', reviewedBy: '', reviewAuthority: '', reviewedAt: '' };
  return <View style={{ gap: 16 }}>
    <GlassCard opaque title={tr('Chính sách biên MRL trên máy chủ', 'Server MRL margin policy')}>
      <ComplianceText>{tr('Chính sách được lưu theo công ty, thị trường, loại hàng, phiên bản và khoảng hiệu lực. Công bố tạo phiên bản mới; máy chủ kiểm tra lịch sử, danh mục và quyền.', 'Policy is stored by company, market, commodity, version and effective period. Publishing appends a version; the server checks history, catalog references and authorization.')}</ComplianceText>
      {notice ? <ComplianceText>{notice}</ComplianceText> : null}
      {mayReadAssessmentPolicy(owner) ? <>
        <ComplianceField label={tr('ID thị trường', 'Market ID')} value={market} onChangeText={setMarket} />
        <ComplianceField label={tr('ID loại hàng', 'Commodity ID')} value={commodity} onChangeText={setCommodity} />
        <ComplianceField label={tr('Tra cứu tại thời điểm ISO (trống = hiện tại)', 'ISO lookup time (empty = current)')} value={at} onChangeText={setAt} />
        <GlassButton opaque variant="glass" label={tr('Tải chính sách áp dụng', 'Load applicable policy')} disabled={!idSchema.safeParse(market.trim()).success || !idSchema.safeParse(commodity.trim()).success}
          onPress={() => setQuery({ market: market.trim(), commodity: commodity.trim(), at: at.trim() })} />
      </> : <ComplianceText>{tr('Tài khoản này không có quyền đọc chính sách MRL của công ty. Mô phỏng minh họa vẫn dùng riêng ở bên dưới.', 'This account cannot read the company MRL policy. The separate demonstration remains available below.')}</ComplianceText>}
      {mayPublishAssessmentPolicy(owner) ? <GlassButton opaque label={tr('Công bố phiên bản chính sách', 'Publish policy version')} onPress={() => setPublish('new')} /> : null}
    </GlassCard>
    {query ? <ApplicablePolicy key={JSON.stringify(query)} query={query} service={service} locale={locale} canPublish={mayPublishAssessmentPolicy(owner)} onVersion={setPublish} /> : null}
    {publish ? <RequestSheet title={tr('Công bố chính sách biên MRL', 'Publish MRL margin policy')} fields={fields} initial={initial} schema={assessmentPolicyInput} execute={execute} locale={locale}
      onClose={() => setPublish(null)} onReload={() => { setPublish(null); setQuery(null); }} onSaved={() => { setNotice(tr('Máy chủ đã nhận phiên bản mới. Tra cứu đúng ngày hiệu lực để kiểm tra chính sách áp dụng.', 'The server accepted the new version. Look up the intended effective time to verify the applicable policy.')); setPublish(null); setQuery(null); }}>
      <ComplianceText>{tr('Không ghi đè lịch sử hoặc áp dụng dữ liệu mô phỏng. Nhập đầy đủ cơ sở vật liệu, hoạt chất, bằng chứng và thẩm định đã hoàn tất. Phiên bản tương lai chỉ có hiệu lực theo ngày đã công bố.', 'Do not overwrite history or apply demonstration constants. Provide material basis, substances, evidence and completed review. A future version applies only during its published effective period.')}</ComplianceText>
    </RequestSheet> : null}
  </View>;
}
function ApplicablePolicy({ query, service, locale, onVersion, canPublish }: { query: { market: string; commodity: string; at: string }; service: ReturnType<typeof createSafetyPolicyService>; locale: Locale; onVersion: (policy: AssessmentPolicy) => void; canPublish: boolean }) {
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const load = useCallback((signal: AbortSignal) => service.applicable(query.market, query.commodity, query.at || undefined, signal), [query, service]);
  const state = useApiResource(load);
  useDomainRefresh(state.reload);
  return <GlassCard opaque title={tr('Chính sách áp dụng được trả về', 'Returned applicable policy')}>
    {state.error?.status === 404 ? <ComplianceText>{tr('Không có chính sách áp dụng cho phạm vi/thời điểm này.', 'No applicable policy exists for this scope and time.')}</ComplianceText>
      : <ResourceFeedback loading={state.status === 'idle' || state.isLoading} error={state.error} onReload={() => { void state.reload(); }} tr={tr} />}
    {state.status === 'success' ? <><ComplianceText>{tr('Biên MRL', 'MRL margin')}: {new Decimal(state.data.mrlMarginFraction).times(100).toString()}%</ComplianceText>
      <StructuredData value={state.data} locale={locale} />{canPublish ? <GlassButton opaque variant="glass" label={tr('Tạo phiên bản kế tiếp', 'Create next version')} onPress={() => onVersion(state.data)} /> : null}</> : null}
  </GlassCard>;
}
