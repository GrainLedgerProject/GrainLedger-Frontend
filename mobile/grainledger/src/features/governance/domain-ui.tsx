import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { z } from 'zod';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { normalizeApiError, type ApiError } from '@/services/api/errors';
import { Check, ComplianceField, ComplianceSheet, ComplianceText, failureText, formStyles, useComplianceAction, type Locale, type Translate } from '../compliance/compliance-ui';
import { detailLabel, detailValue, structuredDetails } from './event-presentation';
import { normalizeReviewedForm } from './residue-forms';

export function StructuredData({ value, locale = 'vi', depth = 0 }: { value: unknown; locale?: Locale; depth?: number }) {
  const [shown, setShown] = useState(30);
  const data = depth === 0 ? structuredDetails(value) : value;
  if (depth >= 6) return <ComplianceText>{JSON.stringify(data, null, 2)}</ComplianceText>;
  if (Array.isArray(data)) return <View style={{ gap: 12 }}>
    {!data.length ? <ComplianceText>{locale === 'vi' ? 'Không có mục nào.' : 'No items.'}</ComplianceText> : null}
    {data.slice(0, shown).map((item, index) => <GlassCard opaque key={index} title={`${locale === 'vi' ? 'Mục' : 'Item'} ${index + 1}`}><StructuredData value={item} locale={locale} depth={depth + 1} /></GlassCard>)}
    {data.length > shown ? <GlassButton opaque variant="glass" label={locale === 'vi' ? 'Xem thêm mục' : 'Show more items'} onPress={() => setShown(shown + 30)} /> : null}
  </View>;
  if (data !== null && typeof data === 'object') return <View style={{ gap: 12 }}>{Object.entries(data).map(([key, item]) => <View key={key} style={{ gap: 4 }}>
    <ComplianceText>{domainLabels[key]?.[locale === 'vi' ? 0 : 1] ?? detailLabel(key, locale)}</ComplianceText>
    {item !== null && typeof item === 'object' ? <StructuredData value={item} locale={locale} depth={depth + 1} /> : <ComplianceText>{detailValue(key, item, locale)}</ComplianceText>}
  </View>)}</View>;
  return <ComplianceText>{detailValue('', data, locale)}</ComplianceText>;
}
export const domainLabels: Record<string, [string, string]> = {
  residueDefinition: ['Định nghĩa dư lượng', 'Residue definition'], analyticalMethod: ['Phương pháp xét nghiệm', 'Analytical method'], laboratory: ['Phương pháp lab', 'Laboratory methods'],
  factorLower: ['Hệ số dưới', 'Lower factor'], factorUpper: ['Hệ số trên', 'Upper factor'], factorSemantics: ['Ý nghĩa hệ số', 'Factor semantics'],
  homogeneousMixing: ['Trộn đồng nhất', 'Homogeneous mixing'], anchorStage: ['Giai đoạn mốc', 'Anchor stage'], inputStage: ['Giai đoạn đầu vào', 'Input stage'], outputStage: ['Giai đoạn đầu ra', 'Output stage'],
  outputFraction: ['Phân đoạn đầu ra', 'Output fraction'], conditions: ['Điều kiện đã thẩm định', 'Reviewed conditions'], reviewedBy: ['Người thẩm định', 'Reviewed by'],
  reviewAuthority: ['Cơ quan thẩm định', 'Review authority'], reviewedAt: ['Ngày thẩm định', 'Reviewed at'], publishedBy: ['Người công bố', 'Published by'], publishedAt: ['Ngày công bố', 'Published at'],
  retirement: ['Ngừng sử dụng toàn bộ chuỗi phiên bản', 'Entire profile series retirement'], asReceivedConfirmed: ['Xác nhận trạng thái tiếp nhận', 'As-received confirmation'],
  numericInterpretationKind: ['Cách diễn giải kết quả số', 'Numeric interpretation'], relativeUncertaintyPercent: ['Độ không đảm bảo tương đối (%)', 'Relative uncertainty (%)'],
  relativeUncertaintyAtZero: ['Áp dụng độ không đảm bảo tại 0', 'Uncertainty at zero'], belowLimit: ['Cho phép kết quả dưới giới hạn', 'Below-limit interpretation'], ndThresholdKind: ['Ngưỡng không phát hiện', 'Non-detect threshold'],
  applicabilityStatement: ['Phạm vi áp dụng đã thẩm định', 'Reviewed applicability'], mrlMarginFraction: ['Biên MRL (tỷ lệ 0–1)', 'MRL margin fraction (0–1)'],
  requiredSubstanceIds: ['Các hoạt chất bắt buộc', 'Required substances'], residueBasis: ['Cơ sở vật liệu so sánh', 'Comparable material basis'], qualityRules: ['Quy tắc chất lượng', 'Quality rules'],
  decisionVersion: ['Phiên bản quyết định', 'Decision version'], freshness: ['Hiệu lực đề xuất', 'Proposal freshness'], freshnessReasons: ['Lý do hiệu lực', 'Freshness reasons'],
  stockAndEvidenceCurrent: ['Tồn và bằng chứng còn hiệu lực', 'Stock and evidence current'], stockReserved: ['Đã giữ tồn', 'Stock reserved'], reservation: ['Giữ tồn', 'Reservation'],
  reasons: ['Lý do / trở ngại', 'Reasons / blockers'], rawUncertainty: ['Độ không đảm bảo nguyên văn', 'Raw uncertainty'], conflictingResults: ['Kết quả mâu thuẫn', 'Conflicting results'],
  existingSelections: ['Lựa chọn đã tồn tại', 'Existing selections'], previewFingerprint: ['Dấu đối chiếu bản xem trước', 'Preview fingerprint'],
  profile: ['Hồ sơ áp dụng', 'Applicable profile'], setting: ['Chính sách áp dụng', 'Applicable setting'], assessment: ['Đánh giá máy chủ', 'Server assessment'],
  sourceIds: ['Nguồn Capture (không phải lô Ledger)', 'Capture sources (not Ledger lots)'], profileBindings: ['Liên kết hồ sơ từng nguồn', 'Source profile bindings'],
};
export function PageControls({ page, hasMore, busy, onChange, tr }: { page: number; hasMore: boolean; busy: boolean; onChange: (page: number) => void; tr: Translate }) {
  return <View style={formStyles.row}><GlassButton opaque variant="glass" label={tr('Trang trước', 'Previous page')} disabled={page <= 1 || busy} onPress={() => onChange(page - 1)} />
    <ComplianceText>{tr('Trang', 'Page')} {page}</ComplianceText><GlassButton opaque variant="glass" label={tr('Trang sau', 'Next page')} disabled={!hasMore || busy} onPress={() => onChange(page + 1)} /></View>;
}
export function ResourceFeedback({ loading, error, onReload, tr }: { loading: boolean; error: ApiError | null; onReload: () => void; tr: Translate }) {
  return <>{loading ? <ComplianceText>{tr('Đang tải…', 'Loading…')}</ComplianceText> : null}{error ? <GlassCard opaque><ComplianceText error>{failureText(error, tr)}</ComplianceText>
    <GlassButton opaque variant="glass" label={tr('Thử tải lại', 'Retry loading')} onPress={onReload} /></GlassCard> : null}</>;
}
export interface FieldSpec { key: string; label: [string, string]; kind?: 'text' | 'number' | 'bool' | 'ids' | 'array' | 'select'; nullable?: boolean;
  readonly?: boolean; multiline?: boolean; options?: string[]; fields?: FieldSpec[]; createRow?: () => Record<string, unknown>; hint?: [string, string] }
function Fields({ specs, value, onChange, errors, path = '', busy, locale }: { specs: FieldSpec[]; value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void;
  errors: Record<string, string>; path?: string; busy: boolean; locale: Locale }) {
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  return <View style={{ gap: 16 }}>{specs.map((field) => {
    const label = field.label[locale === 'vi' ? 0 : 1]; const key = path + field.key;
    const set = (next: unknown) => onChange({ ...value, [field.key]: next });
    if (field.readonly) return <ComplianceText key={field.key}>{label}: {String(value[field.key] ?? '')}</ComplianceText>;
    if (field.kind === 'bool') return <View key={field.key}><Check label={label} value={value[field.key] === true} onChange={set} disabled={busy} />{errors[key] ? <ComplianceText error>{errors[key]}</ComplianceText> : null}</View>;
    if (field.kind === 'select') return <View key={field.key} style={{ gap: 8 }}><ComplianceText>{label}</ComplianceText><View style={formStyles.row}>
      {(field.nullable ? ['', ...(field.options ?? [])] : field.options ?? []).map((option) => <GlassButton opaque key={option} label={option || tr('Không áp dụng', 'Not applicable')}
        variant={(value[field.key] ?? '') === option ? 'primary' : 'glass'} accessibilityState={{ selected: (value[field.key] ?? '') === option }} disabled={busy} onPress={() => set(option || null)} />)}
    </View>{errors[key] ? <ComplianceText error>{errors[key]}</ComplianceText> : null}</View>;
    if (field.kind === 'array') {
      const rows = value[field.key] as Record<string, unknown>[] ?? [];
      return <GlassCard opaque key={field.key} title={label}>
        {rows.map((row, index) => <GlassCard opaque key={index} title={`${tr('Mục', 'Item')} ${index + 1}`}>
          <Fields specs={field.fields ?? []} value={row} onChange={(next) => set(rows.map((item, i) => i === index ? next : item))} errors={errors} path={`${key}.${index}.`} busy={busy} locale={locale} />
          <GlassButton opaque variant="glass" label={tr('Bỏ mục khỏi bản nhập', 'Remove item from draft')} disabled={busy} onPress={() => set(rows.filter((_, i) => i !== index))} />
        </GlassCard>)}
        <GlassButton opaque variant="glass" label={tr('Thêm mục', 'Add item')} disabled={busy} onPress={() => set([...rows, field.createRow?.() ?? {}])} />
        {errors[key] ? <ComplianceText error>{errors[key]}</ComplianceText> : null}
      </GlassCard>;
    }
    const input = value[field.key];
    return <ComplianceField key={field.key} label={label} value={Array.isArray(input) ? input.join('\n') : String(input ?? '')} disabled={busy}
      multiline={field.multiline || field.kind === 'ids'} keyboardType={field.kind === 'number' ? 'number-pad' : 'default'} error={errors[key]}
      helperText={field.hint?.[locale === 'vi' ? 0 : 1] ?? (field.kind === 'ids' ? tr('Mỗi ID một dòng hoặc cách nhau bằng dấu phẩy.', 'One ID per line or separated by commas.') : undefined)} onChangeText={set} />;
  })}</View>;
}
export function RequestSheet({ title, fields, initial, schema, execute, locale, onClose, onSaved, onReload, children, preview, submitLabel, buildCommand }: {
  title: string; fields: FieldSpec[]; initial: Record<string, unknown>; schema: z.ZodType; execute: (data: unknown, signal: AbortSignal) => Promise<unknown>; locale: Locale;
  onClose: () => void; onSaved: () => void; onReload: () => void; children?: ReactNode; submitLabel?: string;
  buildCommand?: (data: unknown) => unknown;
  preview?: { run: (data: unknown, signal: AbortSignal) => Promise<unknown>; prepare?: (data: unknown, result: unknown) => unknown; canSubmit?: (result: unknown) => boolean };
}) {
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewState, setPreviewState] = useState<{ key: string; value: unknown } | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const abort = useRef<AbortController | null>(null);
  const { action, state, busy: saving } = useComplianceAction(execute);
  useEffect(() => () => abort.current?.abort(), []);
  const busy = saving || previewBusy;
  function parsed() {
    const result = schema.safeParse(normalizeReviewedForm(fields, form));
    if (!result.success) { setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), tr('Kiểm tra thông tin bắt buộc, ID, số và thời gian (ISO có múi giờ).', 'Check required fields, IDs, numbers and ISO dates with timezone.')] ))); return null; }
    setErrors({}); return result.data;
  }
  async function prepare() {
    if (busy || !preview) return; const data = parsed(); if (data === null) return;
    const controller = new AbortController(); abort.current = controller; setPreviewBusy(true); setPreviewError(''); setPreviewState(null);
    try { const result = await preview.run(data, controller.signal); if (!controller.signal.aborted) setPreviewState({ key: JSON.stringify(data), value: result }); }
    catch (error) { if (!controller.signal.aborted) setPreviewError(failureText(normalizeApiError(error), tr)); }
    finally { if (!controller.signal.aborted) setPreviewBusy(false); }
  }
  async function save() {
    if (busy) return; const data = parsed(); if (data === null) return;
    const key = JSON.stringify(data);
    if (preview && (!previewState || previewState.key !== key || preview.canSubmit?.(previewState.value) === false)) return;
    let body: unknown = data;
    try { if (preview?.prepare && previewState) body = preview.prepare(data, previewState.value); }
    catch (error) { setPreviewError(failureText(normalizeApiError(error), tr)); return; }
    if (await action.submit(JSON.stringify(body), () => buildCommand ? buildCommand(body) : body)) onSaved();
  }
  return <ComplianceSheet title={title} busy={busy} onClose={onClose} tr={tr}>
    {children}
    <Fields specs={fields} value={form} errors={errors} locale={locale} busy={busy} onChange={(next) => { setForm(next); setPreviewState(null); setPreviewError(''); }} />
    {Object.keys(errors).length ? <ComplianceText error>{tr('Kiểm tra các trường được đánh dấu trước khi gửi.', 'Review the marked fields before submitting.')}</ComplianceText> : null}
    {preview ? <GlassButton opaque variant="glass" label={tr('Xem trước từ máy chủ', 'Preview on server')} loading={previewBusy} disabled={saving} onPress={() => { void prepare(); }} /> : null}
    {previewState ? <GlassCard opaque title={tr('Kết quả xem trước', 'Preview result')}><StructuredData value={previewState.value} locale={locale} /></GlassCard> : null}
    {previewError ? <ComplianceText error>{previewError}</ComplianceText> : null}
    {state.error ? <><ComplianceText error>{failureText(state.error, tr, true)}</ComplianceText><GlassButton opaque variant="glass" label={tr('Đóng và tải lại', 'Close and reload')} disabled={busy} onPress={onReload} /></> : null}
    <GlassButton opaque label={submitLabel ?? tr('Gửi lên máy chủ', 'Submit to server')} loading={saving} disabled={previewBusy || Boolean(preview && (!previewState || preview.canSubmit?.(previewState.value) === false))}
      loadingLabel={tr('Đang gửi…', 'Submitting…')} onPress={() => { void save(); }} />
  </ComplianceSheet>;
}
