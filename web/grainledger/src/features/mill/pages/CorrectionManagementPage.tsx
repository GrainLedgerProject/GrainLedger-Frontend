import { ledgerEndpoints } from "@/api/ledger";
import { confirmAction,toast } from "@/app/store/feedbackStore";
import { logger } from "@/shared/utils/logger";
import {
ArrowClockwise,
CheckCircle,
ClockCounterClockwise,
Plus,
Scales,
WarningCircle,
X,
XCircle
} from "@phosphor-icons/react";
import React,{ useEffect,useState } from "react";

interface CorrectionItem {
  id: string;
  operationId: string;
  facilityId?: string;
  reason: string;
  reconciliationNotes?: string;
  status: "PENDING_REVIEW" | "RECONCILED" | "COMMITTED" | "CANCELLED";
  createdAt: string;
  createdBy?: string;
  proposedReversals?: Array<{
    lotId: string;
    deltaMassKg: string;
  }>;
}

export const CorrectionManagementPage: React.FC = () => {
  const [corrections, setCorrections] = useState<CorrectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal create
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    operationId: "",
    reason: "",
    reconciliationNotes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCorrections = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = (await ledgerEndpoints.getCorrections()) as unknown;

      let list: CorrectionItem[] = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res && typeof res === "object" && "items" in res) {
        list = (res as { items: CorrectionItem[] }).items;
      }

      setCorrections(list.map((item) => ({
        ...item,
        status: (item.status as string) === "REQUESTED" ? "PENDING_REVIEW" : item.status,
        createdAt: item.createdAt || (item as CorrectionItem & { requestedAt?: string }).requestedAt || "",
      })));
    } catch (err: unknown) {
      logger.error(err);
      setError(
        (err as Error).message || "Không thể tải danh sách yêu cầu sửa đổi.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCorrections();
  }, []);

  const handleCreateCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.operationId.trim() || !createForm.reason.trim()) {
      toast.warning("Vui lòng nhập mã công đoạn (Operation ID) và lý do sửa đổi.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await ledgerEndpoints.createCorrection({
        operationId: createForm.operationId.trim(),
        reason: createForm.reason.trim(),
        reconciliationNotes: createForm.reconciliationNotes.trim(),
      });
      await fetchCorrections();
      setShowCreateModal(false);
      setCreateForm({ operationId: "", reason: "", reconciliationNotes: "" });
      toast.success(
        "Đã gửi yêu cầu sửa bước chế biến thành công. Chờ Quản lý đối soát phê duyệt.",
      );
    } catch (err: unknown) {
      logger.error(err);
      setError((err as Error).message || "Lỗi khi gửi yêu cầu sửa đổi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommitCorrection = async (id: string) => {
    const confirmed = await confirmAction({
      title: "Chốt bút toán bù đảo ngược",
      description: "Bạn có chắc chắn muốn chốt bút toán bù đảo ngược? Lịch sử gốc sẽ được bảo tồn nguyên vẹn.",
      confirmLabel: "Chốt bút toán bù",
      variant: "warning",
    });
    if (!confirmed) return;

    try {
      setLoading(true);
      await ledgerEndpoints.commitCorrection(id, { notes: "" });
      toast.success(
        `Đã ghi nhận bút toán bù và thay thế cho yêu cầu ${id} thành công.`,
      );
      fetchCorrections();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể chốt bút toán bù.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelCorrection = async (id: string) => {
    const confirmed = await confirmAction({
      title: "Hủy yêu cầu sửa đổi",
      description: "Hủy bỏ yêu cầu sửa đổi này?",
      confirmLabel: "Hủy yêu cầu",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      setLoading(true);
      await ledgerEndpoints.cancelCorrection(id, {
        notes: "Cancelled by user",
      });
      fetchCorrections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể hủy yêu cầu sửa đổi.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: CorrectionItem["status"]) => {
    switch (status) {
      case "PENDING_REVIEW":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-functional-stale-bg text-accent-warning border border-functional-stale-border/40">
            Chờ Quản lý duyệt
          </span>
        );
      case "RECONCILED":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-info/10 text-accent-info border border-accent-info/20">
            Đã đối soát xong
          </span>
        );
      case "COMMITTED":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-functional-balanced-bg text-accent-primary border border-functional-balanced-border/40">
            Đã chốt bút toán bù
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-raised text-ink-secondary border border-surface-overlay">
            Đã hủy
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-secondary">
              Bất biến lịch sử chế biến
            </span>
          </div>
          <h1 className="text-2xl font-bold  text-ink-primary mt-1">
            Quản lý Sửa đổi & Bút toán Bù (Corrections & Reconciliations)
          </h1>
          <p className="text-sm text-ink-secondary mt-0.5">
            Khi phát hiện sai sót số liệu trong các mẻ sấy/xay/trộn đã chốt, hệ
            thống tuyệt đối không sửa đè mà ghi nhận bút toán đảo ngược kèm bút
            toán thay thế.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-accent-primary hover:bg-accent-primary-dim text-ink-inverse rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition shrink-0"
        >
          <Plus size={16} weight="bold" />
          Yêu cầu sửa bước chế biến
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-start gap-2">
          <X className="shrink-0 mt-0.5" size={18} />
          <div>
            <strong>Lỗi hệ thống:</strong> {error}
          </div>
        </div>
      )}

      {/* Rules Notice */}
      <div className="p-4 bg-functional-stale-bg border border-functional-stale-border/40 rounded-xl text-accent-warning text-xs space-y-1">
        <div className="flex items-center gap-2 font-semibold">
          <WarningCircle size={16} weight="fill" className="text-accent-warning" />
          <span>Quy tắc hạch toán Mass Balance ISO 22095:</span>
        </div>
        <p className="text-accent-warning pl-6 leading-relaxed">
          1. Bước chế biến đã COMMIT là bất biến. Yêu cầu sửa đổi sẽ khóa tạm
          thời các lô đầu ra khỏi các kế hoạch đóng container tiếp theo cho đến
          khi Quản lý duyệt.
          <br />
          2. Khi duyệt sửa đổi, hệ thống thực thi giao dịch ghi đồng thời bút
          toán âm đảo ngược (Reversal Entry) và bút toán dương thay thế
          (Replacement Entry).
        </p>
      </div>

      {/* List Table */}
      <div className="bg-surface-base rounded-xl border border-surface-overlay shadow-sm overflow-hidden">
        <div className="p-4 border-b border-surface-overlay flex items-center justify-between">
          <h2 className="font-semibold text-ink-primary text-sm flex items-center gap-2">
            <ClockCounterClockwise size={16} />
            Danh sách Yêu cầu Sửa đổi & Đối soát ({corrections.length})
          </h2>
          <button
            onClick={fetchCorrections}
            className="text-xs text-ink-secondary hover:text-accent-primary flex items-center gap-1"
          >
            <ArrowClockwise size={14} />
            Làm mới
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-secondary text-sm">
            Đang tải danh sách...
          </div>
        ) : corrections.length === 0 ? (
          <div className="p-12 text-center text-ink-secondary text-sm">
            Chưa có yêu cầu sửa đổi nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-raised border-b border-surface-overlay text-ink-secondary font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Mã yêu cầu</th>
                  <th className="py-3 px-4">Mã bước chế biến</th>
                  <th className="py-3 px-4">Lý do sai lệch</th>
                  <th className="py-3 px-4">Ghi chú đối soát</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-overlay">
                {corrections.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-raised/80 transition">
                    <td className="py-3 px-4 font-mono font-medium text-ink-primary">
                      {item.id}
                    </td>
                    <td className="py-3 px-4 font-mono text-accent-primary font-semibold">
                      {item.operationId}
                    </td>
                    <td className="py-3 px-4 text-ink-primary max-w-xs">
                      {item.reason}
                    </td>
                    <td className="py-3 px-4 text-ink-secondary max-w-xs">
                      {item.reconciliationNotes || "—"}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                    <td className="py-3 px-4 text-ink-secondary whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {item.status === "PENDING_REVIEW" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            disabled
                            onClick={() => handleCommitCorrection(item.id)}
                            className="px-2 py-1 bg-functional-balanced-bg hover:bg-functional-balanced-bg text-accent-primary font-medium rounded text-xs transition inline-flex items-center gap-1"
                            title="Cần chứng cứ và công đoạn thay thế; biểu mẫu hiện chưa hỗ trợ"
                          >
                            <CheckCircle size={14} weight="fill" />
                            Chốt bù
                          </button>
                          <button
                            disabled
                            onClick={() => handleCancelCorrection(item.id)}
                            title="Cần chứng cứ xác minh; biểu mẫu hiện chưa hỗ trợ"
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 font-medium rounded text-xs transition inline-flex items-center gap-1"
                          >
                            <XCircle size={14} />
                            Hủy
                          </button>
                        </div>
                      )}
                      {item.status === "COMMITTED" && (
                        <span className="text-ink-secondary text-[11px] font-mono">
                          Đã ghi sổ bù
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-ink-primary/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface-base rounded-xl shadow-xl border border-surface-overlay max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-surface-overlay flex items-center justify-between bg-surface-raised">
              <div className="flex items-center gap-2">
                <Scales size={20} className="text-accent-primary" />
                <h3 className="font-bold text-ink-primary">
                  Yêu cầu Sửa bước chế biến
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-ink-secondary hover:text-ink-secondary p-1 rounded-lg hover:bg-surface-overlay transition"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreateCorrection}
              className="p-6 space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-ink-secondary uppercase mb-1">
                  Mã bước chế biến đã Commit (Operation ID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: OP-2026-DRY-01"
                  value={createForm.operationId}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      operationId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-ink-tertiary/30 rounded-lg text-sm font-mono focus:border-accent-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary uppercase mb-1">
                  Lý do sai sót & yêu cầu sửa đổi *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Mô tả nguyên nhân sai lệch: nhầm số liệu cân, độ ẩm đo sai, chọn nhầm silo xuất..."
                  value={createForm.reason}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, reason: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-ink-tertiary/30 rounded-lg text-sm focus:border-accent-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary uppercase mb-1">
                  Biên bản đối soát hoặc phiếu cân thực tế
                </label>
                <input
                  type="text"
                  placeholder="Số biên bản KCS hoặc link bằng chứng..."
                  value={createForm.reconciliationNotes}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      reconciliationNotes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-ink-tertiary/30 rounded-lg text-sm focus:border-accent-primary focus:outline-none"
                />
              </div>

              <div className="p-3 bg-functional-stale-bg rounded-lg border border-functional-stale-border/40 text-xs text-accent-warning">
                Ghi chú: Lô hàng đầu ra của bước chế biến này sẽ tạm thời bị
                khóa cho đến khi Quản lý hoàn tất đối soát và phê duyệt bút toán
                bù.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-overlay">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-ink-tertiary/30 rounded-lg text-xs font-medium text-ink-secondary hover:bg-surface-raised transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-accent-primary hover:bg-accent-primary-dim disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
                >
                  {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
