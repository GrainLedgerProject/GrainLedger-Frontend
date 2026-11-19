import { useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { ArrowRight, Calculator, CheckCircle, FileText, Lock, Scales, ShieldCheck, X } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { type CorrectionRecord } from "../model/correction";
import { CorrectionStatusBadge } from "./CorrectionStatusBadge";

export function CorrectionWorkbench({
  selectedCorrection, isManager, onClose,
}: {
  selectedCorrection: CorrectionRecord;
  isManager: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [reviewNotes, setReviewNotes] = useState(selectedCorrection.reconciliationNotes ?? "");
  return (
      <Modal
        isOpen
        onClose={onClose}
        ariaLabel={t(
          "mill.pendingCorrections.modalWorkbenchAria",
          "Hồ sơ đối soát & ghi bút toán bù",
        )}
      >
          <div className="bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl max-w-4xl w-[calc(100vw-2rem)] max-h-[92vh] flex flex-col overflow-hidden animate-ledger-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                  <Scales size={22} weight="bold" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-ink-primary">
                      {selectedCorrection.id}
                    </span>
                    <CorrectionStatusBadge status={selectedCorrection.status} />
                  </div>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    {t(
                      "mill.pendingCorrections.modalSubtitle",
                      "Hồ sơ đối soát & ghi bút toán bù cho công đoạn: ",
                    )}
                    <span className="font-mono font-bold text-accent-primary">
                      {selectedCorrection.operationId}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-surface-raised transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">

              {/* Side-by-side: Mẻ gốc vs Bút toán bù */}
              <div>
                <h3 className="font-bold font-display text-sm text-ink-primary mb-3 flex items-center gap-2">
                  <Calculator size={18} className="text-accent-primary" />
                  <span>
                    {t(
                      "mill.pendingCorrections.compareTitle",
                      "Đối chiếu cân bằng khối lượng ISO 22095:",
                    )}
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Left Column: Mẻ gốc bất biến */}
                  <div className="p-4 rounded-xl border border-ink-tertiary/15 bg-surface-raised dark:bg-surface-overlay space-y-3">
                    <div className="flex items-center justify-between border-b border-ink-tertiary/15 pb-2">
                      <span className="font-semibold text-xs text-ink-primary flex items-center gap-1.5">
                        <Lock size={14} className="text-ink-tertiary" />
                        {t(
                          "mill.pendingCorrections.immutableOriginal",
                          "Bản ghi gốc đã Commit (Bất biến)",
                        )}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-base dark:bg-surface-raised border border-ink-tertiary/15 text-ink-secondary font-bold">
                        IMMUTABLE
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-ink-tertiary">
                          {t("mill.pendingCorrections.opBatchId", "Mã mẻ:")}
                        </span>
                        <span className="font-mono font-bold text-ink-primary">
                          {selectedCorrection.operationId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-tertiary">
                          {t("mill.pendingCorrections.facility", "Cơ sở:")}
                        </span>
                        <span className="text-ink-secondary">
                          {t("brand.facility", "Dây chuyền A - Tiền Giang")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-tertiary">
                          {t(
                            "mill.pendingCorrections.committedTime",
                            "Thời gian chốt:",
                          )}
                        </span>
                        <span className="text-ink-secondary font-mono text-xs">
                          {new Date(
                            selectedCorrection.createdAt,
                          ).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-ink-tertiary/10 pt-1.5">
                        <span className="text-ink-tertiary">
                          {t(
                            "mill.pendingCorrections.outputStatus",
                            "Trạng thái lô đầu ra:",
                          )}
                        </span>
                        <span className="font-semibold text-accent-warning">
                          {t(
                            "mill.pendingCorrections.holdPendingRecon",
                            "Tạm khóa chờ đối soát (HOLD)",
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Bút toán bù đề xuất */}
                  <div className="p-4 rounded-xl border border-accent-primary/30 bg-accent-primary/5 dark:bg-accent-primary/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-accent-primary/20 pb-2">
                      <span className="font-semibold text-xs text-accent-primary flex items-center gap-1.5">
                        <Scales size={14} />
                        {t(
                          "mill.pendingCorrections.compensatingEntryTitle",
                          "Bút toán bù điều chỉnh (Compensating Entry)",
                        )}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-primary text-white font-bold">
                        REVERSAL
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {selectedCorrection.proposedReversals?.map((rev, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-surface-base dark:bg-surface-raised p-2.5 rounded-lg border border-ink-tertiary/15 font-mono"
                        >
                          <div>
                            <span className="font-semibold text-ink-primary block">
                              {rev.lotId}
                            </span>
                            <span className="text-[10px] text-ink-tertiary font-sans">
                              {rev.lotName ||
                                t(
                                  "mill.pendingCorrections.deltaLotDefault",
                                  "Lô điều chỉnh",
                                )}
                            </span>
                          </div>
                          <span
                            className={`font-bold text-xs ${
                              rev.deltaMassKg.startsWith("+")
                                ? "text-accent-primary"
                                : rev.deltaMassKg.startsWith("-")
                                  ? "text-accent-danger"
                                  : "text-ink-primary"
                            }`}
                          >
                            {rev.deltaMassKg} kg
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nguyên nhân & Căn cứ kỹ thuật */}
              <div className="p-4 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 space-y-2">
                <div className="font-semibold text-xs text-ink-primary flex items-center gap-1.5">
                  <FileText size={16} className="text-accent-primary" />
                  <span>
                    {t(
                      "mill.pendingCorrections.reasonSectionTitle",
                      "Lý do sai sót & Căn cứ hồ sơ:",
                    )}
                  </span>
                </div>
                <p className="text-xs text-ink-secondary leading-relaxed bg-surface-base dark:bg-surface-raised p-3 rounded-lg border border-ink-tertiary/10">
                  {selectedCorrection.reason}
                </p>
                {selectedCorrection.evidenceReference && (
                  <div className="flex items-center gap-2 text-xs text-ink-tertiary pt-1">
                    <span>
                      {t(
                        "mill.pendingCorrections.evidenceDocNumber",
                        "Số hiệu văn bản minh chứng:",
                      )}
                    </span>
                    <span className="font-mono font-bold text-accent-primary">
                      {selectedCorrection.evidenceReference}
                    </span>
                    {selectedCorrection.evidenceFileName && (
                      <span className="text-xs text-accent-primary underline font-mono">
                        ({selectedCorrection.evidenceFileName})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Manager Review Notes */}
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1">
                  {t(
                    "mill.pendingCorrections.managerNotesLabel",
                    "Ý kiến & Biên bản đối soát của Quản lý nhà máy (Mill Manager Review Notes) *",
                  )}
                </label>
                <textarea
                  rows={3}
                  disabled={
                    selectedCorrection.status === "COMMITTED" ||
                    selectedCorrection.status === "CANCELLED" ||
                    !isManager
                  }
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={t(
                    "mill.pendingCorrections.managerNotesPlaceholder",
                    "Ghi rõ kết luận đối soát: Đã xác minh lại phiếu cân / mẫu KCS, chuẩn y số liệu bù đảo ngược...",
                  )}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised text-ink-primary placeholder:text-ink-tertiary focus:border-accent-primary focus:outline-none disabled:bg-surface-raised disabled:text-ink-secondary transition-colors"
                />
              </div>
            </div>

            {/* Modal Actions */}
            {isManager &&
              (selectedCorrection.status === "PENDING_REVIEW" ||
                selectedCorrection.status === "RECONCILED") && (
                <p
                  role="status"
                  className="px-5 pt-3 text-xs text-accent-warning"
                >
                  Đối soát, hủy và chốt bút toán cần chứng cứ cùng công đoạn
                  thay thế theo yêu cầu máy chủ. Biểu mẫu này chưa thu thập đủ
                  dữ liệu để thực hiện.
                </p>
              )}
            <div className="p-4 border-t border-ink-tertiary/15 bg-surface-base dark:bg-surface-raised flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary hover:bg-surface-raised text-xs font-semibold transition-colors"
              >
                {t("common.close", "Đóng")}
              </button>

              {isManager && (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  {selectedCorrection.status === "PENDING_REVIEW" && (
                    <>
                      <button
                        type="button"
                        disabled
                        className="px-3.5 py-2 rounded-lg border border-accent-danger/30 text-accent-danger hover:bg-functional-rejected-bg text-xs font-semibold transition-colors"
                      >
                        {t(
                          "mill.pendingCorrections.btnRejectRequest",
                          "Từ chối yêu cầu",
                        )}
                      </button>

                      <span
                        className="px-4 py-2 rounded-full bg-accent-warning/50 text-ink-inverse text-xs font-semibold flex items-center gap-1.5"
                        aria-disabled="true"
                      >
                        <ShieldCheck size={15} weight="bold" />
                        <span>
                          {t(
                            "mill.pendingCorrections.btnInspectEvidence",
                            "Thẩm định đối soát bằng chứng",
                          )}
                        </span>
                        <ArrowRight size={13} weight="bold" />
                      </span>

                      <button
                        type="button"
                        disabled
                        className="px-3.5 py-2 rounded-lg bg-accent-primary hover:bg-accent-primary-dim text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
                        title={t(
                          "mill.pendingCorrections.btnQuickReconcileTitle",
                          "Duyệt nhanh đối soát",
                        )}
                      >
                        <CheckCircle size={15} weight="bold" />
                        <span>
                          {t(
                            "mill.pendingCorrections.btnQuickReconcile",
                            "Duyệt nhanh đối soát",
                          )}
                        </span>
                      </button>
                    </>
                  )}

                  {selectedCorrection.status === "RECONCILED" && (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 rounded-lg bg-accent-primary hover:bg-accent-primary-dim text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <Scales size={15} weight="bold" />
                      <span>
                        {t(
                          "mill.pendingCorrections.btnCommitToLedger",
                          "Chốt Bút toán Bù vào Sổ cái",
                        )}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
      </Modal>
  );
}
