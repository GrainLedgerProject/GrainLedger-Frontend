import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LabReportResponse } from "@/api/compliance";
import { residueEndpoints, type ResidueReportReview, type ResidueReportReviewRow } from "@/api/residue";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

const emptyId = "00000000-0000-0000-0000-000000000000";
const decimal = "[0-9]{1,24}([.][0-9]{1,18})?";

export function LabResidueReview({ report, companyId }: { report: LabReportResponse; companyId: string }) {
  const text = useWorkflowText();
  const client = useQueryClient();
  const [basis, setBasis] = useState(false);
  const [snapshot, setSnapshot] = useState<ResidueReportReview | null>(null);
  const [rows, setRows] = useState<ResidueReportReviewRow[]>([]);
  const [dirty, setDirty] = useState(true);
  const [saved, setSaved] = useState(false);
  const preview = useMutation({
    mutationFn: () => residueEndpoints.previewLabReportReview(report.id, {
      companyId, asReceivedConfirmed: basis, effectiveFrom: snapshot?.effectiveFrom ?? null,
      rows: rows.filter(row => row.sourceId !== emptyId),
    }),
    onSuccess: result => {
      setSnapshot(result);
      setRows(result.rows.map(row => row.input));
      setDirty(false);
    },
  });
  const ready = snapshot?.rows.filter(row => !row.published && !row.reasons.length && row.input.previewFingerprint) ?? [];
  const confirm = useMutation({
    mutationFn: () => residueEndpoints.confirmLabReportReview(report.id, {
      companyId, asReceivedConfirmed: basis, effectiveFrom: snapshot!.effectiveFrom,
      rows: ready.map(row => row.input),
    }),
    onSuccess: () => {
      setSaved(true);
      setDirty(true);
      void client.invalidateQueries({ queryKey: ["residue-evidence"] });
      void client.invalidateQueries({ queryKey: ["lot-residue-history"] });
      preview.mutate();
    },
  });
  const busy = preview.isPending || confirm.isPending;
  function change(index: number, patch: Partial<ResidueReportReviewRow>) {
    setRows(current => current.map((row, position) => position === index ? { ...row, ...patch, previewFingerprint: null } : row));
    setDirty(true);
    setSaved(false);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "confirm") {
      if (basis && !dirty && ready.length) confirm.mutate();
    } else {
      setSaved(false);
      preview.mutate();
    }
  }

  return <details className="rounded-xl border border-ink-tertiary/20 bg-surface-base p-4 dark:bg-surface-raised">
    <summary className="cursor-pointer font-display text-sm font-bold text-ink-primary">{text("Rà soát liên kết từng kết quả xét nghiệm", "Review laboratory result bindings")}</summary>
    <form method="post" className="record-form mt-3 space-y-3" onSubmit={submit}>
      <fieldset disabled={busy} className="space-y-3">
        <legend className="sr-only">{text("Rà soát kết quả", "Review results")}</legend>
        <label className="!flex-row cursor-pointer items-center gap-2.5 rounded-lg border border-ink-tertiary/20 bg-surface-raised/50 p-2.5 text-xs font-medium text-ink-primary dark:bg-surface-overlay/30">
          <input type="checkbox" name="asReceivedConfirmed" checked={basis} onChange={e => { setBasis(e.target.checked); setDirty(true); setSaved(false); }} className="size-4 shrink-0 accent-accent-primary" />
          <span>{text("Tôi xác nhận nồng độ theo mẫu nhận.", "I confirm that concentrations are reported as received.")}</span>
        </label>
        {snapshot?.rows.map((row, index) => {
          const input = rows[index] ?? row.input;
          const result = report.resultSets.flatMap(set => set.results).find(r => r.id === input.resultId);
          return <fieldset key={`${input.resultId}:${input.sourceId}`} className="space-y-2 rounded-lg border border-ink-tertiary/20 p-3">
            <legend>{row.label}</legend>
            <p>{result?.originalResultText} · {result?.method || "—"} · {row.rawUncertainty || "—"}</p>
            {row.profile && <details>
              <summary>{row.profile.code} v{row.profile.versionNo} · {row.setting?.mode} v{row.setting?.versionNo}</summary>
              <p>{row.profile.residueDefinition} · {row.profile.applicabilityStatement}</p>
              <p>{row.profile.reviewedBy} · {row.profile.reviewAuthority} · {row.profile.evidenceRef}</p>
              {row.setting && <p>{row.setting.reviewedBy} · {row.setting.reviewAuthority} · {row.setting.evidenceRef}</p>}
            </details>}
            {row.published && <p>{text("Đã xác nhận liên kết", "Binding confirmed")}</p>}
            {!dirty && row.assessment && <p>{row.assessment.lower ?? "—"} – {row.assessment.upper ?? "—"} {row.assessment.unit}</p>}
            {!dirty && row.reasons.length > 0 && <ul className="list-disc ps-5">{row.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
            {!row.published && input.sourceId !== emptyId && <div className="grid gap-2 sm:grid-cols-2">
              {row.rawUncertainty && <label>{text("Độ không đảm bảo tuyệt đối đã duyệt", "Reviewed absolute uncertainty")} ({result?.unit ?? "—"})
                <input name={`uncertainty-${index}`} inputMode="decimal" pattern={decimal} value={input.absoluteUncertainty ?? ""}
                  onChange={e => change(index, { absoluteUncertainty: e.target.value || null })} />
              </label>}
              {result?.resultKind === "NOT_DETECTED" && <label>{text("Ngưỡng báo cáo đã duyệt", "Reviewed reporting threshold")} ({result.unit ?? "—"})
                <input name={`threshold-${index}`} inputMode="decimal" pattern={decimal} value={input.reportingThreshold ?? ""}
                  onChange={e => change(index, { reportingThreshold: e.target.value || null })} />
              </label>}
              {!!row.conflictingResults.length && <label>{text("Kết quả bị thay thế", "Superseded results")}
                <select name={`superseded-${index}`} multiple value={input.supersededResultIds ?? []}
                  onChange={e => change(index, { supersededResultIds: Array.from(e.target.selectedOptions, option => option.value) })}>
                  {row.conflictingResults.map(choice => <option key={choice.resultId} value={choice.resultId}>{choice.label}</option>)}
                </select>
              </label>}
              {!!row.existingSelections.length && <label>{text("Thay thế liên kết đã ghi nhận", "Replace an existing binding")}
                <select name={`replacement-${index}`} value={input.supersedesId ?? ""} onChange={e => change(index, { supersedesId: e.target.value || null })}>
                  <option value="">—</option>
                  {row.existingSelections.map(choice => <option key={choice.selectionId} value={choice.selectionId}>{choice.label}</option>)}
                </select>
              </label>}
              <label>{text("Ghi chú rà soát", "Review note")}<textarea name={`note-${index}`} value={input.note ?? ""} onChange={e => change(index, { note: e.target.value || null })} /></label>
            </div>}
          </fieldset>;
        })}
      </fieldset>
      {saved && <p role="status" className="record-success">{text("Đã xác nhận liên kết kết quả.", "Result bindings confirmed.")}</p>}
      {dirty && snapshot && <p role="status" className="text-xs font-medium text-ink-secondary">{text("Cần xem trước lại sau khi thay đổi dữ liệu.", "Preview again after changing review inputs.")}</p>}
      {busy && <div className="flex justify-center py-2"><GrainLoader size="sm" label={text("Đang rà soát liên kết kết quả...", "Reviewing result bindings...")} /></div>}
      <Feedback error={preview.error ?? confirm.error} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" value="preview" disabled={busy} className="record-button rounded-full">{text("Xem trước liên kết", "Preview bindings")}</button>
        <button type="submit" value="confirm" disabled={busy || dirty || !basis || !ready.length} className="record-button record-primary rounded-full">{text("Xác nhận liên kết phù hợp", "Confirm eligible bindings")} ({ready.length})</button>
      </div>
    </form>
  </details>;
}
