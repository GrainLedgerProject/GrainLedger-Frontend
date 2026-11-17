import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { useAppTheme } from '@/theme/ThemeProvider';
import { normalizeApiError } from '@/services/api/errors';
import { canViewLabSamples, sampleDate } from './lab-samples-api';
import { createLabReportService, isReportConfirmed } from './lab-reports-api';
import { validComplianceId } from './sample-commands';
import { attachmentLimit, canWriteReports, isReportMutable } from './report-commands';
import { createReportPreview } from './report-files';
import { ComplianceDenied } from './LabReportsScreen';
import { ComplianceText, failureText, formStyles } from './compliance-ui';
import { ReportEditor } from './ReportEditor';
import { ReportActionSheet } from './ReportActionSheet';
import { createResidueService } from '../governance/residue-api';
import { ReportReviewSheet } from '../governance/ResidueScreen';
import { permission } from '../governance/api-common';

export function LabReportDetailScreen({ id }: { id: string | string[] | undefined }) {
  const { client, user } = useAuth();
  const scope = client.getRequestScope();
  if (!user || scope === null) return null;
  if (!canViewLabSamples(user)) return <ComplianceDenied />;
  if (typeof id !== 'string' || !validComplianceId(id)) return <InvalidReportReference />;
  return <ReportDetail key={`${scope}:${id}`} id={id} scope={scope} />;
}
function InvalidReportReference() {
  const { theme } = useAppTheme();
  return <SafeAreaView style={[formStyles.screen, { backgroundColor: theme.colors.backgroundGrouped }]}><View style={formStyles.content}>
    <ComplianceText error>ID báo cáo không hợp lệ / Invalid report identifier</ComplianceText>
    <GlassButton opaque variant="glass" label="Danh sách báo cáo / Reports" onPress={() => router.dismissTo('/compliance/lab-results')} />
  </View></SafeAreaView>;
}
function ReportDetail({ id, scope }: { id: string; scope: string }) {
  const { client, user } = useAuth();
  const { theme } = useAppTheme();
  const [owner] = useState(() => user!);
  const [locale, setLocale] = useState<'vi' | 'en'>('vi');
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const unknown = tr('Chưa cung cấp', 'Not provided');
  const service = useMemo(() => createLabReportService(client.api, owner, () => client.getRequestScope() === scope), [client, owner, scope]);
  const load = useCallback((signal: AbortSignal) => service.detail(id, signal), [id, service]);
  const state = useApiResource(load);
  const report = state.status === 'success' ? state.data : null;
  const [sheet, setSheet] = useState<'edit' | 'append' | 'confirm' | 'delete' | 'residue' | null>(null);
  const residueService = useMemo(() => createResidueService(client.api, owner, () => client.getRequestScope() === scope), [client, owner, scope]);
  const [success, setSuccess] = useState('');
  const [deleted, setDeleted] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileAbort = useRef<AbortController | null>(null);
  const preview = useRef<ReturnType<typeof createReportPreview> | null>(null);
  useEffect(() => { const current = createReportPreview(); preview.current = current;
    return () => { fileAbort.current?.abort(); current.dispose(); }; }, []);
  const reload = () => { setSheet(null); void state.reload(); };
  async function openFile() {
    if (!report || fileAbort.current) return;
    if (report.fileSize > attachmentLimit) { setFileError(tr('Tệp vượt giới hạn xem 10 MiB của ứng dụng.', 'This file exceeds the app’s 10 MiB preview limit.')); return; }
    const abort = new AbortController(); fileAbort.current = abort;
    setFileBusy(true); setFileError('');
    try {
      const blob = await service.file(report.id, abort.signal);
      if (client.getRequestScope() === scope && !abort.signal.aborted) await preview.current?.open(blob, report.fileName, report.contentType, abort.signal);
    } catch (error) { if (!abort.signal.aborted) setFileError(failureText(normalizeApiError(error), tr)); }
    finally { if (!abort.signal.aborted) setFileBusy(false); fileAbort.current = null; }
  }
  const results = report && !deleted ? report.resultSets.flatMap((set, setIndex) => set.results.map((result) => ({ set, setIndex, result }))) : [];
  return <SafeAreaView style={[formStyles.screen, { backgroundColor: theme.colors.backgroundGrouped }]}>
    <FlatList data={results} keyExtractor={(item) => item.result.id} contentContainerStyle={formStyles.content}
      refreshing={state.isLoading} onRefresh={() => { if (!deleted) void state.reload(); }}
      ListHeaderComponent={<View style={{ gap: 16 }}>
        <View style={formStyles.row}><GlassButton opaque variant="glass" label={tr('Danh sách báo cáo', 'Reports')} onPress={() => router.dismissTo('/compliance/lab-results')} />
          <GlassButton opaque variant="glass" label={locale === 'vi' ? 'English' : 'Tiếng Việt'} onPress={() => setLocale(locale === 'vi' ? 'en' : 'vi')} /></View>
        <ComplianceText heading>{tr('Chi tiết báo cáo', 'Report detail')}</ComplianceText>
        {success ? <ComplianceText>{success}</ComplianceText> : null}
        {!deleted && (state.isLoading || state.status === 'idle') ? <ComplianceText>{tr('Đang tải…', 'Loading…')}</ComplianceText> : null}
        {!deleted && state.error ? <GlassCard opaque><ComplianceText error>{failureText(state.error, tr)}</ComplianceText>
          <GlassButton opaque variant="glass" label={tr('Thử tải lại', 'Retry loading')} onPress={reload} /></GlassCard> : null}
        {report && !deleted ? <>
          <GlassCard opaque title={report.reportNumber || report.id}>
            <ComplianceText>ID: {report.id}</ComplianceText><ComplianceText>{tr('Lab', 'Laboratory')}: {report.laboratoryName}</ComplianceText>
            <ComplianceText>{tr('Ngày cấp', 'Issued')}: {report.issuedOn} · {tr('Loại', 'Kind')}: {report.reportKind}</ComplianceText>
            <ComplianceText>{tr('Tiếp nhận', 'Received')}: {sampleDate(report.receivedAt, locale)}</ComplianceText>
            <ComplianceText>{tr('Tiêu chuẩn trên chứng thư', 'Stated standard')}: {report.statedStandard || unknown}</ComplianceText>
            <ComplianceText>{tr('Kết luận lab', 'Lab conclusion')}: {report.laboratoryConclusion || unknown}</ComplianceText>
            <ComplianceText>{tr('Trạng thái báo cáo', 'Report status')}: {report.status}</ComplianceText>
            <ComplianceText>{tr('Người ghi / lúc ghi', 'Recorded by / at')}: {report.recordedBy} · {sampleDate(report.recordedAt, locale)}</ComplianceText>
            <ComplianceText>{tr('Thời điểm khai báo', 'Captured')}: {sampleDate(report.capturedAt, locale)}</ComplianceText>
            <ComplianceText>{tr('Xác nhận bởi / lúc', 'Confirmed by / at')}: {report.confirmedBy || unknown} · {report.confirmedAt ? sampleDate(report.confirmedAt, locale) : unknown}</ComplianceText>
            <GlassButton opaque variant="glass" label={tr('Tải lại báo cáo', 'Refresh report')} onPress={reload} />
          </GlassCard>
          <GlassCard opaque title={tr('Đánh giá MRL từ máy chủ', 'Server MRL assessment')}>
            <ComplianceText>{report.assessmentStatus || unknown} · {tr('Thị trường gợi ý', 'Suggested market')}: {report.suggestedMarketCode || unknown}</ComplianceText>
            {report.assessmentReasons.length ? report.assessmentReasons.map((reason, index) => <ComplianceText key={index}>{reason}</ComplianceText>) : <ComplianceText>{tr('Không có lý do được cung cấp.', 'No reasons supplied.')}</ComplianceText>}
            <ComplianceText>{tr('Ứng dụng hiển thị đánh giá được trả về, không tự tính ngưỡng luật hay cho phép xuất hàng.', 'The app displays the returned assessment; it does not calculate legal limits or authorize shipments.')}</ComplianceText>
          </GlassCard>
          <GlassCard opaque title={tr('Chứng thư gốc', 'Original certificate')}>
            <ComplianceText>{report.fileName || unknown} · {report.contentType || unknown} · {report.fileSize} bytes</ComplianceText>
            <ComplianceText>SHA-256 (API): {report.sha256 || unknown}</ComplianceText>
            {report.fileName ? <GlassButton opaque variant="glass" label={tr('Tải và xem tệp', 'Download and view file')} loading={fileBusy} onPress={() => { void openFile(); }} /> : null}
            {fileError ? <ComplianceText error>{fileError}</ComplianceText> : null}
          </GlassCard>
          {report.resultSets.map((set, index) => <GlassCard opaque key={set.id} title={`${tr('Nhóm mẫu', 'Sample set')} ${index + 1}`}>
            <ComplianceText>ID: {set.id} · {tr('Đồng nhất mẫu', 'Identity')}: {set.identityStatus}</ComplianceText>
            <ComplianceText>{tr('ID mẫu / mẫu đã xác nhận / lô', 'Sample / confirmed sample / lot')}: {set.sampleId || unknown} / {set.confirmedSampleId || unknown} / {set.sourceLotId || unknown}</ComplianceText>
            <ComplianceText>{tr('Mã trên chứng thư / niêm chì', 'Stated sample code / seal')}: {set.statedSampleCode || unknown} / {set.statedSealCode || unknown}</ComplianceText>
            <ComplianceText>{tr('Tham chiếu lab / mục', 'Laboratory / section reference')}: {set.laboratorySampleReference || unknown} / {set.sectionReference || unknown}</ComplianceText>
            <ComplianceText>{set.results.length} {tr('chỉ tiêu', 'tests')}</ComplianceText>
          </GlassCard>)}
          {(report.relatedReportId || report.relatedReports.length || report.replacementReportId) ? <GlassCard opaque title={tr('Liên kết báo cáo', 'Report relationships')}>
            <ComplianceText>{tr('Liên quan', 'Related')}: {report.relatedReportId || unknown} · {report.relationshipReason || unknown}</ComplianceText>
            {report.relatedReports.map((related, index) => <ComplianceText key={index}>{related.id} · {related.reportKind} · {related.relationshipReason || unknown}</ComplianceText>)}
            {report.replacementReportId ? <><ComplianceText>{tr('Báo cáo thay thế', 'Replacement')}: {report.replacementReportId}</ComplianceText>
              <GlassButton opaque variant="glass" label={tr('Mở báo cáo thay thế', 'Open replacement report')} onPress={() => router.replace({ pathname: '/compliance/lab-results/[id]', params: { id: report.replacementReportId! } })} /></> : null}
          </GlassCard> : null}
          {report.residueBindings ? <GlassCard opaque title={tr('Liên kết dư lượng (API)', 'Residue bindings (API)')}>
            {report.residueBindings.length ? report.residueBindings.map((binding, index) => <ComplianceText key={index}>{binding.resultId} → {binding.sourceId} · {binding.published ? tr('Đã công bố', 'Published') : tr('Chưa công bố', 'Unpublished')} · {binding.reasons.join('; ')}</ComplianceText>) : <ComplianceText>{tr('Không có liên kết trả về.', 'No bindings returned.')}</ComplianceText>}
          </GlassCard> : null}
          <View style={formStyles.row}>
            {canWriteReports(owner) && isReportMutable(report) ? <>
              {!isReportConfirmed(report) ? <GlassButton opaque label={tr('Xác nhận báo cáo', 'Confirm report')} disabled={fileBusy} onPress={() => setSheet('confirm')} /> : null}
              <GlassButton opaque variant="glass" label={tr('Sửa bản nháp (tạo bản thay thế)', 'Edit draft (creates replacement)')} disabled={fileBusy} onPress={() => setSheet('edit')} />
              <GlassButton opaque variant="glass" labelStyle={{ color: theme.colors.danger }} label={tr('Xóa bản nháp', 'Delete draft')} disabled={fileBusy} onPress={() => setSheet('delete')} />
            </> : null}
            {canWriteReports(owner) && !['DELETED', 'SUPERSEDED'].includes(report.status) ? <GlassButton opaque variant="glass" label={tr('Thêm báo cáo sửa đổi / liên quan', 'Append amended / related report')} disabled={fileBusy} onPress={() => setSheet('append')} /> : null}
            {permission(owner, 'residue.evidence.manage') && owner.organizationId ? <GlassButton opaque variant="glass" label={tr('Đối chiếu dư lượng', 'Review residue evidence')} disabled={fileBusy} onPress={() => setSheet('residue')} /> : null}
          </View>
          <ComplianceText>{tr('Báo cáo đã xác nhận là bất biến. Sửa bản nháp tạo bản thay thế; để điều chỉnh chứng cứ đã xác nhận, thêm báo cáo liên quan. Tải lại để xem đánh giá mới nhất.', 'Confirmed evidence is immutable. Editing a draft creates a replacement; append a related report to correct confirmed evidence. Reload to see the latest assessment.')}</ComplianceText>
          <ComplianceText heading>{tr('Số liệu đã ghi nhận', 'Recorded results')}</ComplianceText>
        </> : null}
      </View>}
      renderItem={({ item: { setIndex, result } }) => <GlassCard opaque title={`${setIndex + 1} · ${result.testLabel || result.id}`}>
        <ComplianceText>{tr('Nguyên văn', 'Original')}: {result.originalResultText}</ComplianceText>
        <ComplianceText>{result.resultKind} · {result.numericValue ?? unknown} {result.unit ?? ''}</ComplianceText>
        <ComplianceText>LOD: {result.lod ?? unknown} · LOQ: {result.loq ?? unknown}</ComplianceText>
        <ComplianceText>{tr('Phương pháp', 'Method')}: {result.method ?? unknown}</ComplianceText>
        <ComplianceText>{tr('Độ không đảm bảo', 'Uncertainty')}: {result.uncertainty ?? unknown}</ComplianceText>
        <ComplianceText>{tr('ID hoạt chất / tham chiếu', 'Substance ID / reference')}: {result.substanceId ?? unknown} / {result.reference ?? unknown}</ComplianceText>
      </GlassCard>}
      ListEmptyComponent={report && !deleted ? <ComplianceText>{tr('Không có chỉ tiêu được trả về.', 'No test results returned.')}</ComplianceText> : undefined} />
    {report && (sheet === 'edit' || sheet === 'append') ? <ReportEditor report={sheet === 'edit' ? report : null} relatedTo={sheet === 'append' ? report.id : undefined} scope={scope} locale={locale} onClose={() => setSheet(null)} onReload={reload}
      onSaved={(newId) => { setSuccess(tr('Máy chủ đã nhận báo cáo. Đang mở bản hiện hành.', 'The server accepted the report. Opening the current version.')); setSheet(null);
        if (newId && newId !== report.id) router.replace({ pathname: '/compliance/lab-results/[id]', params: { id: newId } }); else void state.reload(); }} /> : null}
    {report && (sheet === 'delete' || sheet === 'confirm') ? <ReportActionSheet kind={sheet} report={report} scope={scope} locale={locale} onClose={() => setSheet(null)} onReload={reload}
      onSaved={() => { const removed = sheet === 'delete'; setSheet(null); if (removed) { setDeleted(true); setSuccess(tr('Máy chủ đã chấp nhận xóa báo cáo.', 'The server accepted report deletion.')); }
        else { setSuccess(tr('Máy chủ đã nhận xác nhận. Đang tải lại đánh giá.', 'The server accepted confirmation. Reloading the assessment.')); void state.reload(); } }} /> : null}
    {report && sheet === 'residue' && owner.organizationId ? <ReportReviewSheet reportId={report.id} companyId={owner.organizationId} service={residueService} locale={locale} onClose={() => setSheet(null)}
      onSaved={() => { setSuccess(tr('Máy chủ đã nhận đối chiếu dư lượng. Đang tải lại báo cáo.', 'The server accepted residue review. Reloading the report.')); reload(); }} /> : null}
  </SafeAreaView>;
}
