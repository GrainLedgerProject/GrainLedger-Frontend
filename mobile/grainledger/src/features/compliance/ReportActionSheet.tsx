import { randomUUID } from 'expo-crypto';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { z } from 'zod';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { LabReport } from './lab-reports-api';
import { confirmReport, createReportCommands, deleteReport, type ReportMatch } from './report-commands';
import { ActionFailure, Check, ComplianceField, ComplianceSheet, ComplianceText, formStyles, useComplianceAction, type Locale } from './compliance-ui';

export function ReportActionSheet({ kind, report, scope, locale, onClose, onSaved, onReload }: { kind: 'confirm' | 'delete'; report: LabReport;
  scope: string; locale: Locale; onClose: () => void; onSaved: () => void; onReload: () => void }) {
  const { client, user } = useAuth();
  const { theme } = useAppTheme();
  const [owner] = useState(() => user!);
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const execute = useMemo(() => createReportCommands(client.api, owner, () => client.getRequestScope() === scope), [client, owner, scope]);
  const { action, state, busy } = useComplianceAction(execute);
  const [checked, setChecked] = useState({ identity: false, transcription: false, asReceived: false });
  const [matches, setMatches] = useState(() => report.resultSets.map((set) => ({ resultSetId: set.id, sampleId: set.sampleId ?? set.confirmedSampleId ?? '', identityBasis: '', evidenceRef: '' })));
  const [typed, setTyped] = useState('');
  const canSubmit = kind === 'delete' ? typed === (report.reportNumber || report.id) : checked.identity && checked.transcription && matches.length > 0 && matches.every((match) =>
    z.uuid().safeParse(match.sampleId.trim()).success && ['SAMPLE_CODE', 'SEAL_CODE', 'LAB_REFERENCE'].includes(match.identityBasis) && (match.identityBasis !== 'LAB_REFERENCE' || Boolean(match.evidenceRef.trim())));
  async function submit() {
    if (!canSubmit || busy) return;
    if (await action.submit(JSON.stringify([kind, report.id, checked, matches]), () => kind === 'delete'
      ? deleteReport(report.id, randomUUID, () => new Date().toISOString()) : confirmReport(report, { ...checked, matches: matches.map((match) => ({ ...match, sampleId: match.sampleId.trim(), evidenceRef: match.evidenceRef.trim() || null })) as ReportMatch[] }, randomUUID, () => new Date().toISOString()))) onSaved();
  }
  return <ComplianceSheet title={kind === 'delete' ? tr('Xóa báo cáo', 'Delete report') : tr('Xác nhận báo cáo', 'Confirm report')} busy={busy} onClose={onClose} tr={tr}>
    <GlassCard opaque title={report.reportNumber || report.id}>
      {kind === 'delete' ? <>
        <ComplianceText>{tr('Thao tác xóa được gửi đến máy chủ và không thể hoàn tác trong ứng dụng. Máy chủ quyết định báo cáo có được phép xóa ở trạng thái hiện tại hay không.', 'Deletion is sent to the server and cannot be undone in the app. The server decides whether the current report state permits deletion.')}</ComplianceText>
        <ComplianceField label={tr('Nhập lại số báo cáo để xác nhận', 'Retype the report number to confirm')} helperText={report.reportNumber || report.id} value={typed} disabled={busy} onChangeText={setTyped} />
      </> : <>
        <ComplianceText>{tr('Đối chiếu với chứng thư gốc trước khi xác nhận. Thao tác này không tự xác nhận lô đạt MRL hoặc cho phép xuất hàng.', 'Compare with the original certificate before confirming. This action does not itself establish MRL compliance or authorize shipment.')}</ComplianceText>
        <Check label={tr('Đã kiểm tra tính đồng nhất mẫu', 'Sample identity checked')} value={checked.identity} disabled={busy} onChange={(identity) => setChecked({ ...checked, identity })} />
        <Check label={tr('Đã kiểm tra việc chép kết quả', 'Result transcription checked')} value={checked.transcription} disabled={busy} onChange={(transcription) => setChecked({ ...checked, transcription })} />
        <Check label={tr('Xác nhận kết quả theo trạng thái tiếp nhận (as received)', 'Confirm results on an as-received basis')} value={checked.asReceived} disabled={busy} onChange={(asReceived) => setChecked({ ...checked, asReceived })} />
        {report.resultSets.map((set, index) => <GlassCard opaque key={set.id} title={`${tr('Đối chiếu nhóm kết quả', 'Match result set')} ${index + 1}`}>
          <ComplianceText>{tr('Mã mẫu / niêm chì trên chứng thư', 'Printed sample / seal')}: {set.statedSampleCode || '—'} / {set.statedSealCode || '—'}</ComplianceText>
          <ComplianceText>{tr('Tham chiếu mẫu lab', 'Laboratory sample reference')}: {set.laboratorySampleReference || '—'}</ComplianceText>
          <ComplianceField label={tr('ID mẫu thực tế thuộc công ty *', 'Actual company sample ID *')} value={matches[index].sampleId} disabled={busy}
            onChangeText={(sampleId) => setMatches(matches.map((match, i) => i === index ? { ...match, sampleId } : match))} />
          <ComplianceText>{tr('Căn cứ đồng nhất *', 'Identity basis *')}</ComplianceText><View style={formStyles.row}>
            {(['SAMPLE_CODE', 'SEAL_CODE', 'LAB_REFERENCE'] as const).map((identityBasis) => <GlassButton opaque key={identityBasis} label={identityBasis === 'SAMPLE_CODE' ? tr('Mã mẫu', 'Sample code') : identityBasis === 'SEAL_CODE' ? tr('Mã niêm chì', 'Seal code') : tr('Tham chiếu lab', 'Lab reference')}
              variant={matches[index].identityBasis === identityBasis ? 'primary' : 'glass'} accessibilityState={{ selected: matches[index].identityBasis === identityBasis }} disabled={busy}
              onPress={() => setMatches(matches.map((match, i) => i === index ? { ...match, identityBasis } : match))} />)}
          </View>
          <ComplianceField label={tr('Tham chiếu bằng chứng (bắt buộc nếu đối chiếu qua lab)', 'Evidence reference (required for laboratory reference matching)')} value={matches[index].evidenceRef} disabled={busy}
            onChangeText={(evidenceRef) => setMatches(matches.map((match, i) => i === index ? { ...match, evidenceRef } : match))} />
        </GlassCard>)}
        <ComplianceText>{tr('Mỗi nhóm phải đối chiếu đúng một lần. Máy chủ kiểm tra thông tin in trên chứng thư; căn cứ lab cần khớp tham chiếu và chứng từ bàn giao độc lập. Không tự gán mẫu hoặc bỏ qua mâu thuẫn.', 'Match every result set exactly once. The server verifies printed identity; laboratory-reference matching requires independent handover reference/evidence. Samples are not auto-bound and contradictions cannot be bypassed.')}</ComplianceText>
      </>}
      <ActionFailure error={state.error} tr={tr} onReload={onReload} />
      <GlassButton opaque variant={kind === 'delete' ? 'glass' : 'primary'} labelStyle={kind === 'delete' ? { color: theme.colors.danger } : undefined}
        label={kind === 'delete' ? tr('Xác nhận xóa', 'Confirm deletion') : tr('Gửi xác nhận', 'Submit confirmation')} disabled={!canSubmit} loading={busy}
        loadingLabel={tr('Đang xử lý…', 'Processing…')} onPress={() => { void submit(); }} />
    </GlassCard>
  </ComplianceSheet>;
}
