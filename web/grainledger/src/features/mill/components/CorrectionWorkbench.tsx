import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { ledgerEndpoints, type CorrectionOperation, type PhysicalPosition } from "@/api/ledger";
import { collectPages, pageItems, type ApiPage } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { Modal } from "@/shared/ui/Modal";
import { Feedback, Panel } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { toDecimal } from "@/shared/utils/decimalMass";
import { type CorrectionRecord } from "../model/correction";
import { CorrectionStatusBadge } from "./CorrectionStatusBadge";
import { CorrectionEvidence, CorrectionEvidenceDownload } from "./CorrectionEvidence";
import { CorrectionReplacementForm } from "./CorrectionReplacementForm";

type ReviewCommand = { action: "reconcile" | "cancel" | "commit" | "confirm"; evidenceId: string; reason: string; reconciliation: PhysicalPosition[]; replacementOperationId: string; replacementVersion: string };
interface OutputLot { id: string; code: string; positions: { locationId: string; quantityKg: string }[] }

export function CorrectionWorkbench({ selectedCorrection: correction, onClose }: { selectedCorrection: CorrectionRecord; onClose: () => void }) {
  const text = useWorkflowText();
  const cache = useQueryClient();
  const user = useAuthStore(s => s.user);
  const canReview = user?.role === "MILL_MANAGER" && user.permissions.includes("corrections.reconcile");
  const canConfirm = user?.role === "MILL_MANAGER" && user.permissions.includes("conversions.confirm");
  const canCommit = user?.role === "MILL_OPERATOR" && user.permissions.includes("conversions.write");
  const open = ["PENDING_REVIEW", "RECONCILED"].includes(correction.status);
  const [reason, setReason] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [replacementId, setReplacementId] = useState(correction.replacementOperationId ?? "");
  const [verified, setVerified] = useState(false);
  const [reviewedVersion, setReviewedVersion] = useState("");
  const [originalCorrect, setOriginalCorrect] = useState(false);
  const [confirmedCommit, setConfirmedCommit] = useState(false);
  const [success, setSuccess] = useState("");
  const busy = useRef(false);
  const setup = useQuery({ queryKey: ["ledger-setup"], queryFn: ledgerEndpoints.getSetup });
  const locationName = (locationId: string) =>
    setup.data?.locations?.find((loc) => loc.id === locationId)?.name ?? locationId;
  const original = useQuery({ queryKey: ["correction-original", correction.operationId], queryFn: async () => await ledgerEndpoints.getOperation(correction.operationId) as CorrectionOperation });
  const drafts = useQuery({ queryKey: ["correction-drafts", original.data?.ownerId, original.data?.facilityId], enabled: Boolean(original.data && open), queryFn: async () => collectPages(async q => {
    const response = await ledgerEndpoints.getOperations({ ...q, status: "DRAFT", ownerId: original.data!.ownerId, facilityId: original.data!.facilityId });
    return Array.isArray(response) ? { items: pageItems<CorrectionOperation>(response), hasMore: false } : response as ApiPage<CorrectionOperation>;
  }) });
  const replacement = useQuery({ queryKey: ["correction-replacement", replacementId], queryFn: async () => await ledgerEndpoints.getOperation(replacementId) as CorrectionOperation, enabled: Boolean(replacementId && open) });
  const physical = useQuery({ queryKey: ["correction-positions", correction.id], enabled: false, retry: false, queryFn: async () => {
    if (!original.data?.outputs.length) throw new Error(text("Không có đầu ra gốc để đối soát.", "No original outputs to reconcile."));
    const lots = await Promise.all(original.data.outputs.map(async o => await ledgerEndpoints.getLot(o.id) as OutputLot));
    return lots.flatMap(l => {
      if (!l.id || !Array.isArray(l.positions)) throw new Error(text("Thiếu vị trí đầu ra gốc.", "Original output positions are missing."));
      return l.positions.filter(p => toDecimal(p.quantityKg).gt(0)).map(p => ({ lotId: l.id, locationId: p.locationId, quantityKg: p.quantityKg }));
    });
  } });
  const [positions, setPositions] = useState<PhysicalPosition[] | null>(null);
  const mutation = useMutation({ mutationFn: async (cmd: ReviewCommand) => {
    if (cmd.action === "confirm") return ledgerEndpoints.confirmOperation(cmd.replacementOperationId, { version: cmd.replacementVersion, evidenceId: cmd.evidenceId, reason: cmd.reason });
    if (cmd.action === "reconcile") return ledgerEndpoints.reconcileCorrection(correction.id, { evidenceId: cmd.evidenceId, reason: cmd.reason, reconciliation: cmd.reconciliation, replacementOperationId: cmd.replacementOperationId, replacementVersion: cmd.replacementVersion });
    if (cmd.action === "cancel") return ledgerEndpoints.cancelCorrection(correction.id, { evidenceId: cmd.evidenceId, reason: cmd.reason });
    return ledgerEndpoints.commitCorrection(correction.id, { replacementOperationId: cmd.replacementOperationId });
  }, onSuccess: async (_result, cmd) => {
    setSuccess(cmd.action === "confirm" ? text("Đã xác nhận chênh lệch của phiên bản thay thế.", "Replacement version variance confirmed.") : cmd.action === "commit" ? text("Đã chốt gói bút toán bù và công đoạn thay thế.", "Compensation and replacement committed.") : cmd.action === "cancel" ? text("Đã hủy yêu cầu theo chứng cứ xác minh bản gốc đúng.", "Correction cancelled with verified original-correct evidence.") : text("Đã duyệt đối soát và gắn phiên bản thay thế.", "Reconciliation and replacement version recorded."));
    setVerified(false); setConfirmedCommit(false); setOriginalCorrect(false);
    await Promise.all([cache.invalidateQueries({ queryKey: ["ledger-corrections"] }), cache.invalidateQueries({ queryKey: ["correction-drafts"] }), cache.invalidateQueries({ queryKey: ["correction-original"] }), cache.invalidateQueries({ queryKey: ["correction-replacement"] })]);
  }, onError: error => {
    if (error instanceof ApiError && [409, 412].includes(error.status)) {
      setVerified(false); setPositions(null); setConfirmedCommit(false); setOriginalCorrect(false);
      void cache.invalidateQueries({ queryKey: ["ledger-corrections"] });
      void cache.invalidateQueries({ queryKey: ["correction-replacement"] });
    }
  }, onSettled: () => { busy.current = false; } });
  const r = replacement.data;
  const needsConfirmation = r?.varianceKg !== undefined && !toDecimal(r.varianceKg).isZero() && r.confirmedVersion !== r.version;
  const eligible = r?.status === "DRAFT" && r.ownerId === original.data?.ownerId && r.facilityId === original.data?.facilityId && (!r.boundCorrectionId || r.boundCorrectionId === correction.id);
  const reviewing = mutation.isPending || physical.isFetching || replacement.isFetching || original.isFetching;
  const positionsValid = !!positions?.length && positions.every(row => /^[0-9]{1,14}(\.[0-9]{1,6})?$/.test(row.quantityKg) && toDecimal(row.quantityKg).gt(0));
  const ready = canReview && open && Boolean(reason.trim() && evidenceId && positionsValid && verified && eligible && r?.version && reviewedVersion === r.version) && !reviewing;
  function submit(action: ReviewCommand["action"]) {
    if (busy.current || !open) return;
    if (action === "reconcile" && (!ready || needsConfirmation)) return;
    if (action === "confirm" && (!ready || !canConfirm)) return;
    if (action === "cancel" && (!canReview || !evidenceId || !reason.trim() || !originalCorrect || reviewing)) return;
    if (action === "commit" && (!canCommit || correction.status !== "RECONCILED" || !correction.replacementOperationId || !confirmedCommit || reviewing)) return;
    busy.current = true; setSuccess("");
    mutation.mutate({ action, evidenceId, reason: reason.trim(), reconciliation: positions ?? [], replacementOperationId: action === "commit" ? correction.replacementOperationId! : replacementId, replacementVersion: r?.version ?? "" });
  }
  async function loadPositions() {
    setVerified(false); setPositions(null);
    const result = await physical.refetch();
    if (result.isSuccess) setPositions(result.data);
  }
  return <Modal isOpen onClose={() => { if (!mutation.isPending) onClose(); }} closeOnBackdrop={false} ariaLabel={text("Đối soát và bút toán bù", "Correction review and compensation")}>
    <div className="gl-workflow w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-ink-tertiary/20 bg-surface-base p-5 dark:bg-surface-raised space-y-5">
      <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-bold">{text("Hồ sơ bút toán bù", "Correction workbench")}</h2><button autoFocus type="button" disabled={mutation.isPending} onClick={onClose}>{text("Đóng", "Close")}</button></div>
      <p className="break-all font-mono text-xs">{correction.id}</p><CorrectionStatusBadge status={correction.status}/><p>{correction.reason}</p>
      <Feedback error={original.error ?? drafts.error ?? replacement.error ?? physical.error ?? mutation.error} pending={original.isPending || mutation.isPending}/>
      {success && <p role="status" className="text-accent-primary">{success}</p>}
      {original.data && <Panel title={text("Công đoạn gốc bất biến", "Immutable original operation")}><OperationSummary operation={original.data} locationName={locationName}/></Panel>}
      {correction.reconciliation && <Panel title={text("Vị trí đã đối soát", "Recorded physical reconciliation")}><PositionsTable positions={correction.reconciliation} locationName={locationName}/></Panel>}
      {correction.evidenceId && <CorrectionEvidenceDownload id={correction.evidenceId} fileName={correction.evidenceFileName}/>}
      {correction.replacementOperationId && <p>{text("Công đoạn thay thế đã gắn", "Bound replacement")}: {correction.replacementOperationId}</p>}
      {canCommit && open && original.data && <CorrectionReplacementForm original={original.data} saved={id => { setReplacementId(id); setSuccess(text("Đã lưu bản nháp. Bàn giao cho quản lý đối soát trước khi chốt.", "Draft saved. Hand off to a manager for reconciliation before commit.")); }}/ >}
      {canReview && open && original.data && <fieldset disabled={mutation.isPending} className="space-y-4">
        <CorrectionEvidence original={original.data} value={evidenceId} onChange={id => { setEvidenceId(id); setVerified(false); setOriginalCorrect(false); }}/>
        <label>{text("Kết luận đối soát / lý do hủy", "Review findings / cancellation reason")}<textarea rows={3} value={reason} onChange={e => { setReason(e.target.value); setVerified(false); setOriginalCorrect(false); }}/></label>
        <Panel title={text("Duyệt đối soát", "Reconcile correction")}>
          <button type="button" disabled={physical.isFetching} onClick={() => void loadPositions()}>{text("Tải vị trí tồn kho thực tế hiện tại", "Load current physical output positions")}</button>
          <Feedback pending={physical.isFetching}/>
          {positions && <>
            {positions.map((row, i) => <fieldset key={`${row.lotId}:${row.locationId}`} className="rounded-lg border border-ink-tertiary/20 p-3">
              <legend>{original.data?.outputs.find(output => output.id === row.lotId)?.code ?? row.lotId} · <span>{locationName(row.locationId)}</span></legend>
              <label>{text("Khối lượng thực tế đã kiểm tra (kg)", "Verified physical quantity (kg)")}
                <input inputMode="decimal" pattern="[0-9]{1,14}([.][0-9]{1,6})?" required value={row.quantityKg} onChange={e => {
                  setPositions(current => current?.map((position, index) => index === i ? { ...position, quantityKg: e.target.value } : position) ?? null);
                  setVerified(false);
                }} />
              </label>
            </fieldset>)}
            {positions.length === 0 && <p role="alert">{text("Không có tồn đầu ra để đối soát.", "No output stock to reconcile.")}</p>}
          </>}
          <label>{text("Bản nháp thay thế", "Replacement draft")}<select value={replacementId} onChange={e => { setReplacementId(e.target.value); setVerified(false); }}><option value=""/>
            {drafts.data?.filter(d => !d.boundCorrectionId || d.boundCorrectionId === correction.id).map(d => <option key={d.id} value={d.id}>{d.kind} · {d.outputs.map(o => o.code ?? o.stage).join(", ")} · {d.id}</option>)}
          </select></label>
          {drafts.data?.length === 0 && <p>{text("Nhân viên vận hành cần tạo bản nháp thay thế cùng chủ sở hữu và cơ sở.", "An operator must prepare a replacement draft with the same owner and facility.")}</p>}
          {r && <><OperationSummary operation={r} locationName={locationName}/><p className="break-all">{text("Phiên bản đang xem", "Reviewed version")}: {r.version}</p></>}
          {needsConfirmation && <p role="status">{text("Công đoạn thay thế có chênh lệch khác 0. Quản lý cần xác nhận đúng phiên bản và chứng cứ trước khi bàn giao chốt.", "The replacement has nonzero variance. A manager must confirm this version and evidence before commit handoff.")}</p>}
          <label className="!flex-row items-start"><input type="checkbox" checked={verified && reviewedVersion === r?.version} disabled={!positionsValid || !eligible || reviewing} onChange={e => { setVerified(e.target.checked); setReviewedVersion(r?.version ?? ""); }}/>{text("Tôi đã kiểm tra mọi vị trí thực tế, chứng cứ và đúng phiên bản công đoạn thay thế trên.", "I verified all actual positions, evidence and the replacement version shown above.")}</label>
          {needsConfirmation && canConfirm && <button type="button" disabled={!ready} onClick={() => submit("confirm")}>{text("Xác nhận chênh lệch phiên bản thay thế", "Confirm replacement version variance")}</button>}
          <button type="button" disabled={!ready || needsConfirmation} onClick={() => submit("reconcile")}>{text("Duyệt đối soát", "Record reconciliation")}</button>
        </Panel>
        <Panel title={text("Hủy yêu cầu", "Cancel correction")}>
          <label className="!flex-row items-start"><input type="checkbox" checked={originalCorrect} onChange={e => setOriginalCorrect(e.target.checked)}/>{text("Chứng cứ xác nhận bản ghi gốc đúng; yêu cầu điều chỉnh không cần thiết.", "Evidence verifies the original record was correct and requires no correction.")}</label>
          <p>{text("Các hạn chế HOLD và tiếp nhận độc lập tiếp tục có hiệu lực.", "Independent HOLD and receiving restrictions remain effective.")}</p>
          <button type="button" disabled={!evidenceId || !reason.trim() || !originalCorrect || reviewing} onClick={() => submit("cancel")}>{text("Hủy yêu cầu theo chứng cứ", "Cancel with verified evidence")}</button>
        </Panel>
      </fieldset>}
      {canCommit && correction.status === "RECONCILED" && <Panel title={text("Chốt gói bút toán bù", "Commit correction package")}>
        <p>{text("Máy chủ kiểm tra lại tồn thực tế, phiên bản thay thế, HOLD và hạn chế tiếp nhận trước khi ghi đồng thời bút toán bù và công đoạn thay thế.", "The server revalidates physical stock, replacement version, HOLD and receiving restrictions before atomically recording compensation and replacement.")}</p>
        <label className="!flex-row items-start"><input type="checkbox" checked={confirmedCommit} disabled={mutation.isPending} onChange={e => setConfirmedCommit(e.target.checked)}/>{text("Tôi xác nhận chốt gói đã đối soát vào sổ cái.", "I confirm committing the reconciled package to the ledger.")}</label>
        <button type="button" disabled={!confirmedCommit || !correction.replacementOperationId || reviewing} onClick={() => submit("commit")}>{text("Chốt bút toán bù", "Commit compensation")}</button>
      </Panel>}
      {canReview && correction.status === "RECONCILED" && <p role="status">{text("Đã sẵn sàng bàn giao nhân viên vận hành chốt gói.", "Ready for operator handoff and package commit.")}</p>}
      <button type="button" disabled={reviewing} onClick={() => { setVerified(false); setPositions(null); setConfirmedCommit(false); void cache.invalidateQueries({ queryKey: ["ledger-corrections"] }); void original.refetch(); if (replacementId) void replacement.refetch(); void drafts.refetch(); }}>{text("Tải lại hồ sơ và phiên bản", "Reload record and versions")}</button>
    </div>
  </Modal>;
}

function PositionsTable({ positions, locationName }: { positions: PhysicalPosition[]; locationName: (id: string) => string }) {
  const text = useWorkflowText();
  return <div className="overflow-x-auto"><table><caption className="sr-only">{text("Vị trí tồn thực tế", "Physical stock positions")}</caption><thead><tr><th scope="col">{text("Lô", "Lot")}</th><th scope="col">{text("Vị trí", "Location")}</th><th scope="col">kg</th></tr></thead><tbody>{positions.map(p => <tr key={p.lotId + p.locationId}><td>{p.lotId}</td><td>{locationName(p.locationId)}</td><td>{p.quantityKg}</td></tr>)}</tbody></table></div>;
}

function OperationSummary({ operation: o, locationName }: { operation: CorrectionOperation; locationName: (id: string) => string }) {
  const text = useWorkflowText();
  return <div className="space-y-2"><p>{o.kind} · {o.status} · {text("Hao hụt", "Loss")}: {o.declaredLossKg} kg</p>
    <h3 className="font-semibold">{text("Đầu vào", "Inputs")}</h3><ul>{o.inputs.map((l, i) => <li key={i}>{l.lotId} · {locationName(l.locationId)} · {l.quantityKg} kg</li>)}</ul>
    <h3 className="font-semibold">{text("Đầu ra", "Outputs")}</h3><ul>{o.outputs.map(l => <li key={l.id}>{l.code ?? l.id} · {l.stage} · {locationName(l.locationId)} · {l.quantityKg} kg</li>)}</ul>
  </div>;
}
