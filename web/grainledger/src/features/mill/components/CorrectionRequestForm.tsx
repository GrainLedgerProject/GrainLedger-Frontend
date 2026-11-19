import { ledgerEndpoints, type CreateCorrectionRequest } from "@/api/ledger";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Modal } from "@/shared/ui/Modal";
import { Info, PencilSimpleLine, WarningCircle, X } from "@phosphor-icons/react";
import { toast } from "@/app/store/feedbackStore";
import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";

interface OperationOption {
  id: string;
  kind?: string;
  status?: string;
  occurredAt?: string;
}

const OPERATION_LABELS: Record<string, string> = {
  DRYING: "Sấy lúa tươi (Drying)",
  MILLING: "Xay xát gạo (Milling)",
  BLENDING: "Phối trộn cơ học (Blending)",
  BAGGING: "Đóng bao & Container (Bagging)",
  TRANSFER: "Điều chuyển kho (Transfer)",
};

export function CorrectionRequestForm({
  onClose,
  onCreated,
}: { onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation();
  const inFlight = useRef(false);
  const command = useRef<CreateCorrectionRequest | null>(null);
  const [operations, setOperations] = useState<OperationOption[]>([]);
  const [loadingOps, setLoadingOps] = useState(true);
  const [createOperationId, setCreateOperationId] = useState("");
  const [createReason, setCreateReason] = useState("");
  const [createManualMode, setCreateManualMode] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createModalError, setCreateModalError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadOperations() {
      try {
        const res = (await ledgerEndpoints.getOperations()) as unknown;
        const items = Array.isArray(res)
          ? res
          : res && typeof res === "object" && "items" in res
            ? (res as { items: unknown }).items
            : [];
        const committedOps = Array.isArray(items)
          ? items.filter((item): item is OperationOption =>
              Boolean(
                item &&
                typeof item === "object" &&
                typeof (item as OperationOption).id === "string" &&
                (item as OperationOption).status === "COMMITTED",
              ),
            )
          : [];
        if (active) setOperations(committedOps);
      } catch (err: unknown) {
        if (active) setCreateModalError(err instanceof Error ? err.message : t("mill.corrections.loadOperationsError", "Không thể tải danh sách công đoạn."));
      } finally {
        if (active) setLoadingOps(false);
      }
    }
    void loadOperations();
    return () => { active = false; };
  }, [t]);
  const handleCreateCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    const trimmedOpId = createOperationId.trim();
    const trimmedReason = createReason.trim();

    if (!trimmedOpId) {
      setCreateModalError(
        t(
          "mill.corrections.errSelectOp",
          "Vui lòng chọn hoặc nhập mã công đoạn cần sửa.",
        ),
      );
      return;
    }
    if (!trimmedReason || trimmedReason.length < 5) {
      setCreateModalError(
        t(
          "mill.corrections.errReasonLength",
          "Vui lòng nhập lý do sửa đổi rõ ràng (tối thiểu 5 ký tự).",
        ),
      );
      return;
    }

    try {
      inFlight.current = true;
      setSubmittingCreate(true);
      setCreateModalError(null);
      if (command.current?.operationId !== trimmedOpId || command.current.reason !== trimmedReason) {
        command.current = { id: crypto.randomUUID(), operationId: trimmedOpId, reason: trimmedReason };
      }
      await ledgerEndpoints.createCorrection(command.current);
      toast.success(
        t(
          "mill.corrections.createSuccess",
          "Đã gửi yêu cầu sửa công đoạn thành công. Chờ Quản lý đối soát phê duyệt.",
        ),
      );
      onCreated();
    } catch (err: unknown) {
      setCreateModalError(
        err instanceof Error ? err.message : "Lỗi khi gửi yêu cầu sửa đổi.",
      );
    } finally {
      inFlight.current = false;
      setSubmittingCreate(false);
    }
  };

  return (
      <Modal
        isOpen
        onClose={() => !submittingCreate && onClose()}
        ariaLabel={t("mill.corrections.modalTitle", "Yêu cầu sửa công đoạn")}
      >
        <div className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-xl flex-col overflow-hidden rounded-2xl border border-ink-tertiary/20 bg-surface-base shadow-2xl animate-ledger-in">
          {/* Header */}
          <header className="flex shrink-0 items-center justify-between border-b border-ink-tertiary/15 px-6 py-4 bg-surface-raised">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                <PencilSimpleLine size={20} weight="bold" />
              </div>
              <div>
                <h2 className="text-base font-display font-bold text-ink-primary">
                  {t("mill.corrections.modalTitle", "Yêu cầu sửa công đoạn")}
                </h2>
                <p className="text-xs text-ink-secondary">
                  {t(
                    "mill.corrections.modalSubtitle",
                    "Gửi đề xuất sửa đổi công đoạn đã chốt sổ cái để đối soát",
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onClose()}
              disabled={submittingCreate}
              aria-label={t("common.close", "Đóng")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-surface-base transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </header>

          <form
            onSubmit={handleCreateCorrection}
            className="p-6 space-y-4 overflow-y-auto text-xs"
          >
            {/* Note callout */}
            <div className="rounded-xl border border-accent-primary/20 bg-accent-primary/5 p-3.5 flex items-start gap-2.5">
              <Info
                size={18}
                weight="fill"
                className="text-accent-primary shrink-0 mt-0.5"
              />
              <div className="text-xs leading-relaxed text-ink-secondary space-y-1">
                <p className="font-semibold text-ink-primary">
                  {t(
                    "mill.corrections.immutabilityNoteTitle",
                    "Quy tắc bất biến sổ cái ISO 22095",
                  )}
                </p>
                <p>
                  {t(
                    "mill.corrections.immutabilityNoteDesc",
                    "Các công đoạn đã chốt (COMMITTED) không thể xóa hoặc sửa đè. Yêu cầu này sẽ mở phiên đối soát và tạo bút toán điều chỉnh bù (Reconciliation) giữ nguyên tính toàn vẹn kiểm toán.",
                  )}
                </p>
              </div>
            </div>

            {/* Error alert */}
            {createModalError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger flex items-center gap-2 text-xs"
              >
                <WarningCircle size={16} weight="fill" className="shrink-0" />
                <span>{createModalError}</span>
              </div>
            )}

            {/* Operation selection field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={createManualMode || operations.length === 0 ? "correction-operation-input" : "correction-operation-select"}
                  className="font-semibold text-ink-primary"
                >
                  {t(
                    "mill.corrections.opSelectLabel",
                    "Công đoạn đã chốt (COMMITTED) *",
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => setCreateManualMode(!createManualMode)}
                  className="text-xs font-medium text-accent-primary hover:underline"
                >
                  {createManualMode
                    ? t("mill.corrections.pickFromList", "Chọn từ danh sách")
                    : t("mill.corrections.enterManually", "Nhập mã thủ công")}
                </button>
              </div>

              {loadingOps ? (
                <div className="py-3 flex items-center justify-center gap-2 text-ink-tertiary">
                  <GrainLoader
                    label={t(
                      "mill.corrections.loadingOps",
                      "Đang tải công đoạn...",
                    )}
                  />
                </div>
              ) : createManualMode || operations.length === 0 ? (
                <div>
                  <input
                    id="correction-operation-input"
                    type="text"
                    required
                    value={createOperationId}
                    onChange={(e) => setCreateOperationId(e.target.value)}
                    placeholder="VD: 550e8400-e29b-41d4-a716-446655440000"
                    className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-ink-tertiary/20 text-ink-primary font-mono text-xs focus:border-accent-primary focus:outline-none"
                  />
                  {operations.length === 0 && !loadingOps && (
                    <p className="mt-1 text-xs text-ink-tertiary">
                      {t(
                        "mill.corrections.noCommittedOps",
                        "Chưa tìm thấy công đoạn đã chốt trong danh sách tải gần nhất. Bạn có thể dán trực tiếp mã công đoạn.",
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <select
                    id="correction-operation-select"
                    required
                    value={createOperationId}
                    onChange={(e) => setCreateOperationId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-ink-tertiary/20 text-ink-primary text-xs focus:border-accent-primary focus:outline-none font-mono"
                  >
                    <option value="">
                      {t(
                        "mill.corrections.chooseOp",
                        "-- Chọn công đoạn cần sửa --",
                      )}
                    </option>
                    {operations.map((op) => {
                      const label = op.kind
                        ? OPERATION_LABELS[op.kind] || op.kind
                        : "Công đoạn";
                      const dateStr = op.occurredAt
                        ? ` (${new Date(op.occurredAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })})`
                        : "";
                      return (
                        <option key={op.id} value={op.id}>
                          {label} · {op.id.slice(0, 8)}...{dateStr}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* Reason textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="correction-reason-input"
                  className="font-semibold text-ink-primary"
                >
                  {t(
                    "mill.corrections.reasonLabel",
                    "Lý do sai sót & đề xuất điều chỉnh *",
                  )}
                </label>
                <span className="text-xs text-ink-tertiary">
                  {createReason.trim().length} {t("common.chars", "ký tự")}
                </span>
              </div>
              <textarea
                id="correction-reason-input"
                required
                rows={4}
                value={createReason}
                onChange={(e) => setCreateReason(e.target.value)}
                placeholder={t(
                  "mill.corrections.reasonPlaceholder",
                  "Ví dụ: Cân đầu vào bị lệch 150kg do cảm biến loadcell chưa hiệu chuẩn; Đổi lô xuất trấu cám tương ứng; Cần ghi bù bút toán giảm hao hụt...",
                )}
                className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-ink-tertiary/20 text-ink-primary text-xs focus:border-accent-primary focus:outline-none resize-none"
              />
              <p className="text-xs text-ink-tertiary">
                {t(
                  "mill.corrections.reasonHint",
                  "Nêu rõ các số liệu chênh lệch, bằng chứng cân đo hoặc biên bản kỹ thuật kèm theo.",
                )}
              </p>
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => onClose()}
                disabled={submittingCreate}
                className="px-4 py-2 rounded-lg border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary hover:bg-surface-raised font-semibold transition-colors disabled:opacity-50"
              >
                {t("common.cancel", "Huỷ")}
              </button>
              <button
                type="submit"
                disabled={
                  submittingCreate ||
                  !createOperationId.trim() ||
                  createReason.trim().length < 5
                }
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-50 shadow-xs"
              >
                {submittingCreate ? (
                  <span>{t("common.submitting", "Đang gửi...")}</span>
                ) : (
                  <>
                    <PencilSimpleLine size={15} weight="bold" />
                    <span>
                      {t("mill.corrections.submitRequest", "Gửi yêu cầu sửa")}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>
  );
}
