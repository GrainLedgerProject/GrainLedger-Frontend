import { useId, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldWarning, UploadSimple } from "@phosphor-icons/react";
import { containerExecutionEndpoints } from "@/api/containerExecution";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { useCommand } from "@/shared/hooks/useCommand";
import { Modal } from "@/shared/ui/Modal";
import { Feedback } from "@/shared/ui/Workflow";
import { ContainerCommandFeedback } from "@/features/export/components/ContainerCommandFeedback";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

export interface HoldSelectableLot {
  id: string;
  code: string;
  ownerId?: string | null;
  facilityId?: string | null;
  stage?: string;
}

interface PlaceHoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  traceId?: string;
  initialLot?: HoldSelectableLot | null;
  selectableLots?: HoldSelectableLot[];
  selectableContainers?: { containerId: string; code: string }[];
  containerContext?: {
    containerId: string;
    containerCode: string;
  } | null;
}

interface LotOption {
  id: string;
  code: string;
  ownerId?: string | null;
  positions?: { facilityId?: string | null }[];
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      resolve(dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl);
    };
    reader.readAsDataURL(file);
  });
}

const EMPTY_LOTS: HoldSelectableLot[] = [];
const EMPTY_CONTAINERS: { containerId: string; code: string }[] = [];

export function PlaceHoldModal(props: PlaceHoldModalProps) {
  if (!props.isOpen) return null;
  const modalKey = `${props.initialLot?.id ?? ""}:${props.containerContext?.containerId ?? ""}:${props.traceId ?? ""}`;
  return <PlaceHoldModalContent key={modalKey} {...props} />;
}

function PlaceHoldModalContent({
  isOpen,
  onClose,
  onSuccess,
  traceId,
  initialLot,
  selectableLots = EMPTY_LOTS,
  selectableContainers = EMPTY_CONTAINERS,
  containerContext,
}: PlaceHoldModalProps) {
  const text = useWorkflowText();
  const uid = useId();
  const cache = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canIssueHold =
    user?.role === "CUSTOMER_MANAGER" &&
    user.permissions.includes("holds.manage");

  const availableContainers = useMemo(() => {
    const map = new Map<string, { containerId: string; code: string }>();
    if (containerContext) {
      map.set(containerContext.containerId, {
        containerId: containerContext.containerId,
        code: containerContext.containerCode,
      });
    }
    for (const c of selectableContainers) {
      if (!map.has(c.containerId)) map.set(c.containerId, c);
    }
    return Array.from(map.values());
  }, [containerContext, selectableContainers]);

  const canChooseContainer = canIssueHold && availableContainers.length > 0;
  const [targetKind, setTargetKind] = useState<"lot" | "container">(
    containerContext && !initialLot ? "container" : "lot",
  );
  const [selectedContainerId, setSelectedContainerId] = useState(
    containerContext?.containerId ?? selectableContainers[0]?.containerId ?? "",
  );
  const [lotSearch, setLotSearch] = useState("");
  const [selectedLotId, setSelectedLotId] = useState(
    initialLot?.id ?? selectableLots[0]?.id ?? "",
  );
  const [reason, setReason] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const uploadedEvidenceRef = useRef<{ file: File; id: string } | null>(null);
  const [manualEvidenceId, setManualEvidenceId] = useState("");
  const [facilityOverride, setFacilityOverride] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const setup = useQuery({
    queryKey: ["hold-modal-setup"],
    queryFn: () => ledgerEndpoints.getLookups() as Promise<SetupApiResponse>,
    enabled: isOpen,
  });

  const fetchedLots = useQuery({
    queryKey: ["hold-modal-lots", lotSearch],
    queryFn: async () => {
      const res = (await ledgerEndpoints.getLots({
        search: lotSearch || undefined,
        pageSize: 25,
      })) as { items?: LotOption[] };
      return res.items ?? [];
    },
    enabled: isOpen && targetKind === "lot" && canIssueHold,
  });

  const activeContainerId =
    containerContext?.containerId ||
    (targetKind === "container" ? selectedContainerId : "");

  const containerDetail = useQuery({
    queryKey: ["hold-modal-container", activeContainerId],
    queryFn: () => containerExecutionEndpoints.getDetail(activeContainerId),
    enabled: isOpen && Boolean(activeContainerId),
  });

  const mergedLots = useMemo(() => {
    const map = new Map<string, HoldSelectableLot>();
    if (initialLot) map.set(initialLot.id, initialLot);
    for (const item of selectableLots) map.set(item.id, item);
    for (const item of fetchedLots.data ?? []) {
      if (!map.has(item.id)) {
        map.set(item.id, {
          id: item.id,
          code: item.code,
          ownerId: item.ownerId,
          facilityId: item.positions?.[0]?.facilityId ?? null,
        });
      }
    }
    return Array.from(map.values());
  }, [initialLot, selectableLots, fetchedLots.data]);

  const chosenLot = mergedLots.find((item) => item.id === selectedLotId);

  const lotCommand = useCommand<{
    lotId: string;
    reason: string;
    evidenceId?: string;
    traceId?: string;
  }>(
    (id, input) => ledgerEndpoints.createHold({ id, ...input }),
    async () => {
      setReason("");
      setEvidenceFile(null);
      setManualEvidenceId("");
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["ledger-trace"] }),
        cache.invalidateQueries({ queryKey: ["actual-container-trace"] }),
      ]);
      await onSuccess?.();
      onClose();
    },
    { persistKey: `hold-create:${selectedLotId || "select"}` },
  );

  const containerCommand = useCommand<{
    containerId: string;
    version: number;
    reason: string;
    evidenceId?: string;
  }>(
    (operationId, input) =>
      containerExecutionEndpoints.placeHold(input.containerId, {
        operationId,
        version: input.version,
        reason: input.reason,
        ...(input.evidenceId ? { evidenceId: input.evidenceId } : {}),
      }),
    async () => {
      setReason("");
      setEvidenceFile(null);
      setManualEvidenceId("");
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["actual-container-trace"] }),
        cache.invalidateQueries({ queryKey: ["ledger-trace"] }),
        cache.invalidateQueries({
          queryKey: ["container-execution", activeContainerId],
        }),
        cache.invalidateQueries({
          queryKey: ["container-workflow", activeContainerId],
        }),
      ]);
      await onSuccess?.();
      onClose();
    },
    {
      persistKey: activeContainerId
        ? `container:${activeContainerId}:trace-hold`
        : undefined,
    },
  );

  async function resolveEvidenceId(): Promise<string | undefined> {
    if (manualEvidenceId.trim()) {
      const cleaned = manualEvidenceId.trim();
      if (
        !/^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/.test(cleaned)
      ) {
        throw new Error(
          text(
            "Mã chứng cứ phải là UUID hợp lệ.",
            "Evidence ID must be a valid UUID.",
          ),
        );
      }
      return cleaned;
    }
    if (!evidenceFile) return undefined;
    if (uploadedEvidenceRef.current?.file === evidenceFile) {
      return uploadedEvidenceRef.current.id;
    }
    const ownerId =
      (targetKind === "container"
        ? containerDetail.data?.container.companyId
        : chosenLot?.ownerId) ??
      containerDetail.data?.container.companyId ??
      chosenLot?.ownerId ??
      setup.data?.owners?.[0]?.id ??
      user?.organizationId ??
      "";
    const facilityId =
      facilityOverride ||
      (targetKind === "container"
        ? containerDetail.data?.container.facilityId
        : chosenLot?.facilityId) ||
      containerDetail.data?.container.facilityId ||
      chosenLot?.facilityId ||
      setup.data?.facilities?.[0]?.id ||
      "";
    if (!ownerId || !facilityId) {
      throw new Error(
        text(
          "Chọn cơ sở lưu giữ để tải tệp chứng cứ lên sổ cái.",
          "Select a facility before uploading evidence to the ledger.",
        ),
      );
    }
    const evidenceId = crypto.randomUUID();
    const contentBase64 = await readFileAsBase64(evidenceFile);
    await ledgerEndpoints.uploadEvidence({
      id: evidenceId,
      ownerId,
      facilityId,
      fileName: evidenceFile.name,
      contentType: evidenceFile.type || "application/octet-stream",
      contentBase64,
    });
    uploadedEvidenceRef.current = { file: evidenceFile, id: evidenceId };
    return evidenceId;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!reason.trim()) return;

    try {
      setUploading(true);
      const evidenceId = await resolveEvidenceId();
      if (targetKind === "container") {
        if (!activeContainerId) {
          throw new Error(
            text(
              "Chọn container trước khi đặt lệnh HOLD.",
              "Select a container before placing a HOLD.",
            ),
          );
        }
        const refreshed = await containerDetail.refetch();
        const detail = refreshed.data ?? containerDetail.data;
        if (!detail) {
          throw new Error(
            text(
              "Không tải được phiên bản container mới nhất, vui lòng thử lại.",
              "Could not load latest container version; please try again.",
            ),
          );
        }
        const { version } = detail.container;
        containerCommand.submit({
          containerId: activeContainerId,
          version,
          reason: reason.trim(),
          ...(evidenceId ? { evidenceId } : {}),
        });
        return;
      }

      if (!selectedLotId) {
        throw new Error(
          text("Vui lòng chọn lô hàng hợp lệ.", "Select a valid lot."),
        );
      }
      lotCommand.submit({
        lotId: selectedLotId,
        reason: reason.trim(),
        ...(evidenceId ? { evidenceId } : {}),
        ...(traceId ? { traceId } : {}),
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  const activeCmd = targetKind === "container" ? containerCommand : lotCommand;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdrop={!uploading && !activeCmd.isPending}
      ariaLabel={text("Đặt lệnh HOLD kèm chứng cứ", "Place HOLD with evidence")}
    >
      <div className="w-[calc(100vw-2rem)] max-w-xl rounded-2xl border border-ink-tertiary/20 bg-surface-base p-6 text-ink-primary shadow-xl dark:bg-surface-raised space-y-4">
        <div className="flex items-start gap-3 border-b border-ink-tertiary/15 pb-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-functional-rejected-bg text-accent-danger">
            <ShieldWarning size={22} weight="fill" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold">
              {text("Đặt lệnh HOLD kèm chứng cứ", "Place HOLD with evidence")}
            </h2>
            <p className="text-xs text-ink-secondary">
              {traceId
                ? `${text("Mã truy vết tham chiếu", "Reference Trace ID")}: ${traceId}`
                : text(
                    "Ghi nhận phong tỏa trên lô hàng hoặc container (bao gồm sau niêm phong).",
                    "Issue a HOLD on the affected lot or container (including post-closure).",
                  )}
            </p>
          </div>
        </div>

        {!canIssueHold ? (
          <p className="text-xs text-accent-danger">
            {text(
              "Tài khoản hiện tại không có quyền đặt lệnh HOLD.",
              "Your current role does not have permission to place HOLD orders.",
            )}
          </p>
        ) : (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="space-y-4 text-xs"
          >
            {canChooseContainer && (
              <div className="flex gap-2 rounded-xl bg-surface-raised p-1">
                <button
                  type="button"
                  onClick={() => setTargetKind("lot")}
                  className={`flex-1 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                    targetKind === "lot"
                      ? "bg-surface-base text-accent-primary shadow-xs"
                      : "text-ink-secondary"
                  }`}
                >
                  {text("HOLD lô bị ảnh hưởng", "HOLD affected lot")}
                </button>
                <button
                  type="button"
                  onClick={() => setTargetKind("container")}
                  className={`flex-1 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                    targetKind === "container"
                      ? "bg-surface-base text-accent-primary shadow-xs"
                      : "text-ink-secondary"
                  }`}
                >
                  {text("HOLD container", "HOLD container")}
                </button>
              </div>
            )}

            {targetKind === "lot" ? (
              <div className="space-y-2.5">
                {!selectableLots.length && (
                  <label className="block space-y-1">
                    <span className="font-semibold text-ink-secondary">
                      {text("Tìm mã lô", "Search lot code")}
                    </span>
                    <input
                      type="text"
                      value={lotSearch}
                      onChange={(e) => setLotSearch(e.target.value)}
                      placeholder={text(
                        "Nhập mã lô để lọc...",
                        "Filter by lot code...",
                      )}
                      className="w-full rounded-lg border border-ink-tertiary/20 bg-surface-raised px-3 py-2 focus:border-accent-primary focus:outline-none"
                    />
                  </label>
                )}

                <label htmlFor={`${uid}-lot`} className="block space-y-1">
                  <span className="font-semibold text-ink-secondary">
                    {text("Lô áp dụng lệnh HOLD", "Target lot")} *
                  </span>
                  <select
                    id={`${uid}-lot`}
                    required
                    value={selectedLotId}
                    onChange={(e) => setSelectedLotId(e.target.value)}
                    className="w-full rounded-lg border border-ink-tertiary/20 bg-surface-raised px-3 py-2 font-mono focus:border-accent-primary focus:outline-none"
                  >
                    <option value="">
                      {text("Chọn lô...", "Select a lot...")}
                    </option>
                    {mergedLots.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code}
                        {item.stage ? ` (${item.stage})` : ""} ·{" "}
                        {item.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <div className="rounded-xl border border-ink-tertiary/20 bg-surface-raised/50 p-3 space-y-2">
                {availableContainers.length > 1 && !containerContext ? (
                  <label
                    htmlFor={`${uid}-container`}
                    className="block space-y-1"
                  >
                    <span className="font-semibold text-ink-secondary">
                      {text("Container áp dụng HOLD", "Target container")} *
                    </span>
                    <select
                      id={`${uid}-container`}
                      required
                      value={selectedContainerId}
                      onChange={(e) => setSelectedContainerId(e.target.value)}
                      className="w-full rounded-lg border border-ink-tertiary/20 bg-surface-base px-3 py-2 font-mono focus:border-accent-primary focus:outline-none"
                    >
                      {availableContainers.map((c) => (
                        <option key={c.containerId} value={c.containerId}>
                          {c.code} · {c.containerId.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="font-semibold text-ink-primary">
                    Container:{" "}
                    <span className="font-mono">
                      {availableContainers.find(
                        (c) => c.containerId === activeContainerId,
                      )?.code ?? activeContainerId}
                    </span>
                  </p>
                )}
                {containerDetail.data && (
                  <p className="text-ink-secondary">
                    {text("Trạng thái", "Status")}:{" "}
                    {containerDetail.data.container.status} · v
                    {containerDetail.data.container.version}
                    {containerDetail.data.container.status === "CLOSED" && (
                      <span className="ml-2 text-accent-danger font-medium">
                        {text(
                          "(Hỗ trợ đặt HOLD kèm chứng cứ sau CLOSE)",
                          "(HOLD with evidence supported after CLOSE)",
                        )}
                      </span>
                    )}
                  </p>
                )}
                {containerDetail.error && (
                  <Feedback error={containerDetail.error} />
                )}
              </div>
            )}

            <label htmlFor={`${uid}-reason`} className="block space-y-1">
              <span className="font-semibold text-ink-secondary">
                {text("Lý do & căn cứ phong tỏa", "Reason & findings")} *
              </span>
              <textarea
                id={`${uid}-reason`}
                required
                rows={3}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={text(
                  "Ví dụ: Phát hiện vượt ngưỡng MRL từ kết quả kiểm nghiệm hoặc truy vết lô nguồn...",
                  "e.g. Trace link to confirmed MRL exceedance or containment hold...",
                )}
                className="w-full rounded-lg border border-ink-tertiary/20 bg-surface-raised px-3 py-2 focus:border-accent-primary focus:outline-none"
              />
            </label>

            <div className="rounded-xl border border-dashed border-ink-tertiary/30 bg-surface-raised/40 p-3 space-y-2.5">
              <p className="font-semibold text-ink-secondary flex items-center gap-1.5">
                <UploadSimple size={15} className="text-accent-primary" />
                <span>
                  {text(
                    "Đính kèm tệp chứng cứ (tùy chọn)",
                    "Attach evidence file (optional)",
                  )}
                </span>
              </p>
              <input
                type="file"
                aria-label={text("Tệp chứng cứ", "Evidence file")}
                onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
                className="w-full text-[11px]"
              />
              {evidenceFile &&
              !(targetKind === "container"
                ? containerDetail.data?.container.facilityId
                : chosenLot?.facilityId) &&
              setup.data?.facilities?.length ? (
                <label className="block space-y-1">
                  <span className="text-[11px] text-ink-secondary">
                    {text("Cơ sở lưu chứng cứ", "Evidence facility")}
                  </span>
                  <select
                    value={
                      facilityOverride || setup.data.facilities[0]?.id || ""
                    }
                    onChange={(e) => setFacilityOverride(e.target.value)}
                    className="w-full rounded-lg border border-ink-tertiary/20 bg-surface-base px-2.5 py-1.5 text-[11px]"
                  >
                    {setup.data.facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="block space-y-1">
                <span className="text-[11px] text-ink-secondary">
                  {text(
                    "Hoặc nhập mã chứng cứ đã lưu (UUID)",
                    "Or existing evidence ID (UUID)",
                  )}
                </span>
                <input
                  type="text"
                  value={manualEvidenceId}
                  onChange={(e) => setManualEvidenceId(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  className="w-full rounded-lg border border-ink-tertiary/20 bg-surface-base px-2.5 py-1.5 font-mono text-[11px]"
                />
              </label>
            </div>

            {localError && <Feedback error={new Error(localError)} />}
            <ContainerCommandFeedback
              error={activeCmd.error}
              uncertain={activeCmd.uncertain}
              retry={activeCmd.retry}
              success={activeCmd.isSuccess}
              isPending={activeCmd.isPending}
              restoredPending={activeCmd.restoredPending}
              discardPending={activeCmd.discardPending}
            />

            <div className="flex justify-end gap-2 border-t border-ink-tertiary/15 pt-3">
              <button
                type="button"
                disabled={uploading || activeCmd.isPending}
                onClick={onClose}
                className="rounded-xl border border-ink-tertiary/25 px-4 py-2 font-semibold text-ink-secondary hover:bg-surface-raised"
              >
                {text("Đóng", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={
                  uploading ||
                  activeCmd.isPending ||
                  activeCmd.uncertain ||
                  !reason.trim() ||
                  (targetKind === "lot" && !selectedLotId) ||
                  (targetKind === "container" && !containerDetail.data)
                }
                className="rounded-xl bg-accent-danger px-4 py-2 font-semibold text-white hover:bg-accent-danger/90 disabled:opacity-50"
              >
                {uploading || activeCmd.isPending
                  ? text("Đang xử lý...", "Submitting...")
                  : text("Xác nhận đặt HOLD", "Confirm HOLD")}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
