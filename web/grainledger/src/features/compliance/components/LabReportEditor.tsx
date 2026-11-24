import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/client";
import { labReportEndpoints, type LabReportInput, type LabReportResponse, type LabResultInput, type LabResultSetInput } from "@/api/compliance";
import { useCommand } from "@/shared/hooks/useCommand";
import { Modal } from "@/shared/ui/Modal";
import { Feedback } from "@/shared/ui/Workflow";
import { useAuthStore } from "@/app/store/authStore";
import { useLabSamples } from "../hooks/useLabSamples";

const kinds = ["PARTIAL", "FINAL", "SUPPLEMENTARY", "AMENDMENT", "RETEST"];
const resultKinds = ["NUMERIC", "BELOW_LIMIT", "NOT_DETECTED", "QUALITATIVE", "OTHER"];
const newResult = () => ({ key: crypto.randomUUID(), testLabel: "", originalResultText: "", resultKind: "", substanceId: null });
const newSection = () => ({ entityId: crypto.randomUUID(), sampleId: null, laboratorySampleReference: null, statedSampleCode: null, statedSealCode: null, sectionReference: null, results: [newResult()] });
type Result = LabResultInput & { key: string };
type Section = Omit<LabResultSetInput, "results"> & { results: Result[] };

export function LabReportEditor({ report, onClose, onSaved }: { report: LabReportResponse | null; onClose: () => void; onSaved: (report: LabReportResponse) => void }) {
  const { t } = useTranslation();
  const companyId = useAuthStore(state => state.user?.organizationId);
  const samples = useLabSamples(report?.companyId ?? companyId);
  const uid = useId();
  const [entityId] = useState(() => report?.id ?? crypto.randomUUID());
  const [kind, setKind] = useState(report?.reportKind ?? "");
  const [sections, setSections] = useState<Section[]>(() => report?.resultSets.map(({ id, sampleId, laboratorySampleReference, statedSampleCode, statedSealCode, sectionReference, results }) => ({
    entityId: id, sampleId, laboratorySampleReference, statedSampleCode, statedSealCode, sectionReference, results: results.map(({ id: resultId, ...row }) => ({ ...row, key: resultId })),
  })) ?? [newSection()]);
  const [validation, setValidation] = useState<unknown>(null);
  const [reading, setReading] = useState(false);
  const action = useCommand<{ capturedAt: string; payload: LabReportInput }>(async (clientOperationId, input) => {
    const request = { ...input, clientOperationId, deviceId: "grainledger-web", payloadSchemaVersion: 1 };
    const saved = await (report ? labReportEndpoints.updateLabReport(report.id, request) : labReportEndpoints.createLabReport(request));
    onSaved(saved);
  }, () => {});
  const uncertain = action.error instanceof ApiError && (action.error.status === 0 || action.error.status === 408 || action.error.status >= 500);
  const title = t(report ? "workflows.lab.edit" : "workflows.lab.create");
  const linked = ["SUPPLEMENTARY", "AMENDMENT", "RETEST"].includes(kind);
  const blocked = action.isPending || reading || uncertain;
  const receipt = localDateTime(report?.receivedAt ?? new Date().toISOString());
  const patchSection = (id: string, change: Partial<Section>) => setSections(previous => previous.map(section => section.entityId === id ? { ...section, ...change } : section));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const file = form.get("file");
    const attachment = file instanceof File && file.size ? file : null;
    if ((!report && !attachment) || (attachment && attachment.size > 10 * 1024 * 1024)) { setValidation(new Error(t("workflows.lab.fileSize"))); return; }
    if (!value("laboratoryName") || !value("reportNumber") || sections.some(section => section.results.some(result => !result.testLabel?.trim() || !result.originalResultText?.trim()))) { setValidation(new Error(t("workflows.lab.required"))); return; }
    setReading(true);
    setValidation(null);
    try {
      const enteredReceipt = new Date(value("receivedAt"));
      const receivedAt = report && enteredReceipt.getTime() === Date.parse(receipt) ? report.receivedAt : enteredReceipt.toISOString();
      const capturedAt = new Date().toISOString();
      if (Date.parse(receivedAt) > Date.parse(capturedAt)) { setValidation(new Error(t("workflows.lab.receiptInvalid"))); return; }
      action.submit({ capturedAt, payload: {
        entityId, laboratoryName: value("laboratoryName"), reportNumber: value("reportNumber"), issuedOn: value("issuedOn"), receivedAt, reportKind: kind,
        relatedReportId: value("relatedReportId") || null, relationshipReason: value("relationshipReason") || null,
        laboratoryConclusion: value("laboratoryConclusion") || null, statedStandard: value("statedStandard") || null,
        companyOnlyConfirmed: form.has("companyOnly"), fileName: attachment?.name ?? null, contentType: attachment ? attachment.type || "application/octet-stream" : null,
        contentBase64: attachment ? await encodeFile(attachment) : null,
        resultSets: sections.map(section => ({ ...section, results: section.results.map(row => ({
          testLabel: row.testLabel, substanceId: row.substanceId, originalResultText: row.originalResultText,
          resultKind: row.resultKind, numericValue: row.numericValue, unit: row.unit, lod: row.lod, loq: row.loq,
          method: row.method, uncertainty: row.uncertainty, reference: row.reference,
        })) })),
      } });
    } catch (error) { setValidation(error); }
    finally { setReading(false); }
  }

  return <Modal isOpen ariaLabel={title} onClose={() => { if (!reading && !action.isPending) onClose(); }} closeOnBackdrop={false}>
    <div className="gl-workflow w-[calc(100vw-2rem)] max-w-4xl space-y-4 rounded-2xl bg-surface-base p-5 text-ink-primary dark:bg-surface-raised sm:p-6">
      <h2 id={`${uid}-title`} className="font-display text-xl font-bold">{title}</h2>
      <form method="post" aria-labelledby={`${uid}-title`} onSubmit={save} className="space-y-4">
        <fieldset disabled={blocked} className="grid gap-3 sm:grid-cols-2"><legend className="sr-only">{title}</legend>
          {(["laboratoryName", "reportNumber", "issuedOn", "receivedAt"] as const).map(key => <label key={key} htmlFor={`${uid}-${key}`}>{t(`workflows.lab.${key}`)}
            <input id={`${uid}-${key}`} name={key} type={key === "issuedOn" ? "date" : key === "receivedAt" ? "datetime-local" : "text"} step={key === "receivedAt" ? 1 : undefined} maxLength={200} required defaultValue={key === "receivedAt" ? receipt : report?.[key]} /></label>)}
          <label htmlFor={`${uid}-kind`}>{t("workflows.lab.kind")}<select id={`${uid}-kind`} value={kind} onChange={event => setKind(event.target.value)} required><option value="">{t("workflows.choose")}</option>{kinds.map(value => <option key={value} value={value}>{t(`workflows.lab.values.${value}`)}</option>)}</select></label>
          <label htmlFor={`${uid}-file`}>{t("workflows.lab.original")}<input id={`${uid}-file`} name="file" type="file" required={!report} />{report?.fileName && <span className="break-all text-xs">{t("workflows.lab.retained", { file: report.fileName })}</span>}</label>
          <label htmlFor={`${uid}-related`}>{t("workflows.lab.relatedReportId")}<input id={`${uid}-related`} name="relatedReportId" required={linked} defaultValue={report?.relatedReportId ?? ""} /></label>
          <label htmlFor={`${uid}-relationship`}>{t("workflows.lab.relationshipReason")}<input id={`${uid}-relationship`} name="relationshipReason" required={linked} defaultValue={report?.relationshipReason ?? ""} /></label>
          {(["laboratoryConclusion", "statedStandard"] as const).map(key => <label key={key} htmlFor={`${uid}-${key}`}>{t(`workflows.lab.${key}`)}<input id={`${uid}-${key}`} name={key} defaultValue={report?.[key] ?? ""} /></label>)}
          <label htmlFor={`${uid}-scope`} className="!flex-row items-center sm:col-span-2"><input id={`${uid}-scope`} name="companyOnly" type="checkbox" required />{t("workflows.lab.companyOnly")}</label>
        </fieldset>
        <fieldset disabled={blocked} className="space-y-4"><legend className="font-semibold">{t("workflows.lab.sections")}</legend>
          {sections.map((section, index) => <fieldset key={section.entityId} className="space-y-3 rounded-xl border border-ink-tertiary/20 p-3">
            <legend>{t("workflows.lab.section", { number: index + 1 })}</legend>
            <details open={index === 0 || undefined}><summary className="cursor-pointer text-sm font-semibold">{t("workflows.lab.sampleFields")}</summary>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <label htmlFor={`${section.entityId}-sample`}>{t("workflows.lab.sampleId")}<select id={`${section.entityId}-sample`} value={section.sampleId ?? ""} disabled={samples.isPending} onChange={event => patchSection(section.entityId, { sampleId: event.target.value || null })}>
                  <option value="">{t("workflows.none")}</option>
                  {section.sampleId && !samples.data?.some(sample => sample.id === section.sampleId) && <option value={section.sampleId}>{section.sampleId}</option>}
                  {samples.data?.map(sample => <option key={sample.id} value={sample.id}>{sample.code} · {sample.sealCode}</option>)}
                </select></label>
                {(["laboratorySampleReference", "statedSampleCode", "statedSealCode", "sectionReference"] as const).map(key => <label key={key} htmlFor={`${section.entityId}-${key}`}>{t(`workflows.lab.${key}`)}<input id={`${section.entityId}-${key}`} value={section[key] ?? ""} onChange={event => patchSection(section.entityId, { [key]: event.target.value || null })} /></label>)}
              </div>
              <Feedback error={samples.error} pending={samples.isPending} />
            </details>
            {section.results.map((result, rowIndex) => <ResultEditor key={result.key} row={result} index={rowIndex} removable={section.results.length > 1}
              change={updated => patchSection(section.entityId, { results: section.results.map(item => item.key === result.key ? updated : item) })}
              remove={() => patchSection(section.entityId, { results: section.results.filter(item => item.key !== result.key) })} />)}
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => patchSection(section.entityId, { results: [...section.results, newResult()] })}>{t("workflows.lab.addResult")}</button>
              <button type="button" disabled={sections.length === 1} onClick={() => setSections(sections.filter(item => item.entityId !== section.entityId))}>{t("workflows.lab.removeSection")}</button></div>
          </fieldset>)}
          <button type="button" onClick={() => setSections([...sections, newSection()])}>{t("workflows.lab.addSection")}</button>
        </fieldset>
        <Feedback error={validation ?? action.error} pending={reading || action.isPending} />
        <footer className="flex flex-wrap justify-end gap-2 border-t border-ink-tertiary/20 pt-3">
          <button type="button" disabled={reading || action.isPending} onClick={onClose}>{t("field.seasons.cancel")}</button>
          {uncertain ? <button type="button" onClick={() => { if (action.variables) action.submit(action.variables); }}>{t("field.seasons.retry")}</button> : <button type="submit" disabled={blocked}>{t("workflows.lab.saveDraft")}</button>}
        </footer>
      </form>
    </div>
  </Modal>;
}

function ResultEditor({ row, index, removable, change, remove }: { row: Result; index: number; removable: boolean; change: (row: Result) => void; remove: () => void }) {
  const { t } = useTranslation();
  const numeric = row.resultKind === "NUMERIC" || row.resultKind === "BELOW_LIMIT";
  return <fieldset className="space-y-2 rounded-lg bg-surface-overlay/50 p-3"><legend>{t("workflows.lab.row", { number: index + 1 })}</legend>
    <div className="grid gap-2 sm:grid-cols-2">
      {(["testLabel", "originalResultText"] as const).map(key => <label key={key} htmlFor={`${row.key}-${key}`}>{t(`workflows.lab.${key}`)}<input id={`${row.key}-${key}`} required value={row[key] ?? ""} onChange={event => change({ ...row, [key]: event.target.value })} /></label>)}
      <label htmlFor={`${row.key}-kind`}>{t("workflows.lab.resultKind")}<select id={`${row.key}-kind`} value={row.resultKind ?? ""} required onChange={event => change({ ...row, resultKind: event.target.value })}><option value="">{t("workflows.choose")}</option>{resultKinds.map(kind => <option key={kind} value={kind}>{t(`workflows.lab.values.${kind}`)}</option>)}</select></label>
      <label htmlFor={`${row.key}-numeric`}>{t("workflows.lab.numericValue")}<input id={`${row.key}-numeric`} inputMode="decimal" required={numeric} value={row.numericValue ?? ""} onChange={event => change({ ...row, numericValue: event.target.value || null })} /></label>
    </div>
    <details><summary className="cursor-pointer text-sm">{t("workflows.lab.resultDetails")}</summary><div className="mt-2 grid gap-2 sm:grid-cols-3">
      {(["substanceId", "unit", "method", "lod", "loq", "uncertainty", "reference"] as const).map(key => <label key={key} htmlFor={`${row.key}-${key}`}>{t(`workflows.lab.${key}`)}<input id={`${row.key}-${key}`} value={row[key] ?? ""} onChange={event => change({ ...row, [key]: event.target.value || null })} /></label>)}
    </div></details>
    <button type="button" disabled={!removable} onClick={remove}>{t("workflows.remove")}</button>
  </fieldset>;
}

function localDateTime(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 19);
}

function encodeFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
