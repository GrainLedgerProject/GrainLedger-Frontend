import { randomUUID } from 'expo-crypto';
import { useMemo, useState } from 'react';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { useAuth } from '@/features/auth/AuthProvider';
import type { LabSample } from './lab-samples-api';
import { captureSample, createSampleCommands, handoverFormErrors, recordHandover, sampleFormErrors } from './sample-commands';
import { ActionFailure, ComplianceField, ComplianceSheet, ComplianceText, useComplianceAction, type Locale } from './compliance-ui';

export function SampleEditor({ sample, scope, locale, onClose, onSaved, onReload }: { sample: LabSample | null; scope: string; locale: Locale;
  onClose: () => void; onSaved: () => void; onReload: () => void }) {
  const { client, user } = useAuth();
  const [owner] = useState(() => user!);
  const tr = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const execute = useMemo(() => createSampleCommands(client.api, owner, () => client.getRequestScope() === scope), [client, owner, scope]);
  const { action, state, busy } = useComplianceAction(execute);
  const [attempted, setAttempted] = useState(false);
  const [form, setForm] = useState({ sealCode: '', sourceLotId: '', materialDescription: '' });
  const [handover, setHandover] = useState({ fromParty: owner.displayName, toParty: '', laboratoryName: '', sealCondition: 'Nguyên vẹn', evidenceRef: '', laboratorySampleReference: '', laboratoryReference: '' });
  const errors = sample ? handoverFormErrors(handover) : sampleFormErrors(form);
  async function submit() {
    setAttempted(true);
    if (busy || Object.values(errors).some(Boolean)) return;
    const key = JSON.stringify([sample?.id ?? null, sample ? handover : form]);
    if (await action.submit(key, () => sample ? recordHandover(sample.id, handover, randomUUID, () => new Date().toISOString())
      : captureSample(form, randomUUID, () => new Date().toISOString()))) onSaved();
  }
  const required = tr('Thông tin bắt buộc.', 'This field is required.');
  return <ComplianceSheet title={sample ? tr('Bàn giao mẫu', 'Hand over sample') : tr('Đăng ký mẫu lab', 'Register lab sample')} busy={busy} onClose={onClose} tr={tr}>
    <GlassCard opaque>
      {sample ? <>
        <ComplianceText>{tr('Mẫu', 'Sample')}: {sample.code || sample.id} · {sample.sealCode || tr('Chưa có mã niêm chì', 'No seal code provided')}</ComplianceText>
        {(['laboratoryName', 'fromParty', 'toParty', 'sealCondition', 'evidenceRef'] as const).map((key) => <ComplianceField key={key} disabled={busy}
          label={key === 'laboratoryName' ? tr('Phòng kiểm nghiệm *', 'Laboratory *') : key === 'fromParty' ? tr('Bên giao *', 'From party *')
            : key === 'toParty' ? tr('Bên nhận *', 'To party *') : key === 'sealCondition' ? tr('Tình trạng niêm phong', 'Seal condition') : tr('Tham chiếu chứng từ', 'Evidence reference')}
          value={handover[key]} onChangeText={(value) => setHandover({ ...handover, [key]: value })}
          error={attempted && key in errors && errors[key as keyof typeof errors] ? required : undefined} />)}
        <ComplianceText>{tr('Kiểm tra và sửa tình trạng niêm phong theo thực tế. Nếu để trống, hệ thống dùng “Nguyên vẹn” theo quy tắc hiện tại. Thời gian bàn giao là lúc gửi phiếu.', 'Verify and edit the actual seal condition. An empty value uses “Nguyên vẹn” under the existing rule. Handover time is the submission time.')}</ComplianceText>
        <ComplianceField label={tr('Tham chiếu mẫu do lab cung cấp (để đối chiếu chứng thư)', 'Lab sample reference (for certificate matching)')} value={handover.laboratorySampleReference} disabled={busy} onChangeText={(laboratorySampleReference) => setHandover({ ...handover, laboratorySampleReference })} />
        <ComplianceField label={tr('Tham chiếu bàn giao của lab', 'Laboratory handover reference')} value={handover.laboratoryReference} disabled={busy} onChangeText={(laboratoryReference) => setHandover({ ...handover, laboratoryReference })} />
      </> : <>
        <ComplianceField label={tr('Mã niêm chì *', 'Seal code *')} value={form.sealCode} disabled={busy}
          onChangeText={(sealCode) => setForm({ ...form, sealCode })} error={attempted && sampleFormErrors(form).sealCode ? required : undefined} />
        <ComplianceField label={tr('ID lô nguyên liệu nguồn *', 'Source lot ID *')} value={form.sourceLotId} disabled={busy}
          onChangeText={(sourceLotId) => setForm({ ...form, sourceLotId })} error={attempted && sampleFormErrors(form).sourceLotId ? required : undefined} />
        <ComplianceField label={tr('Mô tả nguyên liệu', 'Material description')} value={form.materialDescription} disabled={busy} multiline
          onChangeText={(materialDescription) => setForm({ ...form, materialDescription })} />
        <ComplianceText>{tr('Không cần nhập mã mẫu. Thời gian lấy mẫu là lúc gửi đăng ký, theo quy tắc hiện tại.', 'A sample code is not required here. Collection time is the registration submission time under the existing rule.')}</ComplianceText>
      </>}
      <ActionFailure error={state.error} tr={tr} onReload={onReload} />
      <GlassButton opaque label={sample ? tr('Ghi nhận bàn giao', 'Record handover') : tr('Đăng ký mẫu', 'Register sample')} loading={busy}
        loadingLabel={tr('Đang gửi…', 'Submitting…')} onPress={() => { void submit(); }} />
    </GlassCard>
  </ComplianceSheet>;
}
