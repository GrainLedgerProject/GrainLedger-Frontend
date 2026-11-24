import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/client";
import { labReportEndpoints, type ConfirmLabReportInput, type LabReportResponse } from "@/api/compliance";
import { useCommand } from "@/shared/hooks/useCommand";
import { Modal } from "@/shared/ui/Modal";
import { Feedback } from "@/shared/ui/Workflow";
import { useLabSamples } from "../hooks/useLabSamples";

function uncertain(error: unknown) {
  return error instanceof ApiError && (error.status === 0 || error.status === 408 || error.status >= 500);
}

export function DeleteLabReportDialog({ report, onClose, onSaved }: { report: LabReportResponse; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const action = useCommand<string>((clientOperationId, capturedAt) => labReportEndpoints.deleteLabReport(report.id, { clientOperationId, capturedAt, deviceId: "grainledger-web", payloadSchemaVersion: 1 }), onSaved);
  const title = t("workflows.lab.delete");
  return <Modal isOpen ariaLabel={title} closeOnBackdrop={false} onClose={() => { if (!action.isPending) onClose(); }}>
    <div className="gl-workflow w-[calc(100vw-2rem)] max-w-lg space-y-4 rounded-2xl bg-surface-base p-5 dark:bg-surface-raised">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p>{t("workflows.lab.deletePrompt", { name: report.reportNumber })}</p>
      <Feedback error={action.error} pending={action.isPending} />
      <div className="flex flex-wrap gap-2"><button type="button" disabled={action.isPending} onClick={onClose}>{t("field.seasons.cancel")}</button>
        <button type="button" className="!border-accent-danger !bg-accent-danger !text-white" disabled={action.isPending} onClick={() => action.submit(uncertain(action.error) && action.variables ? action.variables : new Date().toISOString())}>{t(uncertain(action.error) ? "field.seasons.retry" : "workflows.lab.delete")}</button></div>
    </div>
  </Modal>;
}

export function LabReportConfirmation({ report, onSaved }: { report: LabReportResponse; onSaved: (confirmed: LabReportResponse) => void }) {
  const { t } = useTranslation();
  const samples = useLabSamples(report.companyId);
  const [basis, setBasis] = useState<Record<string, string>>({});
  const action = useCommand<{ capturedAt: string; payload: ConfirmLabReportInput }>(async (clientOperationId, input) => onSaved(await labReportEndpoints.confirmLabReport(report.id, { ...input, clientOperationId, deviceId: "grainledger-web", payloadSchemaVersion: 1 })), () => {});
  const retry = uncertain(action.error);
  function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (action.isPending || retry) return;
    const form = new FormData(event.currentTarget);
    action.submit({ capturedAt: new Date().toISOString(), payload: {
      identityChecked: form.has("identity"), transcriptionChecked: form.has("transcription"), asReceivedConfirmed: form.has("asReceived"),
      matches: report.resultSets.map(section => ({ resultSetId: section.id, sampleId: String(form.get(`${section.id}-sample`) ?? ""), identityBasis: basis[section.id], evidenceRef: String(form.get(`${section.id}-evidence`) ?? "").trim() || null })),
    } });
  }
  return <form method="post" onSubmit={confirm} className="gl-workflow space-y-3 rounded-xl border border-ink-tertiary/20 p-4">
    <fieldset disabled={action.isPending || retry || samples.isPending} className="space-y-3"><legend className="font-semibold">{t("workflows.lab.confirm")}</legend>
      {report.resultSets.map((section, index) => <fieldset key={section.id} className="grid gap-2 sm:grid-cols-2"><legend>{t("workflows.lab.section", { number: index + 1 })}</legend>
        <label htmlFor={`${section.id}-sample`}>{t("workflows.lab.sampleId")}<select name={`${section.id}-sample`} id={`${section.id}-sample`} defaultValue={section.sampleId ?? ""} required><option value="">{t("workflows.choose")}</option>{samples.data?.map(sample => <option key={sample.id} value={sample.id}>{sample.code} · {sample.sealCode}</option>)}</select></label>
        <label htmlFor={`${section.id}-basis`}>{t("workflows.lab.identityBasis")}<select id={`${section.id}-basis`} value={basis[section.id] ?? ""} required onChange={event => setBasis(previous => ({ ...previous, [section.id]: event.target.value }))}><option value="">{t("workflows.choose")}</option><option value="SAMPLE_CODE">{t("workflows.lab.statedSampleCode")}</option><option value="SEAL_CODE">{t("workflows.lab.statedSealCode")}</option><option value="LAB_REFERENCE">{t("workflows.lab.laboratorySampleReference")}</option></select></label>
        {basis[section.id] === "LAB_REFERENCE" && <label htmlFor={`${section.id}-evidence`}>{t("workflows.residue.evidenceRef")}<input name={`${section.id}-evidence`} id={`${section.id}-evidence`} required /></label>}
      </fieldset>)}
      <label htmlFor="lab-identity" className="!flex-row items-center"><input id="lab-identity" name="identity" type="checkbox" required />{t("workflows.lab.identityChecked")}</label>
      <label htmlFor="lab-transcription" className="!flex-row items-center"><input id="lab-transcription" name="transcription" type="checkbox" required />{t("workflows.lab.transcriptionChecked")}</label>
      <label htmlFor="lab-received" className="!flex-row items-center"><input id="lab-received" name="asReceived" type="checkbox" />{t("workflows.residue.asReceived")}</label>
      <button type="submit">{t("workflows.lab.confirm")}</button>
    </fieldset>
    <Feedback error={samples.error ?? action.error} pending={samples.isPending || action.isPending} />
    {retry && <button type="button" onClick={() => { if (action.variables) action.submit(action.variables); }}>{t("field.seasons.retry")}</button>}
  </form>;
}
