import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ledgerEndpoints } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import {
  Truck,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
  X,
  Scales,
  ShieldCheck,
  Clock,
  Check,
} from "@phosphor-icons/react";

interface ReceivingTaskItem {
  id: string;
  sourceLotCode: string;
  farmerName?: string;
  originQuantityKg: string;
  originMoisturePercent?: string;
  arrivalMeasuredKg?: string;
  arrivalMoisturePercent?: string;
  status:
    | "PENDING_ARRIVAL"
    | "AWAITING_MANAGER_REVIEW"
    | "RECEIVED_MATCHED"
    | "RECEIVED_WITHIN_TOLERANCE"
    | "RECEIVED_SHORTAGE_APPROVED"
    | "BLOCKED_UNRESOLVED";
  receivedAt?: string;
  receivingVersion?: number;
  latestMeasurementSetId?: string;
}

export const ReceivingTasksPage: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const isManager =
    user?.role === "MILL_MANAGER" || user?.role === "MILL_ADMIN";
  const isOperator =
    user?.role === "MILL_OPERATOR" || user?.role === "MILL_ADMIN";

  const [tasks, setTasks] = useState<ReceivingTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [selectedTask, setSelectedTask] = useState<ReceivingTaskItem | null>(
    null,
  );
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [measuredWeight, setMeasuredWeight] = useState("");
  const [measuredMoisture, setMeasuredMoisture] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Manual reload for reload button / post-action refresh
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ledgerEndpoints.getReceivingTasks();
      const items: ReceivingTaskItem[] = Array.isArray(res)
        ? (res as ReceivingTaskItem[])
        : res &&
            typeof res === "object" &&
            "items" in res &&
            Array.isArray((res as { items: unknown }).items)
          ? (res as { items: ReceivingTaskItem[] }).items
          : [];
      setTasks(items);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          t(
            "mill.receiving.loadError",
            "Không thể tải danh sách chuyến xe tiếp nhận.",
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Synchronize effect with external system
  useEffect(() => {
    let active = true;

    async function initTasks() {
      try {
        const res = await ledgerEndpoints.getReceivingTasks();
        if (!active) return;
        const items: ReceivingTaskItem[] = Array.isArray(res)
          ? (res as ReceivingTaskItem[])
          : res &&
              typeof res === "object" &&
              "items" in res &&
              Array.isArray((res as { items: unknown }).items)
            ? (res as { items: ReceivingTaskItem[] }).items
            : [];
        setTasks(items);
      } catch (err: unknown) {
        if (!active) return;
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            t(
              "mill.receiving.loadError",
              "Không thể tải danh sách chuyến xe tiếp nhận.",
            ),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initTasks();

    return () => {
      active = false;
    };
  }, [t]);

  // Keyboard escape listeners for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isMeasureModalOpen) setIsMeasureModalOpen(false);
        if (isReviewModalOpen) setIsReviewModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMeasureModalOpen, isReviewModalOpen]);

  const handleOpenMeasure = (task: ReceivingTaskItem) => {
    setSelectedTask(task);
    setMeasuredWeight(task.originQuantityKg || "");
    setMeasuredMoisture(task.originMoisturePercent || "14.5");
    setIsMeasureModalOpen(true);
  };

  const handleOpenReview = (task: ReceivingTaskItem) => {
    setSelectedTask(task);
    setIsReviewModalOpen(true);
  };

  const handleSubmitMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmitting(true);
    setError(null);
    try {
      await ledgerEndpoints.recordReceivingMeasurement(selectedTask.id, {
        operationId: crypto.randomUUID(),
        expectedReceivingVersion: selectedTask.receivingVersion ?? 0,
        capturedAt: new Date().toISOString(),
        observations: `Số cân thực tế bến nhà máy: ${measuredWeight} kg, độ ẩm: ${measuredMoisture}%`,
        items: [
          {
            procurementItemId: selectedTask.id,
            measuredValue: measuredWeight,
            measuredUnit: "KG",
          },
        ],
        grossWeightKg: measuredWeight,
        tareWeightKg: "0.000",
        netWeightKg: measuredWeight,
        moisturePercent: measuredMoisture,
        measuredAt: new Date().toISOString(),
      });
      setSuccessMsg(
        t(
          "mill.receiving.measureSuccess",
          `Đã ghi nhận số cân thực tế cho chuyến xe ${selectedTask.sourceLotCode}`,
          { code: selectedTask.sourceLotCode },
        ),
      );
      setIsMeasureModalOpen(false);
      await loadTasks();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          t(
            "mill.receiving.measureError",
            "Không thể ghi nhận số cân tiếp nhận.",
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReview = async (approved: boolean) => {
    if (!selectedTask) return;

    setSubmitting(true);
    setError(null);
    try {
      let version = selectedTask.receivingVersion ?? 0;
      let measurementSetId = selectedTask.latestMeasurementSetId;

      try {
        const detail = (await ledgerEndpoints.getReceiving(
          selectedTask.id,
        )) as Record<string, unknown> | null;
        if (detail) {
          if (typeof detail.receivingVersion === "number")
            version = detail.receivingVersion;
          if (typeof detail.latestMeasurementSetId === "string")
            measurementSetId = detail.latestMeasurementSetId;
        }
      } catch {
        // Use task fallback
      }

      const reviewAction = approved ? "APPROVE_MATCH" : "REQUEST_REMEASUREMENT";
      const reasonText = approved
        ? "Số cân nằm trong giới hạn dung sai cho phép (0.5%). Chấp thuận nhập kho."
        : "Độ lệch cân vượt ngưỡng quy định. Yêu cầu kiểm tra hoặc cân lại.";

      await ledgerEndpoints.reviewReceiving(selectedTask.id, {
        operationId: crypto.randomUUID(),
        expectedReceivingVersion: version,
        measurementSetId: measurementSetId || crypto.randomUUID(),
        action: reviewAction,
        decision: reviewAction,
        reason: reasonText,
        notes: reasonText,
        reviewedAt: new Date().toISOString(),
      });

      setSuccessMsg(
        t(
          "mill.receiving.reviewSuccess",
          `Đã hoàn tất duyệt đối soát chuyến xe ${selectedTask.sourceLotCode}`,
          { code: selectedTask.sourceLotCode },
        ),
      );
      setIsReviewModalOpen(false);
      await loadTasks();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("mill.receiving.reviewError", "Không thể duyệt đối soát."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Quick statistics
  const stats = {
    total: tasks.length,
    pendingMeasure: tasks.filter((t) => t.status === "PENDING_ARRIVAL").length,
    awaitingReview: tasks.filter((t) => t.status === "AWAITING_MANAGER_REVIEW")
      .length,
    matched: tasks.filter(
      (t) =>
        t.status === "RECEIVED_MATCHED" ||
        t.status === "RECEIVED_WITHIN_TOLERANCE" ||
        t.status === "RECEIVED_SHORTAGE_APPROVED",
    ).length,
  };

  const renderStatusBadge = (status: ReceivingTaskItem["status"]) => {
    switch (status) {
      case "PENDING_ARRIVAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {t("mill.receiving.statusPendingArrival", "Chờ cân xe")}
          </span>
        );
      case "AWAITING_MANAGER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Clock size={12} weight="bold" />
            {t("mill.receiving.statusAwaitingReview", "Chờ Quản lý duyệt")}
          </span>
        );
      case "RECEIVED_MATCHED":
      case "RECEIVED_WITHIN_TOLERANCE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Check size={12} weight="bold" />
            {t("mill.receiving.statusMatched", "Khớp dung sai")}
          </span>
        );
      case "RECEIVED_SHORTAGE_APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
            <CheckCircle size={12} weight="bold" />
            {t("mill.receiving.statusShortageApproved", "Duyệt lệch cân")}
          </span>
        );
      case "BLOCKED_UNRESOLVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <WarningCircle size={12} weight="bold" />
            {t("mill.receiving.statusBlocked", "Bị chặn lệch cân")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-500/10 text-neutral-600 dark:text-neutral-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
            {t(
              "mill.receiving.tag",
              "TIẾP NHẬN LÚA VỀ NHÀ MÁY (RECEIVING & ARRIVAL WORKFLOW)",
            )}
          </span>
          <h1 className="text-2xl font-display font-bold text-ink-primary">
            {t(
              "mill.receiving.title",
              "Tiếp Nhận & Cân Đối Soát Xe Tải Về Nhà Máy",
            )}
          </h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            {t(
              "mill.receiving.desc",
              "Quy trình 2 bước: Nhân viên cân ghi nhận số đo thực tế (Measure) và Quản lý nhà máy duyệt đối soát lệch cân (Review) theo ISO 22095.",
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadTasks()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors text-xs font-semibold shadow-xs"
          title={t("common.reload", "Tải lại dữ liệu")}
        >
          <ArrowsClockwise
            size={16}
            className={loading ? "animate-spin" : undefined}
          />
          <span>{t("common.reload", "Tải lại")}</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex justify-between text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
            <span>{t("mill.receiving.kpiTotal", "Tổng chuyến xe")}</span>
            <Truck size={18} className="text-ink-tertiary" />
          </div>
          <div className="text-2xl font-bold font-mono text-ink-primary">
            {stats.total}
          </div>
          <p className="text-xs text-ink-tertiary mt-1">
            Trong đợt tiếp nhận hiện tại
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex justify-between text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
            <span>{t("mill.receiving.kpiPendingMeasure", "Chờ cân xe")}</span>
            <Scales size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-500">
            {stats.pendingMeasure}
          </div>
          <p className="text-xs text-ink-tertiary mt-1">
            Dành cho Nhân viên vận hành
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex justify-between text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
            <span>
              {t("mill.receiving.kpiAwaitingReview", "Chờ duyệt đối soát")}
            </span>
            <ShieldCheck size={18} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-500">
            {stats.awaitingReview}
          </div>
          <p className="text-xs text-ink-tertiary mt-1">
            Quản lý nhà máy cần xác nhận
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex justify-between text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
            <span>
              {t("mill.receiving.kpiMatched", "Đã nhập kho thành công")}
            </span>
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500">
            {stats.matched}
          </div>
          <p className="text-xs text-ink-tertiary mt-1">
            Sẵn sàng đưa vào silo sấy
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2"
        >
          <WarningCircle size={18} weight="fill" className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-functional-balanced-bg border border-functional-balanced-border/40 text-accent-primary text-xs flex items-center gap-2"
        >
          <CheckCircle size={18} weight="fill" className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tasks Table */}
      <div className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 flex justify-center">
            <GrainLoader
              label={t(
                "mill.receiving.loading",
                "Đang đối soát lịch trình tiếp nhận...",
              )}
            />
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-surface-raised dark:bg-surface-overlay flex items-center justify-center text-ink-tertiary">
              <Truck size={32} />
            </div>
            <p className="text-sm font-semibold text-ink-primary">
              {t(
                "mill.receiving.emptyTitle",
                "Không có chuyến xe nào đang chờ",
              )}
            </p>
            <p className="text-xs text-ink-secondary max-w-sm mx-auto">
              {t(
                "mill.receiving.emptyDesc",
                "Khi nông hộ xuất lúa tươi tại điểm thu mua, thông tin chuyến xe sẽ tự động hiển thị tại đây để nhân viên cân và quản lý đối soát.",
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/20 text-ink-secondary font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th scope="col" className="py-3.5 px-4">
                    {t("mill.receiving.thSourceLot", "Lô Nguồn")}
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    {t("mill.receiving.thFarmer", "Nông hộ / Điểm gom")}
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    {t("mill.receiving.thOriginWeight", "Cân xuất phát (kg)")}
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    {t("mill.receiving.thArrivalWeight", "Cân cập bến (kg)")}
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    {t("mill.receiving.thVariance", "Độ lệch")}
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    {t("common.status", "Trạng thái")}
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right">
                    {t("common.action", "Thao tác")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-tertiary/10">
                {tasks.map((task) => {
                  const orig = parseFloat(task.originQuantityKg) || 0;
                  const arr = parseFloat(task.arrivalMeasuredKg || "0");
                  const diff = arr > 0 ? arr - orig : 0;
                  const diffPercent = orig > 0 ? (diff / orig) * 100 : 0;
                  const isWithinTolerance = Math.abs(diffPercent) <= 0.5;

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-accent-primary">
                        {task.sourceLotCode || `LOT-${task.id.slice(0, 6)}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-ink-primary block">
                          {task.farmerName || "Nông hộ liên kết Cái Bè"}
                        </span>
                        <span className="text-[10px] text-ink-tertiary font-mono">
                          ID: {task.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-ink-secondary">
                        <span className="font-bold text-ink-primary">
                          {orig.toLocaleString("vi-VN")}
                        </span>{" "}
                        kg
                        {task.originMoisturePercent && (
                          <span className="text-[10px] text-ink-tertiary block font-sans">
                            Độ ẩm: {task.originMoisturePercent}%
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {arr > 0 ? (
                          <>
                            <span className="font-bold text-ink-primary">
                              {arr.toLocaleString("vi-VN")}
                            </span>{" "}
                            kg
                            {task.arrivalMoisturePercent && (
                              <span className="text-[10px] text-indigo-500 block font-sans">
                                Độ ẩm: {task.arrivalMoisturePercent}%
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-ink-tertiary italic">
                            {t("mill.receiving.notMeasured", "Chưa cân xe")}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {arr > 0 ? (
                          <div>
                            <span
                              className={
                                isWithinTolerance
                                  ? "text-accent-primary font-bold"
                                  : "text-accent-danger font-bold"
                              }
                            >
                              {diff > 0
                                ? `+${diff.toFixed(2)}`
                                : diff.toFixed(2)}{" "}
                              kg
                            </span>
                            <span
                              className={`text-[10px] block ${
                                isWithinTolerance
                                  ? "text-accent-primary"
                                  : "text-accent-danger"
                              }`}
                            >
                              (
                              {diffPercent > 0
                                ? `+${diffPercent.toFixed(2)}`
                                : diffPercent.toFixed(2)}
                              %)
                            </span>
                          </div>
                        ) : (
                          <span className="text-ink-tertiary">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(task.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {/* If not measured yet */}
                        {!task.arrivalMeasuredKg &&
                          (isOperator ? (
                            <button
                              type="button"
                              onClick={() => handleOpenMeasure(task)}
                              className="px-3 py-1.5 rounded-lg bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-colors shadow-xs"
                            >
                              {t("mill.receiving.btnMeasure", "Cân xe đến")}
                            </button>
                          ) : (
                            <span className="text-ink-tertiary text-xs">
                              {t(
                                "mill.receiving.awaitingOperator",
                                "Chờ nhân viên cân",
                              )}
                            </span>
                          ))}

                        {/* If measured and awaiting manager review */}
                        {task.arrivalMeasuredKg &&
                          task.status === "AWAITING_MANAGER_REVIEW" &&
                          (isManager ? (
                            <button
                              type="button"
                              onClick={() => handleOpenReview(task)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-xs inline-flex items-center gap-1.5"
                            >
                              <ShieldCheck size={14} weight="bold" />
                              <span>
                                {t(
                                  "mill.receiving.btnReview",
                                  "Duyệt đối soát",
                                )}
                              </span>
                            </button>
                          ) : (
                            <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full text-xs font-medium border border-indigo-500/20">
                              {t(
                                "mill.receiving.awaitingManager",
                                "Chờ Quản lý duyệt",
                              )}
                            </span>
                          ))}

                        {/* If already matched / completed */}
                        {task.arrivalMeasuredKg &&
                          task.status !== "AWAITING_MANAGER_REVIEW" && (
                            <span className="text-ink-tertiary text-xs">
                              {t("common.done", "Đã hoàn thành")}
                            </span>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Measure Modal */}
      {isMeasureModalOpen && selectedTask && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="measure-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMeasureModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in focus:rounded-lg">
            <div className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scales size={20} className="text-accent-primary" />
                <h2
                  id="measure-modal-title"
                  className="font-display font-bold text-base text-ink-primary"
                >
                  {t(
                    "mill.receiving.modalMeasureTitle",
                    "Ghi nhận Cân Xe Tải Đến Nhà Máy",
                  )}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsMeasureModalOpen(false)}
                className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary transition-colors"
                aria-label={t("common.close", "Đóng")}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleSubmitMeasurement(e)}
              className="p-5 space-y-4 text-xs"
            >
              <div className="p-3.5 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 space-y-1">
                <span className="text-ink-tertiary text-xs block">
                  {t("mill.receiving.sourceLotLabel", "Mã lô nguồn xuất phát:")}
                </span>
                <span className="font-mono font-bold text-ink-primary text-sm block">
                  {selectedTask.sourceLotCode}
                </span>
                <span className="text-ink-secondary text-xs block">
                  {t(
                    "mill.receiving.originMassRecorded",
                    "Khối lượng ghi nhận ban đầu:",
                  )}{" "}
                  <strong className="text-ink-primary font-mono">
                    {selectedTask.originQuantityKg} kg
                  </strong>
                </span>
              </div>

              <div>
                <label
                  htmlFor="measuredWeightInput"
                  className="block font-semibold text-ink-secondary mb-1"
                >
                  {t(
                    "mill.receiving.actualMassLabel",
                    "Khối lượng cân thực tế tại nhà máy (kg) *",
                  )}
                </label>
                <div className="relative">
                  <input
                    id="measuredWeightInput"
                    type="number"
                    step="0.01"
                    required
                    value={measuredWeight}
                    onChange={(e) => setMeasuredWeight(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg font-mono font-bold text-ink-primary"
                  />
                  <span className="absolute right-3 top-2 text-ink-tertiary font-mono">
                    kg
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="measuredMoistureInput"
                  className="block font-semibold text-ink-secondary mb-1"
                >
                  {t(
                    "mill.receiving.actualMoistureLabel",
                    "Độ ẩm đo tại cân bến (%) *",
                  )}
                </label>
                <div className="relative">
                  <input
                    id="measuredMoistureInput"
                    type="number"
                    step="0.1"
                    required
                    value={measuredMoisture}
                    onChange={(e) => setMeasuredMoisture(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg font-mono text-indigo-500 font-bold"
                  />
                  <span className="absolute right-3 top-2 text-ink-tertiary font-mono">
                    %
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMeasureModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-ink-tertiary/20 hover:bg-surface-raised font-semibold text-ink-secondary transition-colors"
                >
                  {t("common.cancel", "Huỷ")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-60"
                >
                  {submitting
                    ? t("common.saving", "Đang lưu...")
                    : t("mill.receiving.confirmMeasure", "Xác nhận số cân")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {isReviewModalOpen && selectedTask && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsReviewModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in focus:rounded-lg">
            <div className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={20}
                  className="text-indigo-600 dark:text-indigo-400"
                />
                <h2
                  id="review-modal-title"
                  className="font-display font-bold text-base text-ink-primary"
                >
                  {t(
                    "mill.receiving.modalReviewTitle",
                    "Duyệt Đối Soát Chuyến Xe Tiếp Nhận",
                  )}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary transition-colors"
                aria-label={t("common.close", "Đóng")}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-ink-tertiary">
                    {t("mill.receiving.originMassLabel", "Cân xuất phát:")}
                  </span>
                  <span className="font-mono font-bold text-ink-primary">
                    {parseFloat(
                      selectedTask.originQuantityKg || "0",
                    ).toLocaleString("vi-VN")}{" "}
                    kg
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-tertiary">
                    {t(
                      "mill.receiving.actualArrivalMassLabel",
                      "Cân thực tế cập bến:",
                    )}
                  </span>
                  <span className="font-mono font-bold text-indigo-500">
                    {parseFloat(
                      selectedTask.arrivalMeasuredKg || "0",
                    ).toLocaleString("vi-VN")}{" "}
                    kg
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-ink-tertiary/10 pt-2">
                  <span className="text-ink-secondary font-semibold">
                    {t("mill.receiving.varianceLabel", "Chênh lệch:")}
                  </span>
                  {(() => {
                    const orig = parseFloat(selectedTask.originQuantityKg) || 0;
                    const arr = parseFloat(
                      selectedTask.arrivalMeasuredKg || "0",
                    );
                    const diff = arr - orig;
                    const diffPct = orig > 0 ? (diff / orig) * 100 : 0;
                    const isOk = Math.abs(diffPct) <= 0.5;

                    return (
                      <span
                        className={`font-mono font-bold ${isOk ? "text-accent-primary" : "text-accent-danger"}`}
                      >
                        {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} kg
                        (
                        {diffPct > 0
                          ? `+${diffPct.toFixed(2)}`
                          : diffPct.toFixed(2)}
                        %)
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-functional-balanced-bg border border-functional-balanced-border/40 text-accent-primary text-xs leading-relaxed">
                {t(
                  "mill.receiving.toleranceOkDesc",
                  "Tiêu chuẩn ISO 22095: Dung sai cho phép là ±0,5%. Phê duyệt sẽ ghi nhận lượng thực tế vào Sổ cái và chuyển trạng thái lô hàng sẵn sàng sấy.",
                )}
              </div>

              <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleApproveReview(false)}
                  className="px-3.5 py-2 rounded-lg border border-accent-danger/40 text-accent-danger font-semibold hover:bg-functional-hold-bg transition-colors disabled:opacity-60"
                >
                  {t(
                    "mill.receiving.btnRejectDiscrepancy",
                    "Từ chối (Yêu cầu cân lại)",
                  )}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleApproveReview(true)}
                  className="px-5 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-60 shadow-xs"
                >
                  {submitting
                    ? t("common.processing", "Đang xử lý...")
                    : t(
                        "mill.receiving.btnApproveMatch",
                        "Chấp thuận nhập kho",
                      )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
