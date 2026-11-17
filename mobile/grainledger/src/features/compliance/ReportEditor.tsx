import { randomUUID } from 'expo-crypto';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { normalizeApiError } from '@/services/api/errors';
import type { LabReport } from './lab-reports-api';
import { createReportCommands, emptyResult, emptyResultSet, reportForm, reportFormErrors, reportKinds, resultKinds, saveReport, type Attachment, type ReportForm, type ResultForm, type ResultSetForm } from './report-commands';
import { validComplianceId } from './sample-commands';
import { pickReportAttachment } from './report-files';
import { ActionFailure, Check, ComplianceField, ComplianceSheet, ComplianceText, failureText, useComplianceAction, type Locale } from './compliance-ui';

export function ReportEditor({ report, relatedTo, scope, locale, onClose, onSaved, onReload }: { report: LabReport | null; relatedTo?: string; scope: string; locale: Locale;
  onClose: () => void; onSaved: (reportId?: string) => void; onReload: () => void }) {
  const { client, user } = useAuth();
  const [owner] = useState(() => user!);
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const execute = useMemo(() => createReportCommands(client.api, owner, () => client.getRequestScope() === scope), [client, owner, scope]);
  const { action, state, busy: saving } = useComplianceAction(execute);
  const [form, setForm] = useState(() => ({ ...reportForm(report), ...(relatedTo ? { relatedReportId: relatedTo, reportKind: 'AMENDMENT' } : {}) }));
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [picking, setPicking] = useState(false);
  const [fileError, setFileError] = useState('');
  const [attempted, setAttempted] = useState(false);
  const picker = useRef<AbortController | null>(null);
  useEffect(() => () => picker.current?.abort(), []);
  const busy = saving || picking;
  const errors = reportFormErrors(form);
  const field = (key: keyof Omit<ReportForm, 'companyOnlyConfirmed' | 'resultSets'>, vi: string, en: string, required = false) => <ComplianceField key={key}
    label={tr(vi, en)} value={form[key]} disabled={busy} onChangeText={(value) => setForm({ ...form, [key]: value })}
    error={attempted && required && errors[key as keyof typeof errors] ? tr('Nhập thông tin hợp lệ.', 'Enter a valid value.') : undefined} />;
  function updateSet(index: number, value: Partial<ResultSetForm>) {
    setForm({ ...form, resultSets: form.resultSets.map((set, i) => i === index ? { ...set, ...value } : set) });
  }
  async function pick() {
    if (busy) return;
    const controller = new AbortController(); picker.current = controller;
    setPicking(true); setFileError('');
    try { const file = await pickReportAttachment(controller.signal);
      if (file && !controller.signal.aborted && client.getRequestScope() === scope) setAttachment(file);
    } catch (error) { if (!controller.signal.aborted) setFileError(failureText(normalizeApiError(error), tr)); }
    finally { if (!controller.signal.aborted) setPicking(false); }
  }
  async function submit() {
    setAttempted(true);
    if (busy || Object.values(errors).some(Boolean) || (!report && !attachment)) return;
    const key = JSON.stringify([report?.id, form, attachment]);
    if (await action.submit(key, () => saveReport(form, report, attachment, randomUUID, () => new Date().toISOString()))) {
      const result = action.getSnapshot().result;
      const id = result && typeof result === 'object' && 'id' in result && typeof result.id === 'string' && validComplianceId(result.id) ? result.id : undefined;
      onSaved(id);
    }
  }
  const setLabels: [keyof Omit<ResultSetForm, 'entityId' | 'results'>, string, string][] = [
    ['sampleId', 'ID mẫu đã đăng ký (nếu có)', 'Registered sample ID (if known)'], ['laboratorySampleReference', 'Tham chiếu mẫu của lab', 'Laboratory sample reference'],
    ['statedSampleCode', 'Mã mẫu trên chứng thư', 'Sample code on certificate'], ['statedSealCode', 'Niêm chì trên chứng thư', 'Seal on certificate'],
    ['sectionReference', 'Trang / mục chứng thư', 'Certificate section reference'] ];
  const resultLabels: [keyof ResultForm, string, string][] = [ ['testLabel', 'Tên chỉ tiêu', 'Test label'], ['originalResultText', 'Kết quả nguyên văn', 'Original result text'],
    ['resultKind', 'Loại kết quả (theo chứng thư/API)', 'Result kind (certificate/API code)'], ['numericValue', 'Giá trị số', 'Numeric value'], ['unit', 'Đơn vị', 'Unit'],
    ['loq', 'LOQ', 'LOQ'], ['lod', 'LOD', 'LOD'], ['method', 'Phương pháp', 'Method'], ['uncertainty', 'Độ không đảm bảo đo', 'Uncertainty'],
    ['substanceId', 'ID hoạt chất (nếu có)', 'Substance ID (if known)'], ['reference', 'Tham chiếu', 'Reference'] ];
  return <ComplianceSheet title={report ? tr('Sửa báo cáo', 'Edit report') : tr('Nhập báo cáo lab', 'Enter lab report')} busy={busy} onClose={onClose} tr={tr}>
    <GlassCard opaque title={tr('Thông tin chứng thư', 'Certificate information')}>
      <ComplianceText>{tr('Nhập đúng thông tin từ chứng thư. Không tự sinh mã mẫu, niêm chì hoặc kết quả. Máy chủ quyết định tính hợp lệ và đánh giá MRL.', 'Transcribe the actual certificate. Sample codes, seals and results are not generated. The server validates and assesses MRL.')}</ComplianceText>
      {field('laboratoryName', 'Đơn vị thử nghiệm *', 'Laboratory *', true)}
      {field('reportNumber', 'Số hiệu báo cáo *', 'Report number *', true)}
      {field('issuedOn', 'Ngày cấp (YYYY-MM-DD) *', 'Issue date (YYYY-MM-DD) *', true)}
      <ComplianceText>{tr('Loại báo cáo *', 'Report kind *')}</ComplianceText>
      {reportKinds.map((reportKind) => <GlassButton opaque key={reportKind} label={reportKind} disabled={busy} variant={form.reportKind === reportKind ? 'primary' : 'glass'} accessibilityState={{ selected: form.reportKind === reportKind }} onPress={() => setForm({ ...form, reportKind })} />)}
      {field('statedStandard', 'Tiêu chuẩn ghi trên chứng thư', 'Stated standard')}
      {field('laboratoryConclusion', 'Kết luận của lab (nguyên văn / mã)', 'Laboratory conclusion (text / code)')}
      {field('relatedReportId', 'ID báo cáo liên quan (bắt buộc với bổ sung/sửa đổi/xét lại)', 'Related report ID (required for supplementary/amendment/retest)', true)}
      {field('relationshipReason', 'Lý do liên quan', 'Relationship reason', true)}
      <Check label={tr('Đã xác nhận báo cáo chỉ thuộc doanh nghiệp này', 'Confirmed this report belongs only to this company')} value={form.companyOnlyConfirmed}
        onChange={(companyOnlyConfirmed) => setForm({ ...form, companyOnlyConfirmed })} disabled={busy} />
      {attempted && errors.companyOnlyConfirmed ? <ComplianceText error>{tr('Cần xác nhận chứng thư chỉ chứa dữ liệu của công ty; tách hoặc che thông tin công ty khác trước khi tải lên.', 'Confirm the original contains only this company’s data; split or redact other-company information before upload.')}</ComplianceText> : null}
    </GlassCard>
    <GlassCard opaque title={tr('Tệp chứng thư', 'Certificate file')}>
      <ComplianceText>{attachment ? `${attachment.fileName} · ${attachment.size} bytes` : report?.fileName || tr('Chưa chọn tệp.', 'No file selected.')}</ComplianceText>
      <ComplianceText>{tr('Chứng thư gốc là bắt buộc khi tạo báo cáo. Chọn tệp không rỗng, tối đa 10 MiB.', 'An original certificate is required for a new report. Choose a nonempty file up to 10 MiB.')}</ComplianceText>
      {attempted && !report && !attachment ? <ComplianceText error>{tr('Chọn tệp chứng thư gốc.', 'Choose the original certificate.')}</ComplianceText> : null}
      {report && !attachment ? <ComplianceText>{tr('Không chọn tệp thay thế sẽ giữ chứng thư hiện tại. Cập nhật bản nháp tạo bản thay thế và giữ lịch sử cũ.', 'Without a replacement file, the current certificate is retained. Updating a draft creates a replacement and preserves its history.')}</ComplianceText> : null}
      <GlassButton opaque variant="glass" label={tr('Chọn / thay tệp', 'Choose / replace file')} loading={picking} disabled={saving} onPress={() => { void pick(); }} />
      {attachment ? <GlassButton opaque variant="glass" label={tr('Bỏ tệp vừa chọn', 'Clear selected file')} disabled={busy} onPress={() => setAttachment(null)} /> : null}
      {fileError ? <ComplianceText error>{fileError} {tr('Thử chọn lại tệp không rỗng, tối đa 10 MiB.', 'Choose a nonempty file up to 10 MiB.')}</ComplianceText> : null}
    </GlassCard>
    {form.resultSets.map((set, si) => <GlassCard opaque key={si} title={`${tr('Nhóm kết quả', 'Result set')} ${si + 1}`}>
      {setLabels.map(([key, vi, en]) => <ComplianceField key={key} label={tr(vi, en)} disabled={busy} value={set[key]} onChangeText={(value) => updateSet(si, { [key]: value })} />)}
      {set.results.map((result, ri) => <GlassCard opaque key={ri} title={`${tr('Chỉ tiêu', 'Test')} ${ri + 1}`}>
        {resultLabels.filter(([key]) => key !== 'resultKind').map(([key, vi, en]) => <ComplianceField key={key} label={tr(vi, en)} disabled={busy} value={result[key]}
          onChangeText={(value) => updateSet(si, { results: set.results.map((item, i) => i === ri ? { ...item, [key]: value } : item) })} />)}
        <ComplianceText>{tr('Loại kết quả *', 'Result kind *')}</ComplianceText>{resultKinds.map((resultKind) => <GlassButton opaque key={resultKind} label={resultKind} disabled={busy}
          variant={result.resultKind === resultKind ? 'primary' : 'glass'} accessibilityState={{ selected: result.resultKind === resultKind }} onPress={() => updateSet(si, { results: set.results.map((item, i) => i === ri ? { ...item, resultKind } : item) })} />)}
        <GlassButton opaque variant="glass" label={tr('Bỏ chỉ tiêu này khỏi bản nhập', 'Remove this test from the draft')} disabled={busy}
          onPress={() => updateSet(si, { results: set.results.filter((_, i) => i !== ri) })} />
      </GlassCard>)}
      <GlassButton opaque variant="glass" label={tr('Thêm chỉ tiêu', 'Add test')} disabled={busy} onPress={() => updateSet(si, { results: [...set.results, emptyResult()] })} />
      <GlassButton opaque variant="glass" label={tr('Bỏ nhóm này khỏi bản nhập', 'Remove this result set from the draft')} disabled={busy}
        onPress={() => setForm({ ...form, resultSets: form.resultSets.filter((_, i) => i !== si) })} />
    </GlassCard>)}
    <GlassButton opaque variant="glass" label={tr('Thêm nhóm kết quả', 'Add result set')} disabled={busy} onPress={() => setForm({ ...form, resultSets: [...form.resultSets, emptyResultSet()] })} />
    <ActionFailure error={state.error} tr={tr} onReload={onReload} />
    {attempted && errors.resultSets ? <ComplianceText error>{tr('Cần 1–1000 nhóm, ít nhất một chỉ tiêu mỗi nhóm (tổng tối đa 10000). Nhập tên, nguyên văn và loại kết quả; NUMERIC/BELOW_LIMIT cần giá trị số không âm, dùng dấu chấm thập phân.', 'Provide 1–1000 sets with at least one test each (up to 10000 total). Enter label, original text and kind; NUMERIC/BELOW_LIMIT require nonnegative exact decimal values with a decimal point.')}</ComplianceText> : null}
    <GlassButton opaque label={tr('Lưu báo cáo', 'Save report')} loading={saving} disabled={picking} loadingLabel={tr('Đang lưu…', 'Saving…')} onPress={() => { void submit(); }} />
  </ComplianceSheet>;
}
