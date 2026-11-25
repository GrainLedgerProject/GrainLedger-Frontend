import { GrainLoader } from "@/shared/ui/GrainLoader";
import { ArrowsClockwise, CaretRight, CheckCircle, FolderOpen, MagnifyingGlass, WarningCircle, X } from "@phosphor-icons/react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { CorrectionStatusBadge } from "../components/CorrectionStatusBadge";
import { useCorrectionReview } from "../hooks/useCorrectionReview";
import { CorrectionWorkbench } from "../components/CorrectionWorkbench";

export const CorrectionManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const {
    corrections, loading, error, notFound, statusFilter, setStatusFilter, searchQuery, setSearchQuery,
    selectedCorrection, closeWorkbench,
    fetchCorrections, handleOpenWorkbench, filteredCorrections, stats,
  } = useCorrectionReview();
  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {t(
              "mill.reconciliations.tag",
              "ĐỐI SOÁT & XÁC MINH BẰNG CHỨNG (RECONCILIATION WORKFLOW)",
            )}
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            {t(
              "mill.reconciliations.pageTitle",
              "Đối Soát & Xác Nhận Bằng Chứng Điều Chỉnh",
            )}
          </h2>
          <p
            data-ui-detail="secondary"
            className="text-xs text-ink-secondary mt-0.5 max-w-3xl"
          >
            {t(
              "mill.reconciliations.pageSubtitle",
              "Kiểm tra biên bản hiện trường, đối soát chênh lệch khối lượng và xác nhận căn cứ kỹ thuật (Reconcile) trước khi phát hành bút toán đảo ngược vào sổ cái.",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchCorrections}
            disabled={loading}
            className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors"
            title={t("common.reload", "Tải lại danh sách")}
          >
            <ArrowsClockwise
              size={16}
              className={loading ? "animate-spin" : ""}
            />
          </button>

        </div>
      </div>

      {/* Alerts */}
      {notFound && <p role="alert">{text("Không tìm thấy hồ sơ trong phạm vi truy cập hiện tại.", "The record was not found in your current access scope.")}</p>}
      {error && (
        <div className="p-3.5 rounded-lg bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2">
          <WarningCircle size={18} weight="fill" className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
            <span>
              {t("mill.pendingCorrections.kpiPending", "Chờ duyệt đối soát")}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-functional-stale-bg0 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-accent-warning">
            {stats.pending}
          </div>
          <p className="text-xs text-ink-tertiary mt-1">
            {t(
              "mill.pendingCorrections.kpiPendingDesc",
              "Cần Quản lý xác minh",
            )}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
            <span>
              {t("mill.pendingCorrections.kpiReconciled", "Đã đối soát xong")}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-accent-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-accent-primary">
            {stats.reconciled}
          </div>
          <p className="text-xs text-ink-tertiary mt-1">
            {t(
              "mill.pendingCorrections.kpiReconciledDesc",
              "Sẵn sàng chốt bút toán bù",
            )}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex justify-between text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
            <span>
              {t("mill.pendingCorrections.kpiCommitted", "Đã chốt sổ cái")}
            </span>
            <CheckCircle
              size={16}
              className="text-accent-primary"
              weight="fill"
            />
          </div>
          <div className="text-2xl font-bold font-mono text-accent-primary">
            {stats.committed}
          </div>
          <p className="text-xs text-ink-tertiary mt-1">
            {t(
              "mill.pendingCorrections.kpiCommittedDesc",
              "Bút toán bù đã phát hành",
            )}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex justify-between text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
            <span>
              {t("mill.pendingCorrections.kpiTotal", "Tổng yêu cầu trong kỳ")}
            </span>
            <FolderOpen size={16} className="text-ink-tertiary" />
          </div>
          <div className="text-2xl font-bold font-mono text-ink-primary">
            {stats.total}
          </div>
          <p className="text-xs text-ink-tertiary mt-1">
            {t(
              "mill.pendingCorrections.kpiTotalDesc",
              "Hồ sơ kiểm toán ISO 22095",
            )}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Card */}
      <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-surface-raised dark:bg-surface-overlay rounded-xl border border-ink-tertiary/15 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === "ALL"
                ? "bg-surface-base dark:bg-surface-raised text-ink-primary font-bold shadow-xs"
                : "text-ink-secondary hover:text-ink-primary"
            }`}
          >
            {t("common.all", "Tất cả")} ({corrections.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PENDING_REVIEW")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === "PENDING_REVIEW"
                ? "bg-surface-base dark:bg-surface-raised text-accent-warning font-bold shadow-xs"
                : "text-ink-secondary hover:text-ink-primary"
            }`}
          >
            {t("mill.pendingCorrections.tabPending", "Chờ duyệt")} (
            {stats.pending})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("RECONCILED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === "RECONCILED"
                ? "bg-surface-base dark:bg-surface-raised text-accent-primary font-bold shadow-xs"
                : "text-ink-secondary hover:text-ink-primary"
            }`}
          >
            {t("mill.pendingCorrections.tabReconciled", "Đã đối soát")} (
            {stats.reconciled})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("COMMITTED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === "COMMITTED"
                ? "bg-surface-base dark:bg-surface-raised text-accent-primary font-bold shadow-xs"
                : "text-ink-secondary hover:text-ink-primary"
            }`}
          >
            {t("mill.pendingCorrections.tabCommitted", "Đã chốt bù")} (
            {stats.committed})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <MagnifyingGlass
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(
              "mill.pendingCorrections.searchPlaceholder",
              "Tìm theo mã CORR-, OP-, lý do...",
            )}
            className="filter-control border-ink-tertiary/20 bg-surface-raised pe-9 ps-10 placeholder:text-ink-tertiary dark:bg-surface-overlay"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <GrainLoader label="Đang tải danh sách bút toán bù..." />
        </div>
      ) : (
        <div className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-surface-raised dark:bg-surface-overlay text-ink-secondary font-semibold border-b border-ink-tertiary/15 uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-3.5 px-4">
                    {t("mill.pendingCorrections.colCorrId", "Mã yêu cầu")}
                  </th>
                  <th className="py-3.5 px-4">
                    {t("mill.pendingCorrections.colOpId", "Mã công đoạn")}
                  </th>
                  <th className="py-3.5 px-4">
                    {t(
                      "mill.pendingCorrections.colReason",
                      "Phân loại & Lý do sai sót",
                    )}
                  </th>
                  <th className="py-3.5 px-4">
                    {t(
                      "mill.pendingCorrections.colProposedDelta",
                      "Đề xuất bù khối lượng",
                    )}
                  </th>
                  <th className="py-3.5 px-4">
                    {t("mill.pendingCorrections.colAuthor", "Người lập")}
                  </th>
                  <th className="py-3.5 px-4">
                    {t("common.status", "Trạng thái")}
                  </th>
                  <th className="py-3.5 px-4 text-right">
                    {t("common.action", "Thao tác")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-tertiary/10 font-sans">
                {filteredCorrections.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-ink-tertiary"
                    >
                      {t(
                        "mill.pendingCorrections.noRecords",
                        "Không tìm thấy yêu cầu sửa đổi nào phù hợp.",
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCorrections.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors cursor-pointer"
                      onClick={() => handleOpenWorkbench(item)}
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded-md inline-block">
                          {item.id}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-ink-primary">
                        {item.operationId}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        {item.category && (
                          <span className="block text-[10px] font-mono font-bold text-accent-primary uppercase tracking-wider mb-0.5">
                            {item.category}
                          </span>
                        )}
                        <span className="text-ink-primary text-xs line-clamp-1">
                          {item.reason}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {item.proposedReversals &&
                        item.proposedReversals.length > 0 ? (
                          <div className="space-y-0.5">
                            {item.proposedReversals.map((r, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-ink-secondary"
                              >
                                <span className="text-ink-tertiary font-mono">
                                  {r.lotId}:
                                </span>{" "}
                                <span
                                  className={`font-bold ${
                                    r.deltaMassKg.startsWith("+")
                                      ? "text-accent-primary"
                                      : r.deltaMassKg.startsWith("-")
                                        ? "text-accent-danger"
                                        : "text-ink-tertiary"
                                  }`}
                                >
                                  {r.deltaMassKg} kg
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-ink-tertiary">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-ink-secondary whitespace-nowrap">
                        <div className="text-xs text-ink-primary font-medium">
                          {item.createdBy?.split("(")[0] || "Vận hành viên"}
                        </div>
                        <div className="text-[10px] text-ink-tertiary font-mono">
                          {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <CorrectionStatusBadge status={item.status} />
                      </td>
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenWorkbench(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-raised dark:bg-surface-overlay hover:bg-accent-primary/10 hover:text-accent-primary border border-ink-tertiary/20 text-ink-primary transition-colors shadow-xs"
                        >
                          <span>
                            {t(
                              "mill.pendingCorrections.actionReconcileAndCommit",
                              "Đối soát & Ghi bù",
                            )}
                          </span>
                          <CaretRight size={14} weight="bold" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedCorrection && (
        <CorrectionWorkbench
          key={selectedCorrection.id}
          selectedCorrection={selectedCorrection}
          onClose={closeWorkbench}
        />
      )}
    </div>
  );
};
