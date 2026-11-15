import { ledgerEndpoints } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
import { Modal } from "@/components/Modal/Modal";
import { StatusBadge } from "@/components/StatusBadge/StatusBadge";
import {
  ArrowRight,
  ArrowsClockwise,
  Calculator,
  CaretRight,
  CheckCircle,
  ClockCounterClockwise,
  FileText,
  FolderOpen,
  Info,
  Lock,
  MagnifyingGlass,
  PencilSimpleLine,
  Plus,
  Scales,
  ShieldCheck,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { confirmAction, toast } from "@/app/store/feedbackStore";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export interface CorrectionRecord {
  id: string;
  operationId: string;
  facilityId?: string;
  category?: string;
  reason: string;
  reconciliationNotes?: string;
  status: "PENDING_REVIEW" | "RECONCILED" | "COMMITTED" | "CANCELLED";
  createdAt: string;
  createdBy?: string;
  evidenceReference?: string;
  evidenceFileName?: string;
  proposedReversals?: Array<{
    lotId: string;
    lotName?: string;
    deltaMassKg: string;
  }>;
}

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

function parseCorrectionsResponse(res: unknown): CorrectionRecord[] {
  let items: CorrectionRecord[];
  if (Array.isArray(res)) {
    items = res as CorrectionRecord[];
  } else if (res && typeof res === "object") {
    if (
      "items" in res &&
      Array.isArray((res as { items: CorrectionRecord[] }).items)
    ) {
      items = (res as { items: CorrectionRecord[] }).items;
    } else if (
      "corrections" in res &&
      Array.isArray((res as { corrections: CorrectionRecord[] }).corrections)
    ) {
      items = (res as { corrections: CorrectionRecord[] }).corrections;
    } else {
      items = [];
    }
  } else {
    items = [];
  }
  return items.map((item) => ({
    ...item,
    status:
      (item.status as string) === "REQUESTED" ? "PENDING_REVIEW" : item.status,
    createdAt:
      item.createdAt ||
      (item as CorrectionRecord & { requestedAt?: string }).requestedAt ||
      "",
  }));
}

export const CorrectionManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { id: routeCorrectionId } = useParams<{ id?: string }>();
  const location = useLocation();
  const isReconciliationRoute = location.pathname.includes("/reconciliations");
  const { user } = useAuthStore();

  const isManager =
    user?.role === "MILL_MANAGER" || user?.role === "MILL_ADMIN";

  const [corrections, setCorrections] = useState<CorrectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | CorrectionRecord["status"]
  >(isReconciliationRoute ? "PENDING_REVIEW" : "ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected item for Workbench view
  const [selectedCorrection, setSelectedCorrection] =
    useState<CorrectionRecord | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [, setIsProcessing] = useState(false);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [operations, setOperations] = useState<OperationOption[]>([]);
  const [loadingOps, setLoadingOps] = useState(false);
  const [createOperationId, setCreateOperationId] = useState("");
  const [createReason, setCreateReason] = useState("");
  const [createManualMode, setCreateManualMode] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createModalError, setCreateModalError] = useState<string | null>(null);

  const loadOperations = useCallback(async () => {
    try {
      setLoadingOps(true);
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
      setOperations(committedOps);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingOps(false);
    }
  }, []);

  const handleOpenCreateModal = useCallback(() => {
    setCreateOperationId("");
    setCreateReason("");
    setCreateModalError(null);
    setCreateManualMode(false);
    setShowCreateModal(true);
    if (operations.length === 0) {
      void loadOperations();
    }
  }, [operations.length, loadOperations]);

  const handleCreateCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setSubmittingCreate(true);
      setCreateModalError(null);
      await ledgerEndpoints.createCorrection({
        operationId: trimmedOpId,
        reason: trimmedReason,
      });
      toast.success(
        t(
          "mill.corrections.createSuccess",
          "Đã gửi yêu cầu sửa công đoạn thành công. Chờ Quản lý đối soát phê duyệt.",
        ),
      );
      setShowCreateModal(false);
      setCreateOperationId("");
      setCreateReason("");
      await fetchCorrections();
    } catch (err: unknown) {
      setCreateModalError(
        err instanceof Error ? err.message : "Lỗi khi gửi yêu cầu sửa đổi.",
      );
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Manual reload handler for button click
  const fetchCorrections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = (await ledgerEndpoints.getCorrections()) as unknown;
      const list = parseCorrectionsResponse(res);
      setCorrections(list);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Không thể tải danh sách yêu cầu sửa đổi.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Synchronize effect with external system (network)
  useEffect(() => {
    let active = true;

    async function initCorrections() {
      try {
        const res = (await ledgerEndpoints.getCorrections()) as unknown;
        if (!active) return;
        const list = parseCorrectionsResponse(res);
        setCorrections(list);

        // Handle route param if deep linked with /mill/reconciliations/:id
        if (routeCorrectionId && list.length > 0) {
          const found = list.find(
            (c) =>
              c.id.toLowerCase() === routeCorrectionId.toLowerCase() ||
              c.operationId.toLowerCase() === routeCorrectionId.toLowerCase(),
          );
          if (found) {
            setSelectedCorrection(found);
            setReviewNotes(found.reconciliationNotes || "");
          }
        }
      } catch (err: unknown) {
        if (!active) return;
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Không thể tải danh sách yêu cầu sửa đổi.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initCorrections();

    return () => {
      active = false;
    };
  }, [routeCorrectionId]);

  const handleOpenWorkbench = (record: CorrectionRecord) => {
    setSelectedCorrection(record);
    setReviewNotes(record.reconciliationNotes || "");
    setActionSuccess(null);
  };

  // Action: Xác nhận đối soát (Reconcile - SC-17)
  const handleReconcile = async () => {
    if (!selectedCorrection) return;
    if (!reviewNotes.trim()) {
      toast.warning(
        "Vui lòng nhập ghi chú kết quả đối soát kỹ thuật trước khi xác nhận.",
      );
      return;
    }

    try {
      setIsProcessing(true);
      await ledgerEndpoints.reconcileCorrection(selectedCorrection.id, {
        notes: reviewNotes.trim(),
      });

      setCorrections((prev) =>
        prev.map((c) =>
          c.id === selectedCorrection.id
            ? {
                ...c,
                status: "RECONCILED" as const,
                reconciliationNotes: reviewNotes.trim(),
              }
            : c,
        ),
      );

      setSelectedCorrection((prev) =>
        prev
          ? {
              ...prev,
              status: "RECONCILED",
              reconciliationNotes: reviewNotes.trim(),
            }
          : null,
      );

      setActionSuccess(
        `Đã hoàn tất đối soát yêu cầu ${selectedCorrection.id}. Chờ bước chốt bút toán bù.`,
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Không thể đối soát yêu cầu.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Chốt ghi bút toán bù vào sổ cái
  const handleCommit = async () => {
    if (!selectedCorrection) return;
    const confirmed = await confirmAction({
      title: `Chốt ghi bút toán bù (${selectedCorrection.id})`,
      description:
        "Hệ thống sẽ phát hành bút toán đảo ngược (Reversal Entry) vào sổ cái và mở khóa các lô hàng liên quan.",
      confirmLabel: "Chốt bút toán bù",
      variant: "warning",
    });
    if (!confirmed) return;

    try {
      setIsProcessing(true);
      await ledgerEndpoints.commitCorrection(selectedCorrection.id, {
        notes: reviewNotes.trim() || "Committed by Mill Manager",
      });

      setCorrections((prev) =>
        prev.map((c) =>
          c.id === selectedCorrection.id
            ? { ...c, status: "COMMITTED" as const }
            : c,
        ),
      );

      setSelectedCorrection((prev) =>
        prev ? { ...prev, status: "COMMITTED" } : null,
      );

      setActionSuccess(
        `Đã chốt thành công Bút toán Bù đảo ngược cho yêu cầu ${selectedCorrection.id} vào Sổ Cái.`,
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Không thể chốt bút toán bù.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Hủy bỏ yêu cầu
  const handleCancel = async () => {
    if (!selectedCorrection) return;
    const confirmed = await confirmAction({
      title: "Hủy bỏ yêu cầu sửa đổi",
      description: `Hủy bỏ yêu cầu sửa đổi ${selectedCorrection.id}?`,
      confirmLabel: "Hủy yêu cầu",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      setIsProcessing(true);
      await ledgerEndpoints.cancelCorrection(selectedCorrection.id, {
        notes: reviewNotes.trim() || "Cancelled",
      });

      setCorrections((prev) =>
        prev.map((c) =>
          c.id === selectedCorrection.id
            ? { ...c, status: "CANCELLED" as const }
            : c,
        ),
      );

      setSelectedCorrection(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Không thể hủy bỏ yêu cầu.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered list
  const filteredCorrections = useMemo(() => {
    return corrections.filter((item) => {
      const matchStatus =
        statusFilter === "ALL" || item.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.operationId.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q) ||
        (item.createdBy && item.createdBy.toLowerCase().includes(q));

      return matchStatus && matchQuery;
    });
  }, [corrections, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const pending = corrections.filter(
      (c) => c.status === "PENDING_REVIEW",
    ).length;
    const reconciled = corrections.filter(
      (c) => c.status === "RECONCILED",
    ).length;
    const committed = corrections.filter(
      (c) => c.status === "COMMITTED",
    ).length;
    return { pending, reconciled, committed, total: corrections.length };
  }, [corrections]);

  const renderStatusBadge = (status: CorrectionRecord["status"]) => {
    switch (status) {
      case "PENDING_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-functional-stale-bg text-accent-warning border border-functional-stale-border/40">
            <span className="w-1.5 h-1.5 rounded-full bg-functional-stale-bg0 animate-pulse" />
            {t(
              "mill.pendingCorrections.statusPendingReview",
              "Chờ Quản lý đối soát",
            )}
          </span>
        );
      case "RECONCILED":
        return (
          <StatusBadge
            status="BALANCED"
            label={t(
              "mill.pendingCorrections.statusReconciled",
              "Đã đối soát xong",
            )}
          />
        );
      case "COMMITTED":
        return (
          <StatusBadge
            status="BALANCED"
            label={t(
              "mill.pendingCorrections.statusCommitted",
              "Đã chốt bút toán bù",
            )}
          />
        );
      case "CANCELLED":
        return (
          <StatusBadge
            status="REJECTED"
            label={t("mill.pendingCorrections.statusCancelled", "Đã hủy")}
          />
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-mono font-bold text-accent-primary uppercase tracking-wider block"
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

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs cursor-pointer"
          >
            <Plus size={16} weight="bold" />
            <span>
              {t(
                "mill.pendingCorrections.createNewRequest",
                "Tạo yêu cầu sửa mới",
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 rounded-lg bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2">
          <WarningCircle size={18} weight="fill" className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-lg bg-functional-balanced-bg border border-functional-balanced-border/40 text-accent-primary text-xs flex items-center gap-2 font-medium">
          <CheckCircle size={18} weight="fill" className="shrink-0" />
          <span>{actionSuccess}</span>
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
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(
              "mill.pendingCorrections.searchPlaceholder",
              "Tìm theo mã CORR-, OP-, lý do...",
            )}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay text-ink-primary placeholder:text-ink-tertiary focus:border-accent-primary focus:outline-none transition-colors"
          />
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
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
                        {renderStatusBadge(item.status)}
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

      {/* Reconciliation Workbench Modal (SC-17 & SC-18) */}
      <Modal
        isOpen={Boolean(selectedCorrection)}
        onClose={() => setSelectedCorrection(null)}
        ariaLabel={t(
          "mill.pendingCorrections.modalWorkbenchAria",
          "Hồ sơ đối soát & ghi bút toán bù",
        )}
      >
        {selectedCorrection && (
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
                    {renderStatusBadge(selectedCorrection.status)}
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
                onClick={() => setSelectedCorrection(null)}
                className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-surface-raised transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              {actionSuccess && (
                <div className="p-3.5 rounded-xl bg-functional-balanced-bg border border-functional-balanced-border/40 text-accent-primary text-xs flex items-center gap-2.5 font-medium animate-ledger-in">
                  <CheckCircle size={18} weight="fill" className="shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

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
                onClick={() => setSelectedCorrection(null)}
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
                        onClick={handleCancel}
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
                        onClick={handleReconcile}
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
                      onClick={handleCommit}
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
        )}
      </Modal>

      {/* Create Correction Modal using @/components/Modal/Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => !submittingCreate && setShowCreateModal(false)}
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
              onClick={() => setShowCreateModal(false)}
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
                  htmlFor="correction-operation-select"
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
                onClick={() => setShowCreateModal(false)}
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
    </div>
  );
};
