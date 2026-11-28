import { ledgerEndpoints, type CreateCorrectionRequest } from "@/api/ledger";
import { collectPages, type ApiPage } from "@/api/query";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Modal } from "@/shared/ui/Modal";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import {
  Info,
  PencilSimpleLine,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { toast } from "@/app/store/feedbackStore";
import React, { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export interface CommittedOperationOption {
  id: string;
  kind?: string;
  status?: string;
  occurredAt?: string;
}

const OPERATION_LABELS: Record<string, string> = {
  DRYING: "Sấy lúa tươi (Drying)",
  MILLING: "Xay xát gạo (Milling)",
  MERGE: "Gộp lô (Merge)",
  BLENDING: "Phối trộn cơ học (Blending)",
  BAGGING: "Đóng bao & Container (Bagging)",
  TRANSFER: "Điều chuyển kho (Transfer)",
};

export function CorrectionRequestForm({
  onClose,
  onCreated,
  variant = "modal",
  operationsData,
}: {
  onClose: () => void;
  onCreated: () => void;
  variant?: "modal" | "inline";
  operationsData?: {
    items: CommittedOperationOption[];
    loading: boolean;
    error: string | null;
  };
}) {
  const { t, i18n } = useTranslation();
  const text = useWorkflowText();
  const formId = useId();
  const inFlight = useRef(false);
  const command = useRef<CreateCorrectionRequest | null>(null);
  const [fetchedOperations, setFetchedOperations] = useState<CommittedOperationOption[]>([]);
  const [loadingFetchedOps, setLoadingFetchedOps] = useState(!operationsData);
  const [fetchedOpsError, setFetchedOpsError] = useState<string | null>(null);
  const [createOperationId, setCreateOperationId] = useState("");
  const [createReason, setCreateReason] = useState("");
  const [createManualMode, setCreateManualMode] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (operationsData) return;
    let active = true;
    async function loadOperations() {
      try {
        const items = await collectPages<CommittedOperationOption>(
          async (paging) => {
            const res = (await ledgerEndpoints.getOperations({
              ...paging,
              status: "COMMITTED",
            })) as ApiPage<CommittedOperationOption> | CommittedOperationOption[];
            if (Array.isArray(res)) {
              return { items: res, hasMore: false };
            }
            return res;
          },
        );
        const committedOps = items.filter((item) => item.status === "COMMITTED");
        if (active) setFetchedOperations(committedOps);
      } catch (err: unknown) {
        if (active) {
          setFetchedOpsError(
            err instanceof Error
              ? err.message
              : t("mill.corrections.loadOperationsError", "Không thể tải danh sách công đoạn."),
          );
        }
      } finally {
        if (active) setLoadingFetchedOps(false);
      }
    }
    void loadOperations();
    return () => {
      active = false;
    };
  }, [operationsData, t]);

  const operations = operationsData ? operationsData.items : fetchedOperations;
  const loadingOps = operationsData ? operationsData.loading : loadingFetchedOps;
  const displayError = createError ?? (operationsData ? operationsData.error : fetchedOpsError);

  const handleReset = () => {
    setCreateOperationId("");
    setCreateReason("");
    setCreateError(null);
    command.current = null;
  };

  const handleCreateCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    const trimmedOpId = createOperationId.trim();
    const trimmedReason = createReason.trim();

    if (!trimmedOpId) {
      setCreateError(
        t(
          "mill.corrections.errSelectOp",
          "Vui lòng chọn hoặc nhập mã công đoạn cần sửa.",
        ),
      );
      return;
    }
    if (!trimmedReason || trimmedReason.length < 5) {
      setCreateError(
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
      setCreateError(null);
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
      command.current = null;
      if (variant === "inline") {
        setCreateOperationId("");
        setCreateReason("");
      }
      onCreated();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : text("Lỗi khi gửi yêu cầu sửa đổi.", "Failed to submit correction request."),
      );
    } finally {
      inFlight.current = false;
      setSubmittingCreate(false);
    }
  };

  const title = t("mill.corrections.modalTitle", "Yêu cầu sửa công đoạn");
  const subtitle = t(
    "mill.corrections.modalSubtitle",
    "Gửi đề xuất sửa đổi công đoạn đã chốt sổ cái để đối soát",
  );
  const useManualInput = createManualMode || operations.length === 0;
  const opFieldId = useManualInput ? `${formId}-op-input` : `${formId}-op-select`;
  const reasonFieldId = `${formId}-reason-input`;

  const formBody = (
    <form
      onSubmit={handleCreateCorrection}
      className="record-form space-y-5 p-4 sm:p-6"
    >
      {/* Note callout */}
      <div className="flex items-start gap-3 rounded-xl border border-accent-primary/20 bg-accent-primary/5 p-3.5 text-xs">
        <Info
          size={18}
          weight="fill"
          className="mt-0.5 shrink-0 text-accent-primary"
          aria-hidden="true"
        />
        <div className="space-y-1 leading-relaxed text-ink-secondary">
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
      {displayError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
        >
          <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Operation selection field */}
      <div className="space-y-3 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor={opFieldId}
            className="!flex-row items-center text-sm font-semibold text-ink-primary"
          >
            {t(
              "mill.corrections.opSelectLabel",
              "Công đoạn đã chốt (COMMITTED) *",
            )}
          </label>
          <button
            type="button"
            onClick={() => setCreateManualMode(!createManualMode)}
            className="rounded-full bg-accent-primary/10 px-3 py-1 text-xs font-semibold text-accent-primary transition-colors hover:bg-accent-primary/20"
          >
            {createManualMode
              ? t("mill.corrections.pickFromList", "Chọn từ danh sách")
              : t("mill.corrections.enterManually", "Nhập mã thủ công")}
          </button>
        </div>

        {loadingOps ? (
          <div className="flex items-center justify-center py-4">
            <GrainLoader
              size="sm"
              label={t("mill.corrections.loadingOps", "Đang tải công đoạn...")}
            />
          </div>
        ) : useManualInput ? (
          <div className="space-y-1.5">
            <input
              id={opFieldId}
              type="text"
              required
              value={createOperationId}
              onChange={(e) => setCreateOperationId(e.target.value)}
              placeholder="VD: 550e8400-e29b-41d4-a716-446655440000"
              className="font-mono text-sm"
            />
            {operations.length === 0 && (
              <p className="text-xs text-ink-tertiary">
                {t(
                  "mill.corrections.noCommittedOps",
                  "Chưa tìm thấy công đoạn đã chốt trong danh sách tải gần nhất. Bạn có thể dán trực tiếp mã công đoạn.",
                )}
              </p>
            )}
          </div>
        ) : (
          <select
            id={opFieldId}
            required
            value={createOperationId}
            onChange={(e) => setCreateOperationId(e.target.value)}
            className="font-mono text-sm"
          >
            <option value="">
              {t("mill.corrections.chooseOp", "-- Chọn công đoạn cần sửa --")}
            </option>
            {operations.map((op) => {
              const label = op.kind
                ? OPERATION_LABELS[op.kind] || op.kind
                : text("Công đoạn", "Operation");
              const dateStr = op.occurredAt
                ? ` (${new Date(op.occurredAt).toLocaleString(i18n.language, { dateStyle: "short", timeStyle: "short" })})`
                : "";
              return (
                <option key={op.id} value={op.id}>
                  {label} · {op.id.slice(0, 8)}...{dateStr}
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* Reason textarea */}
      <div className="space-y-2 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor={reasonFieldId}
            className="!flex-row items-center text-sm font-semibold text-ink-primary"
          >
            {t(
              "mill.corrections.reasonLabel",
              "Lý do sai sót & đề xuất điều chỉnh *",
            )}
          </label>
          <span className="rounded-full bg-surface-base px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary dark:bg-surface-raised">
            {createReason.trim().length} {t("common.chars", "ký tự")}
          </span>
        </div>
        <textarea
          id={reasonFieldId}
          required
          rows={4}
          value={createReason}
          onChange={(e) => setCreateReason(e.target.value)}
          placeholder={t(
            "mill.corrections.reasonPlaceholder",
            "Ví dụ: Cân đầu vào bị lệch 150kg do cảm biến loadcell chưa hiệu chuẩn; Đổi lô xuất trấu cám tương ứng; Cần ghi bù bút toán giảm hao hụt...",
          )}
        />
        <p className="text-xs text-ink-tertiary">
          {t(
            "mill.corrections.reasonHint",
            "Nêu rõ các số liệu chênh lệch, bằng chứng cân đo hoặc biên bản kỹ thuật kèm theo.",
          )}
        </p>
      </div>

      {/* Action buttons */}
      <div className="record-form-footer items-center">
        {variant === "inline" ? (
          <button
            type="button"
            onClick={handleReset}
            disabled={submittingCreate || (!createOperationId && !createReason && !createError)}
            className="record-button rounded-full"
          >
            <Trash size={14} aria-hidden="true" />
            <span>{text("Xóa nội dung", "Clear")}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onClose()}
            disabled={submittingCreate}
            className="record-button rounded-full"
          >
            {t("common.cancel", "Huỷ")}
          </button>
        )}
        <button
          type="submit"
          disabled={
            submittingCreate ||
            !createOperationId.trim() ||
            createReason.trim().length < 5
          }
          className="record-button record-primary rounded-full px-6"
        >
          {submittingCreate ? (
            <span>{t("common.submitting", "Đang gửi...")}</span>
          ) : (
            <>
              <PencilSimpleLine size={15} weight="bold" aria-hidden="true" />
              <span>{t("mill.corrections.submitRequest", "Gửi yêu cầu sửa")}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );

  if (variant === "inline") {
    return (
      <section className="record-card">
        <div className="record-card-header">
          <div className="flex min-w-0 items-center gap-3">
            <span className="record-icon-tile" aria-hidden="true">
              <PencilSimpleLine size={20} weight="bold" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-ink-primary">
                {title}
              </h2>
              <p className="mt-0.5 text-xs text-ink-secondary">{subtitle}</p>
            </div>
          </div>
          <StatusBadge status="ACTIVE" size="sm" label="ISO 22095" />
        </div>
        {formBody}
      </section>
    );
  }

  return (
    <Modal
      isOpen
      onClose={() => !submittingCreate && onClose()}
      ariaLabel={title}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-xl flex-col overflow-hidden rounded-2xl border border-ink-tertiary/20 bg-surface-base shadow-2xl dark:bg-surface-raised">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-tertiary/15 bg-surface-raised px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="record-icon-tile" aria-hidden="true">
              <PencilSimpleLine size={20} weight="bold" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-ink-primary">
                {title}
              </h2>
              <p className="text-xs text-ink-secondary">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose()}
            disabled={submittingCreate}
            aria-label={t("common.close", "Đóng")}
            className="record-icon-button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="overflow-y-auto">{formBody}</div>
      </div>
    </Modal>
  );
}
