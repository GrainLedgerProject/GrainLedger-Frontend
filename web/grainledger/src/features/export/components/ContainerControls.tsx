import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { DownloadSimple, UploadSimple } from "@phosphor-icons/react";
import {
  containerExecutionEndpoints,
  type ContainerHandoffCommitRequest,
  type ContainerHandoffDraftRequest,
  type ContainerHoldResponseRequest,
  type ContainerScopeReviewRequest,
  type ContainerWorkflowDetail,
} from "@/api/containerExecution";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { confirmAction } from "@/app/store/feedbackStore";
import { useAuthStore } from "@/app/store/authStore";
import { saveExportFile } from "@/features/export/model/saveExportFile";
import { millPaths } from "@/features/mill/paths";
import { Feedback, Panel } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { useContainerCommand } from "../hooks/useContainerCommand";
import { ContainerCommandFeedback } from "./ContainerCommandFeedback";

type Command =
  | { action: "scope"; body: Omit<ContainerScopeReviewRequest, "operationId"> }
  | { action: "draft"; body: Omit<ContainerHandoffDraftRequest, "operationId"> }
  | { action: "approve"; body: Omit<ContainerHandoffCommitRequest, "operationId"> & { reason: string } }
  | { action: "commit"; body: Omit<ContainerHandoffCommitRequest, "operationId"> }
  | { action: "respond"; body: Omit<ContainerHoldResponseRequest, "operationId"> };

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.includes(",") ? value.split(",")[1] : value);
    };
    reader.readAsDataURL(file);
  });
}

export function ContainerControls({
  workflow,
  facilityId,
  canOperate = false,
  canRespond = false,
  canReview = false,
  refresh,
}: {
  workflow: ContainerWorkflowDetail;
  facilityId?: string;
  canOperate?: boolean;
  canRespond?: boolean;
  canReview?: boolean;
  refresh: () => Promise<void>;
}) {
  const text = useWorkflowText();
  const command = useContainerCommand<Command>(
    (operationId, input) => {
      const id = workflow.containerId;
      switch (input.action) {
        case "scope":
          return containerExecutionEndpoints.reviewScope(id, { operationId, ...input.body });
        case "draft":
          return containerExecutionEndpoints.draftHandoff(id, { operationId, ...input.body });
        case "approve":
          return containerExecutionEndpoints.approveHandoff(id, { operationId, ...input.body });
        case "commit":
          return containerExecutionEndpoints.commitHandoff(id, { operationId, ...input.body });
        case "respond":
          return containerExecutionEndpoints.respondToHold(id, { operationId, ...input.body });
      }
    },
    refresh,
    { persistKey: `container:${workflow.containerId}:controls` },
  );
  const blocked = command.isPending || command.uncertain;

  return (
    <Panel title={text("Bàn giao, duyệt phạm vi và HOLD", "Handoffs, scope reviews and HOLD")}>
      <ContainerControlForms
        key={workflow.version}
        workflow={workflow}
        facilityId={facilityId}
        canOperate={canOperate}
        canRespond={canRespond}
        canReview={canReview}
        blocked={blocked}
        submit={command.submit}
      />
      <ContainerCommandFeedback
        error={command.error}
        uncertain={command.uncertain}
        retry={command.retry}
        success={command.isSuccess}
        isPending={command.isPending}
        restoredPending={command.restoredPending}
        discardPending={command.discardPending}
      />
    </Panel>
  );
}

function ContainerControlForms({
  workflow,
  facilityId,
  canOperate,
  canRespond,
  canReview,
  blocked,
  submit,
}: {
  workflow: ContainerWorkflowDetail;
  facilityId?: string;
  canOperate: boolean;
  canRespond: boolean;
  canReview: boolean;
  blocked: boolean;
  submit: (command: Command) => void;
}) {
  const text = useWorkflowText();
  const user = useAuthStore((s) => s.user);
  const lookups = useQuery({
    queryKey: ["production-lookups"],
    queryFn: async () => (await ledgerEndpoints.getLookups()) as SetupApiResponse,
    enabled: canOperate || canRespond,
  });
  const [proposalId, setProposalId] = useState("");
  const [scope, setScope] = useState<ContainerScopeReviewRequest["scope"]>("OUTPUT_ONLY");
  const [scopeReason, setScopeReason] = useState("");
  const [handoffReason, setHandoffReason] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [kind, setKind] = useState<ContainerHandoffDraftRequest["kind"]>("TRANSFER");
  const [destination, setDestination] = useState("");
  const [quantity, setQuantity] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [outputKg, setOutputKg] = useState("");
  const [loss, setLoss] = useState("0");
  const [holdId, setHoldId] = useState(workflow.holds?.[0]?.id ?? "");
  const [responseAction, setResponseAction] =
    useState<ContainerHoldResponseRequest["responseAction"]>("ACKNOWLEDGE");
  const [evidenceId, setEvidenceId] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [uploadError, setUploadError] = useState<Error | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const downloadEvidence = useMutation({
    mutationFn: async (evId: string) => {
      const blob = await ledgerEndpoints.getEvidence(evId);
      saveExportFile(blob, `container-hold-evidence-${evId}.bin`);
    },
  });

  const effectiveFacilityId =
    facilityId ||
    workflow.proposals?.[0]?.context.facilityId ||
    user?.assignedFacilities?.[0] ||
    lookups.data?.facilities?.[0]?.id ||
    "";

  const available = workflow.status !== "CLOSED" && !workflow.holds?.length;
  const positions = (workflow.proposals ?? []).flatMap((proposal) =>
    proposal.context.outputs
      .filter((output) => /[1-9]/.test(output.remainingKg))
      .map((output) => ({
        ...output,
        proposalId: proposal.id,
        facilityId: proposal.context.facilityId,
      })),
  );
  const positionKey = (position: (typeof positions)[number]) =>
    `${position.proposalId}:${position.lotId}:${position.locationId}`;
  const position = positions.find((item) => positionKey(item) === sourceId);

  function review(decision: ContainerScopeReviewRequest["decision"]) {
    if (proposalId && scopeReason.trim()) {
      submit({
        action: "scope",
        body: {
          version: workflow.version,
          proposalId,
          scope,
          decision,
          reason: scopeReason.trim(),
        },
      });
    }
  }

  function draft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!position || !destination || !occurredAt) return;
    submit({
      action: "draft",
      body: {
        version: workflow.version,
        proposalId: position.proposalId,
        kind,
        content: {
          lotId: position.lotId,
          fromLocationId: position.locationId,
          toLocationId: destination,
          quantityKg: quantity,
          occurredAt: new Date(occurredAt).toISOString(),
          poolRevision: position.poolRevision ?? null,
          ...(kind === "BAGGING" && { equipmentId, outputKg, declaredLossKg: loss }),
        },
      },
    });
  }

  async function commit(handoffId: string, handoffVersion: number) {
    if (
      await confirmAction({
        title: text("Chốt bàn giao", "Commit handoff"),
        description: text(
          "Xác nhận ghi bút toán của bàn giao đã được duyệt.",
          "Confirm posting the approved stock handoff.",
        ),
        confirmLabel: text("Chốt bàn giao", "Commit handoff"),
      })
    ) {
      submit({
        action: "commit",
        body: { version: workflow.version, handoffId, handoffVersion },
      });
    }
  }

  async function handleEvidenceUpload(file: File | null) {
    if (!file) return;
    setUploadError(null);
    const ownerId = workflow.ownerId || user?.organizationId || "";
    const facility = effectiveFacilityId;
    if (!ownerId || !facility) {
      setUploadError(
        new Error(
          text(
            "Thiếu thông tin cơ sở hoặc chủ sở hữu để tải tệp chứng cứ.",
            "Missing owner or facility context to upload evidence.",
          ),
        ),
      );
      return;
    }
    try {
      setUploadingEvidence(true);
      const id = crypto.randomUUID();
      const contentBase64 = await readFileAsBase64(file);
      await ledgerEndpoints.uploadEvidence({
        id,
        ownerId,
        facilityId: facility,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        contentBase64,
      });
      setEvidenceId(id);
    } catch (err) {
      setUploadError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setUploadingEvidence(false);
    }
  }

  const affectedLotId = positions[0]?.lotId ?? workflow.proposals?.[0]?.context.outputs?.[0]?.lotId;

  return (
    <>
      <Feedback error={lookups.error ?? uploadError ?? downloadEvidence.error} />
      {canReview && available && Boolean(workflow.proposals?.length) && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            review("APPROVED");
          }}
        >
          <fieldset disabled={blocked} className="grid gap-3 sm:grid-cols-2">
            <legend>{text("Duyệt phạm vi còn lại", "Review remaining scope")}</legend>
            <label>
              {text("Đề xuất", "Proposal")}
              <select
                required
                value={proposalId}
                onChange={(event) => setProposalId(event.target.value)}
              >
                <option value="">{text("Chọn đề xuất", "Select proposal")}</option>
                {workflow.proposals?.map((proposal) => (
                  <option key={proposal.id} value={proposal.id}>
                    {proposal.context.mode} · {proposal.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {text("Phạm vi", "Scope")}
              <select
                value={scope}
                onChange={(event) =>
                  setScope(
                    event.target.value as ContainerScopeReviewRequest["scope"],
                  )
                }
              >
                <option value="OUTPUT_ONLY">
                  {text("Chỉ phần chưa sản xuất", "Remaining production")}
                </option>
                <option value="CONTAINER_OUTPUT">
                  {text("Cả container", "Container scope")}
                </option>
              </select>
            </label>
            <label>
              {text("Lý do duyệt phạm vi", "Scope review reason")}
              <textarea
                required
                maxLength={1000}
                value={scopeReason}
                onChange={(event) => setScopeReason(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap items-end gap-2">
              <button
                type="submit"
                disabled={!proposalId || !scopeReason.trim()}
              >
                {text("Duyệt phạm vi", "Approve scope")}
              </button>
              <button
                type="button"
                disabled={!proposalId || !scopeReason.trim()}
                onClick={() => review("REJECTED")}
              >
                {text("Từ chối phạm vi", "Reject scope")}
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {canOperate && available && Boolean(positions.length) && (
        <form onSubmit={draft}>
          <fieldset disabled={blocked} className="grid gap-3 sm:grid-cols-2">
            <legend>{text("Nháp bàn giao từ đầu ra đã sản xuất", "Draft handoff from produced outputs")}</legend>
            <label>
              {text("Lô và vị trí nguồn", "Source lot and location")}
              <select
                required
                value={sourceId}
                onChange={(event) => {
                  setSourceId(event.target.value);
                  setDestination("");
                  setEquipmentId("");
                }}
              >
                <option value="">{text("Chọn nguồn", "Select source")}</option>
                {positions.map((item) => (
                  <option key={positionKey(item)} value={positionKey(item)}>
                    {item.lotCode} · {item.locationName} · {item.remainingKg} kg
                  </option>
                ))}
              </select>
            </label>
            <label>
              {text("Loại bàn giao", "Handoff type")}
              <select
                value={kind}
                onChange={(event) =>
                  setKind(
                    event.target.value === "BAGGING" ? "BAGGING" : "TRANSFER",
                  )
                }
              >
                <option value="TRANSFER">{text("Điều chuyển", "Transfer")}</option>
                <option value="BAGGING">{text("Đóng bao", "Bagging")}</option>
              </select>
            </label>
            <label>
              {text("Vị trí đích", "Destination")}
              <select
                required
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
              >
                <option value="">{text("Chọn vị trí", "Select location")}</option>
                {lookups.data?.locations
                  ?.filter(
                    (location) =>
                      location.facilityId === position?.facilityId &&
                      location.id !== position?.locationId &&
                      location.kind !== "ISOLATION" &&
                      (!location.ownerId || location.ownerId === workflow.ownerId),
                  )
                  .map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {text("Khối lượng bàn giao (kg)", "Handoff mass (kg)")}
              <input
                inputMode="decimal"
                pattern="[0-9]{1,14}(\.[0-9]{1,6})?"
                required
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>
            <label>
              {text("Thời điểm thực hiện", "Recorded time")}
              <input
                required
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
              />
            </label>
            {kind === "BAGGING" && (
              <>
                <label>
                  {text("Thiết bị đóng bao", "Bagging equipment")}
                  <select
                    required
                    value={equipmentId}
                    onChange={(event) => setEquipmentId(event.target.value)}
                  >
                    <option value="">{text("Chọn thiết bị", "Select equipment")}</option>
                    {lookups.data?.equipment
                      ?.filter((equipment) => equipment.facilityId === position?.facilityId)
                      .map((equipment) => (
                        <option key={equipment.id} value={equipment.id}>
                          {equipment.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  {text("Khối lượng đóng bao (kg)", "Bagged mass (kg)")}
                  <input
                    inputMode="decimal"
                    required
                    value={outputKg}
                    onChange={(event) => setOutputKg(event.target.value)}
                  />
                </label>
                <label>
                  {text("Hao hụt (kg)", "Declared loss (kg)")}
                  <input
                    inputMode="decimal"
                    required
                    value={loss}
                    onChange={(event) => setLoss(event.target.value)}
                  />
                </label>
              </>
            )}
            <button type="submit" className="self-end">
              {text("Lưu nháp bàn giao", "Save handoff draft")}
            </button>
          </fieldset>
        </form>
      )}

      {available &&
        canReview &&
        workflow.handoffs.some((handoff) => handoff.state === "DRAFT") && (
          <label>
            {text("Lý do duyệt bàn giao", "Handoff approval reason")}
            <textarea
              maxLength={1000}
              value={handoffReason}
              onChange={(event) => setHandoffReason(event.target.value)}
              disabled={blocked}
            />
          </label>
        )}

      <ul className="space-y-2">
        {workflow.handoffs.map((handoff) => (
          <li
            key={handoff.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-tertiary/20 p-3 text-xs"
          >
            <span>
              {handoff.kind} · {handoff.state}
              {handoff.content && ` · ${handoff.content.quantityKg} kg`}
            </span>
            {available && canReview && handoff.state === "DRAFT" && (
              <button
                type="button"
                disabled={blocked || !handoffReason.trim()}
                onClick={() =>
                  submit({
                    action: "approve",
                    body: {
                      version: workflow.version,
                      handoffId: handoff.id,
                      handoffVersion: handoff.version,
                      reason: handoffReason.trim(),
                    },
                  })
                }
              >
                {text("Duyệt bàn giao", "Approve handoff")}
              </button>
            )}
            {available && canOperate && handoff.state === "APPROVED" && (
              <button
                type="button"
                disabled={blocked}
                onClick={() => void commit(handoff.id, handoff.version)}
              >
                {text("Chốt bàn giao", "Commit handoff")}
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* HOLD Responses History */}
      {Boolean(workflow.holdResponses?.length) && (
        <section className="space-y-2 rounded-xl border border-ink-tertiary/20 bg-surface-raised/40 p-3.5 text-xs">
          <h3 className="font-semibold text-ink-primary">
            {text("Lịch sử phản hồi & xử lý HOLD container", "Container HOLD response history")}
          </h3>
          <ul className="divide-y divide-ink-tertiary/15">
            {workflow.holdResponses!.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold text-ink-primary">
                    {entry.action} · {entry.reason}
                  </p>
                  <p className="font-mono text-[11px] text-ink-secondary">
                    HOLD: {entry.holdId} ·{" "}
                    {new Date(entry.recordedAt).toLocaleString()}
                  </p>
                </div>
                {entry.evidenceId && (
                  <button
                    type="button"
                    disabled={downloadEvidence.isPending}
                    onClick={() => downloadEvidence.mutate(entry.evidenceId)}
                    className="inline-flex items-center gap-1 rounded-lg border border-ink-tertiary/20 bg-surface-base px-2.5 py-1 text-[11px] font-semibold text-accent-primary hover:bg-surface-raised"
                  >
                    <DownloadSimple size={13} />
                    <span>{text("Tải chứng cứ", "Download evidence")}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {canRespond && Boolean(workflow.holds?.length) && (
        <form
          className="space-y-3 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg/20 p-4 text-xs"
          onSubmit={(event) => {
            event.preventDefault();
            if (holdId && effectiveFacilityId && evidenceId.trim() && holdReason.trim()) {
              submit({
                action: "respond",
                body: {
                  version: workflow.version,
                  facilityId: effectiveFacilityId,
                  holdId,
                  responseAction,
                  evidenceId: evidenceId.trim(),
                  reason: holdReason.trim(),
                },
              });
            }
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-accent-danger">
              {text("Phản hồi HOLD", "Respond to HOLD")}
            </span>
            <Link
              to={`${millPaths.stockTransfer}?${new URLSearchParams({
                ...(holdId ? { holdId } : {}),
                ...(affectedLotId ? { lotId: affectedLotId } : {}),
              })}`}
              className="font-semibold text-accent-primary hover:underline"
            >
              {text("Chuyển kho cách ly (ISOLATION) lô bị HOLD →", "Transfer HOLD lot to ISOLATION →")}
            </Link>
          </div>
          <fieldset
            disabled={blocked || uploadingEvidence}
            className="grid gap-3 sm:grid-cols-2"
          >
            <legend className="sr-only">{text("Phản hồi HOLD", "Respond to HOLD")}</legend>
            <label>
              {text("Lệnh HOLD", "HOLD order")}
              <select
                required
                value={holdId}
                onChange={(event) => setHoldId(event.target.value)}
              >
                <option value="">{text("Chọn lệnh HOLD", "Select HOLD order")}</option>
                {workflow.holds?.map((hold) => (
                  <option key={hold.id} value={hold.id}>
                    {hold.reason}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {text("Phản hồi", "Response")}
              <select
                value={responseAction}
                onChange={(event) =>
                  setResponseAction(
                    event.target.value === "RECORD_RESPONSE"
                      ? "RECORD_RESPONSE"
                      : "ACKNOWLEDGE",
                  )
                }
              >
                <option value="ACKNOWLEDGE">
                  {text("Xác nhận đã nhận", "Acknowledge")}
                </option>
                <option value="RECORD_RESPONSE">
                  {text("Ghi nhận xử lý", "Record response")}
                </option>
              </select>
            </label>

            <label className="sm:col-span-2">
              <span className="flex items-center gap-1.5">
                <UploadSimple size={14} className="text-accent-primary" />
                {text(
                  "Tải tệp chứng cứ từ máy (tự tạo mã bằng chứng)",
                  "Upload evidence file (auto-fills evidence ID)",
                )}
              </span>
              <input
                type="file"
                onChange={(e) => void handleEvidenceUpload(e.target.files?.[0] ?? null)}
              />
            </label>

            <label>
              {text("Mã bằng chứng đã tải lên", "Uploaded evidence ID")}
              <input
                required
                pattern="[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"
                value={evidenceId}
                onChange={(event) => setEvidenceId(event.target.value)}
              />
            </label>
            <label>
              {text("Lý do phản hồi", "Response reason")}
              <textarea
                required
                maxLength={1000}
                value={holdReason}
                onChange={(event) => setHoldReason(event.target.value)}
              />
            </label>
            <button type="submit" disabled={!effectiveFacilityId || uploadingEvidence}>
              {uploadingEvidence
                ? text("Đang tải chứng cứ...", "Uploading evidence...")
                : text("Ghi phản hồi", "Save response")}
            </button>
          </fieldset>
        </form>
      )}
    </>
  );
}
