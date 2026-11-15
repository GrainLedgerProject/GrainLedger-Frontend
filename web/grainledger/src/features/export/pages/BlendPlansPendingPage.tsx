import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Modal } from "@/components/Modal/Modal";
import { StatusBadge, type StatusType } from "@/components/StatusBadge/StatusBadge";
import { StalePlanBanner } from "@/components/StalePlanBanner/StalePlanBanner";
import {
  CheckSquare,
  ShieldCheck,
  CheckCircle,
  WarningCircle,
  XCircle,
  Clock,
  ArrowsClockwise,
  MagnifyingGlass,
  X,
  Eye,
  Check,
  Calendar,
  Truck,
  Cube,
  Sliders,
  Scales,
} from "@phosphor-icons/react";

export interface ComponentLot {
  lotId: string;
  lotCode: string;
  siloLocation: string;
  massKg: number;
  massSharePercent: number;
  moisturePercent: number;
  brokenPercent: number;
  measuredTricyclazoleMgKg: number;
  upperBound95MgKg: number;
}

export interface BlendPlanRecord {
  id: string;
  planCode: string;
  orderNumber: string;
  containerCode: string;
  targetMarket: string;
  targetCommodity: string;
  totalMassKg: number;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "STALE";
  proposedBy: string;
  proposedAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  mrlAssessment: {
    verdict: "PASS" | "WARNING" | "FAIL";
    substanceName: string;
    officialMrlMgKg: number;
    safetyThresholdMgKg: number;
    predictedBlendMgKg: number;
    bufferPercent: number;
  };
  predictedQuality: {
    predictedMoisturePercent: number;
    maxAllowedMoisturePercent: number;
    predictedBrokenPercent: number;
    maxAllowedBrokenPercent: number;
  };
  components: ComponentLot[];
}

const SEEDED_BLEND_PLANS: BlendPlanRecord[] = [
  {
    id: "plan-eu-01",
    planCode: "PLAN-2026-EU-001",
    orderNumber: "ORD-2026-EU-JASMIN",
    containerCode: "CONT-MSK-2026-01",
    targetMarket: "Liên minh Châu Âu (EU EC 396/2005)",
    targetCommodity: "Gạo thơm Jasmine 5% tấm",
    totalMassKg: 25000,
    status: "PENDING_REVIEW",
    proposedBy: "Trần Văn Bình (Export Officer)",
    proposedAt: "2026-11-14T10:30:00Z",
    mrlAssessment: {
      verdict: "PASS",
      substanceName: "Tricyclazole",
      officialMrlMgKg: 0.010,
      safetyThresholdMgKg: 0.008,
      predictedBlendMgKg: 0.0062,
      bufferPercent: 20,
    },
    predictedQuality: {
      predictedMoisturePercent: 14.1,
      maxAllowedMoisturePercent: 14.5,
      predictedBrokenPercent: 4.8,
      maxAllowedBrokenPercent: 5.0,
    },
    components: [
      {
        lotId: "lot-silo-01",
        lotCode: "LOT-SILO-01",
        siloLocation: "Silo S1 (Gạo nguyên liệu Thốt Nốt)",
        massKg: 15000,
        massSharePercent: 60,
        moisturePercent: 14.0,
        brokenPercent: 4.5,
        measuredTricyclazoleMgKg: 0.0055,
        upperBound95MgKg: 0.0070,
      },
      {
        lotId: "lot-silo-02",
        lotCode: "LOT-SILO-02",
        siloLocation: "Silo S2 (Gạo nguyên liệu An Giang)",
        massKg: 10000,
        massSharePercent: 40,
        moisturePercent: 14.2,
        brokenPercent: 5.2,
        measuredTricyclazoleMgKg: 0.0072,
        upperBound95MgKg: 0.0078,
      },
    ],
  },
  {
    id: "plan-us-02",
    planCode: "PLAN-2026-US-002",
    orderNumber: "ORD-2026-US-ST25",
    containerCode: "CONT-ONE-2026-04",
    targetMarket: "Hoa Kỳ (US FDA)",
    targetCommodity: "Gạo đặc sản ST25 Thượng hạng",
    totalMassKg: 24500,
    status: "PENDING_REVIEW",
    proposedBy: "Lê Thị Lan (Quality Supervisor)",
    proposedAt: "2026-11-15T08:15:00Z",
    mrlAssessment: {
      verdict: "PASS",
      substanceName: "Hexaconazole",
      officialMrlMgKg: 0.100,
      safetyThresholdMgKg: 0.080,
      predictedBlendMgKg: 0.024,
      bufferPercent: 20,
    },
    predictedQuality: {
      predictedMoisturePercent: 13.8,
      maxAllowedMoisturePercent: 14.0,
      predictedBrokenPercent: 3.5,
      maxAllowedBrokenPercent: 5.0,
    },
    components: [
      {
        lotId: "lot-silo-04",
        lotCode: "LOT-SILO-04",
        siloLocation: "Silo S4 (Gạo ST25 Sóc Trăng)",
        massKg: 24500,
        massSharePercent: 100,
        moisturePercent: 13.8,
        brokenPercent: 3.5,
        measuredTricyclazoleMgKg: 0.002,
        upperBound95MgKg: 0.003,
      },
    ],
  },
  {
    id: "plan-jp-03",
    planCode: "PLAN-2026-JP-003",
    orderNumber: "ORD-2026-JP-JAPONICA",
    containerCode: "CONT-CMA-2026-12",
    targetMarket: "Nhật Bản (MHLW Positive List)",
    targetCommodity: "Gạo tròn Japonica ĐX 2026",
    totalMassKg: 26000,
    status: "STALE",
    proposedBy: "Trần Văn Bình (Export Officer)",
    proposedAt: "2026-11-12T14:00:00Z",
    reviewNotes: "Lô Silo S3 vừa ghi nhận kết quả kiểm định phòng lab mới cập nhật, cần chạy lại đánh giá.",
    mrlAssessment: {
      verdict: "WARNING",
      substanceName: "Isoprothiolane",
      officialMrlMgKg: 0.200,
      safetyThresholdMgKg: 0.160,
      predictedBlendMgKg: 0.165,
      bufferPercent: 20,
    },
    predictedQuality: {
      predictedMoisturePercent: 14.3,
      maxAllowedMoisturePercent: 14.5,
      predictedBrokenPercent: 4.9,
      maxAllowedBrokenPercent: 5.0,
    },
    components: [
      {
        lotId: "lot-silo-03",
        lotCode: "LOT-SILO-03",
        siloLocation: "Silo S3 (Japonica Đồng Tháp)",
        massKg: 13000,
        massSharePercent: 50,
        moisturePercent: 14.4,
        brokenPercent: 4.8,
        measuredTricyclazoleMgKg: 0.012,
        upperBound95MgKg: 0.015,
      },
      {
        lotId: "lot-silo-05",
        lotCode: "LOT-SILO-05",
        siloLocation: "Silo S5 (Japonica Kiên Giang)",
        massKg: 13000,
        massSharePercent: 50,
        moisturePercent: 14.2,
        brokenPercent: 5.0,
        measuredTricyclazoleMgKg: 0.010,
        upperBound95MgKg: 0.012,
      },
    ],
  },
  {
    id: "plan-kr-04",
    planCode: "PLAN-2026-KR-004",
    orderNumber: "ORD-2026-KR-BROKEN",
    containerCode: "CONT-HMM-2026-08",
    targetMarket: "Hàn Quốc (MFDS PLS)",
    targetCommodity: "Gạo trắng hạt dài 10% tấm",
    totalMassKg: 25000,
    status: "APPROVED",
    proposedBy: "Nguyễn Hoàng Nam (Sales Manager)",
    proposedAt: "2026-11-10T09:00:00Z",
    reviewedBy: "Lê Nguyễn Hồng Phúc (Customer Manager)",
    reviewedAt: "2026-11-10T15:30:00Z",
    reviewNotes: "Phương án phối trộn đạt chuẩn chất lượng và biên an toàn 20%. Cho phép rút gạo từ silo thực thi xếp container.",
    mrlAssessment: {
      verdict: "PASS",
      substanceName: "Fenoxanil",
      officialMrlMgKg: 0.020,
      safetyThresholdMgKg: 0.016,
      predictedBlendMgKg: 0.009,
      bufferPercent: 20,
    },
    predictedQuality: {
      predictedMoisturePercent: 14.0,
      maxAllowedMoisturePercent: 14.5,
      predictedBrokenPercent: 8.5,
      maxAllowedBrokenPercent: 10.0,
    },
    components: [
      {
        lotId: "lot-silo-06",
        lotCode: "LOT-SILO-06",
        siloLocation: "Silo S6 (Gạo hạt dài Long An)",
        massKg: 25000,
        massSharePercent: 100,
        moisturePercent: 14.0,
        brokenPercent: 8.5,
        measuredTricyclazoleMgKg: 0.004,
        upperBound95MgKg: 0.006,
      },
    ],
  },
];

export const BlendPlansPendingPage: React.FC = () => {
  const { planId } = useParams<{ planId?: string }>();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<BlendPlanRecord[]>(SEEDED_BLEND_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => planId ?? null);
  const [prevRoutePlanId, setPrevRoutePlanId] = useState<string | undefined>(planId);

  // Synchronize during render ONLY when route planId parameter actually changes
  if (planId !== prevRoutePlanId) {
    setPrevRoutePlanId(planId);
    setSelectedPlanId(planId ?? null);
  }

  const handleCloseModal = useCallback(() => {
    setSelectedPlanId(null);
    if (planId) {
      navigate("/export/plans/pending", { replace: true });
    }
  }, [navigate, planId]);

  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return null;
    return plans.find((p) => p.id === selectedPlanId || p.planCode === selectedPlanId) || null;
  }, [plans, selectedPlanId]);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Review & Approval state
  const [reviewNotes, setReviewNotes] = useState("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // KPI stats
  const kpiTotal = plans.length;
  const kpiPending = plans.filter((p) => p.status === "PENDING_REVIEW").length;
  const kpiApproved = plans.filter((p) => p.status === "APPROVED").length;
  const kpiStale = plans.filter((p) => p.status === "STALE").length;

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchSearch =
        !debouncedSearch ||
        plan.planCode.toLowerCase().includes(debouncedSearch) ||
        plan.orderNumber.toLowerCase().includes(debouncedSearch) ||
        plan.containerCode.toLowerCase().includes(debouncedSearch) ||
        plan.targetMarket.toLowerCase().includes(debouncedSearch) ||
        plan.targetCommodity.toLowerCase().includes(debouncedSearch);

      const matchStatus =
        statusFilter === "ALL" || plan.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [plans, debouncedSearch, statusFilter]);

  // Handle Approve Plan
  const handleApprovePlan = (plan: BlendPlanRecord) => {
    const updated = plans.map((p) =>
      p.id === plan.id
        ? {
            ...p,
            status: "APPROVED" as const,
            reviewedBy: "Lê Nguyễn Hồng Phúc (Customer Manager)",
            reviewedAt: new Date().toISOString(),
            reviewNotes:
              reviewNotes.trim() ||
              "Phương án phối trộn đạt chuẩn chất lượng và biên an toàn 20%. Cho phép xuất kho.",
          }
        : p,
    );
    setPlans(updated);
    setSuccessMsg(
      `Đã phê duyệt thành công phương án "${plan.planCode}" cho container ${plan.containerCode}! Lệnh rút gạo từ Silo đã được cấp phép.`,
    );
    handleCloseModal();
    setReviewNotes("");
  };

  // Handle Reject Plan
  const handleConfirmReject = () => {
    if (!selectedPlan) return;
    const updated = plans.map((p) =>
      p.id === selectedPlan.id
        ? {
            ...p,
            status: "REJECTED" as const,
            reviewedBy: "Lê Nguyễn Hồng Phúc (Customer Manager)",
            reviewedAt: new Date().toISOString(),
            reviewNotes:
              rejectionReason.trim() ||
              "Từ chối phương án phối trộn do không đáp ứng yêu cầu biên an toàn.",
          }
        : p,
    );
    setPlans(updated);
    setSuccessMsg(
      `Đã từ chối phương án "${selectedPlan.planCode}". Đã gửi yêu cầu bộ phận xuất khẩu tính toán lại công thức.`,
    );
    setIsRejectModalOpen(false);
    handleCloseModal();
    setRejectionReason("");
  };

  const getStatusBadge = (status: BlendPlanRecord["status"]) => {
    switch (status) {
      case "APPROVED":
        return <StatusBadge status="COMPLIANT" label="ĐÃ PHÊ DUYỆT" />;
      case "PENDING_REVIEW":
        return <StatusBadge status="PENDING" label="CHỜ THẨM ĐỊNH" />;
      case "STALE":
        return <StatusBadge status="STALE" label="HẾT HẠN HIỆU LỰC (STALE)" />;
      case "REJECTED":
        return <StatusBadge status="REJECTED" label="BỊ TỪ CHỐI" />;
      default:
        return <StatusBadge status={"PENDING" as StatusType} label={status} />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-mono font-bold text-accent-primary uppercase tracking-wider block"
          >
            THẨM ĐỊNH & PHÊ DUYỆT XUẤT KHẨU
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            Duyệt Phương Án Phối Trộn (Blend Plan Approval)
          </h2>
          <p
            data-ui-detail="secondary"
            className="text-xs text-ink-secondary mt-0.5"
          >
            Thẩm định công thức phối trộn rút gạo từ các silo, đối soát tỷ lệ tấm, độ ẩm và kiểm tra dư lượng MRL kèm biên an toàn 20% trước khi cho phép công nhân thực thi xếp hàng container.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/compliance/safety-margin"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-primary font-semibold text-xs transition-colors"
          >
            <Sliders size={15} className="text-accent-primary" />
            <span>Biên an toàn MRL</span>
          </Link>
          <button
            type="button"
            onClick={() => setPlans(SEEDED_BLEND_PLANS)}
            className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors"
            title="Làm mới danh sách"
          >
            <ArrowsClockwise size={16} />
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-functional-balanced-bg border border-functional-balanced-border/40 text-accent-primary text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} weight="fill" className="shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-ink-tertiary hover:text-ink-primary"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1.5">
            <span className="text-xs font-medium">Tổng số phương án</span>
            <CheckSquare size={18} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-bold font-display text-ink-primary">
            {kpiTotal}
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Kế hoạch phối trộn các đơn hàng
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1.5">
            <span className="text-xs font-medium">Chờ thẩm định duyệt</span>
            <Clock size={18} className="text-accent-warning" />
          </div>
          <div className="text-2xl font-bold font-display text-ink-primary">
            {kpiPending}
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Customer Manager cần ký duyệt
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1.5">
            <span className="text-xs font-medium">Đã duyệt xuất kho</span>
            <ShieldCheck size={18} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-bold font-display text-ink-primary">
            {kpiApproved}
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Đủ điều kiện xuất hàng
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1.5">
            <span className="text-xs font-medium">Cảnh báo STALE</span>
            <WarningCircle size={18} className="text-accent-danger" />
          </div>
          <div className="text-2xl font-bold font-display text-ink-primary">
            {kpiStale}
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Có kết quả Lab mới, cần tính lại
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3 relative">
            <MagnifyingGlass
              className="absolute left-3 top-2.5 text-ink-tertiary"
              size={16}
            />
            <input
              type="text"
              placeholder="Tìm theo mã phương án, số đơn hàng, container, thị trường..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary placeholder:text-ink-tertiary focus:border-accent-primary focus:outline-none focus:rounded-lg transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 p-0.5 text-ink-tertiary hover:text-ink-primary transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary focus:border-accent-primary focus:outline-none transition-colors"
            >
              <option value="ALL">Tất cả trạng thái duyệt</option>
              <option value="PENDING_REVIEW">Chờ thẩm định ({kpiPending})</option>
              <option value="APPROVED">Đã phê duyệt ({kpiApproved})</option>
              <option value="STALE">Cảnh báo STALE ({kpiStale})</option>
              <option value="REJECTED">Bị từ chối</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-ink-secondary pt-1 border-t border-ink-tertiary/10">
          <span>
            Hiển thị <strong className="text-ink-primary">{filteredPlans.length}</strong> trên tổng số <strong className="text-ink-primary">{plans.length}</strong> phương án phối trộn
          </span>
          <span className="font-mono text-xs text-accent-primary font-bold">
            Biên an toàn bắt buộc: -20% Buffer
          </span>
        </div>
      </div>

      {/* Plans Table */}
      <div className="rounded-xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/15 text-ink-secondary font-semibold uppercase tracking-wider text-xs">
                <th className="py-3.5 px-4">Phương án & Thời gian</th>
                <th className="py-3.5 px-4">Container & Đơn hàng</th>
                <th className="py-3.5 px-4">Thị trường & Loại gạo</th>
                <th className="py-3.5 px-4">Khối lượng</th>
                <th className="py-3.5 px-4">Đánh giá MRL (-20%)</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-tertiary/10">
              {filteredPlans.map((plan) => (
                <tr
                  key={plan.id}
                  className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors"
                >
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-mono font-bold text-ink-primary text-xs">
                      {plan.planCode}
                    </div>
                    <div className="flex items-center gap-1.5 text-ink-tertiary text-[11px] mt-0.5">
                      <Calendar size={13} />
                      <span>{new Date(plan.proposedAt).toLocaleString("vi-VN")}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono text-xs text-ink-primary font-semibold">
                      <Truck size={14} className="text-sky-500" />
                      <span>{plan.containerCode}</span>
                    </div>
                    <span className="text-[11px] text-ink-tertiary block font-mono">
                      {plan.orderNumber}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 max-w-[220px]">
                    <div className="font-semibold text-ink-primary truncate">
                      {plan.targetCommodity}
                    </div>
                    <span className="text-[11px] text-accent-primary font-medium block truncate">
                      {plan.targetMarket}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-ink-primary">
                    {plan.totalMassKg.toLocaleString("vi-VN")} kg
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {plan.mrlAssessment.verdict === "PASS" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-functional-balanced-bg border border-accent-primary/20 text-accent-primary font-semibold text-[11px]">
                        <CheckCircle size={13} weight="fill" />
                        <span>Đạt chuẩn MRL (-20%)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-functional-hold-bg border border-accent-warning/30 text-accent-warning font-semibold text-[11px]">
                        <WarningCircle size={13} weight="fill" />
                        <span>Cảnh báo tiệm cận biên</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getStatusBadge(plan.status)}
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-primary text-xs font-semibold transition-colors"
                        title="Thẩm định chi tiết công thức phối trộn"
                      >
                        <Eye size={14} />
                        <span>Thẩm định</span>
                      </button>
                      {plan.status === "PENDING_REVIEW" && (
                        <button
                          type="button"
                          onClick={() => handleApprovePlan(plan)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-primary-dim transition-colors shadow-xs"
                          title="Phê duyệt phương án xuất kho"
                        >
                          <Check size={14} weight="bold" />
                          <span>Duyệt</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Thẩm Định Chi Tiết Phương Án Phối Trộn */}
      <Modal
        isOpen={Boolean(selectedPlan)}
        onClose={handleCloseModal}
        ariaLabel="Thẩm định phương án phối trộn"
      >
        {selectedPlan && (
          <div className="w-full max-w-3xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in">
            <header className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between bg-surface-raised">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                  <CheckSquare size={18} weight="bold" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-ink-primary">
                    Mã phương án: {selectedPlan.planCode}
                  </h2>
                  <p className="text-[11px] text-ink-secondary">
                    Hồ sơ thẩm định phương án phối trộn xuất khẩu (Blend Plan Review)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </header>

            <div className="p-5 space-y-4 text-xs">
              {/* Stale Alert if STALE */}
              {selectedPlan.status === "STALE" && (
                <StalePlanBanner
                  planId={selectedPlan.planCode}
                  orderId={selectedPlan.orderNumber}
                  containerId={selectedPlan.containerCode}
                  reason={selectedPlan.reviewNotes || undefined}
                />
              )}

              {/* General Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 text-xs">
                <div>
                  <span className="text-ink-tertiary block">Container xếp hàng:</span>
                  <span className="font-mono font-bold text-ink-primary">
                    {selectedPlan.containerCode}
                  </span>
                </div>
                <div>
                  <span className="text-ink-tertiary block">Đơn hàng xuất khẩu:</span>
                  <span className="font-mono font-bold text-accent-primary">
                    {selectedPlan.orderNumber}
                  </span>
                </div>
                <div>
                  <span className="text-ink-tertiary block">Tổng khối lượng:</span>
                  <span className="font-mono font-bold text-ink-primary">
                    {selectedPlan.totalMassKg.toLocaleString("vi-VN")} kg
                  </span>
                </div>
                <div>
                  <span className="text-ink-tertiary block">Trạng thái hiện tại:</span>
                  <div className="mt-0.5">{getStatusBadge(selectedPlan.status)}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-ink-tertiary block">Hàng hóa & Thị trường:</span>
                  <span className="font-medium text-ink-primary">
                    {selectedPlan.targetCommodity} &mdash; {selectedPlan.targetMarket}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-ink-tertiary block">Người lập phương án:</span>
                  <span className="text-ink-secondary">
                    {selectedPlan.proposedBy} ({new Date(selectedPlan.proposedAt).toLocaleString("vi-VN")})
                  </span>
                </div>
              </div>

              {/* Component Silo Lots Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-ink-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Cube size={16} className="text-accent-primary" />
                  <span>Tỷ lệ thành phần các lô rút từ Silo (Component Silo Lots)</span>
                </h4>
                <div className="rounded-xl border border-ink-tertiary/15 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/15 text-ink-secondary font-semibold uppercase text-[11px]">
                        <th className="py-2.5 px-3">Lô & Vị trí Silo</th>
                        <th className="py-2.5 px-3">Khối lượng</th>
                        <th className="py-2.5 px-3">Tỷ lệ (% Mass)</th>
                        <th className="py-2.5 px-3">Độ ẩm</th>
                        <th className="py-2.5 px-3">Độ tấm</th>
                        <th className="py-2.5 px-3">Dư lượng Tricyclazole</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-tertiary/10">
                      {selectedPlan.components.map((comp) => (
                        <tr key={comp.lotId} className="hover:bg-surface-raised/40 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-ink-primary block">
                              {comp.lotCode}
                            </span>
                            <span className="text-[11px] text-ink-tertiary">{comp.siloLocation}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-ink-primary font-semibold">
                            {comp.massKg.toLocaleString("vi-VN")} kg
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-accent-primary">
                            {comp.massSharePercent}%
                          </td>
                          <td className="py-2.5 px-3 font-mono text-ink-secondary">
                            {comp.moisturePercent}%
                          </td>
                          <td className="py-2.5 px-3 font-mono text-ink-secondary">
                            {comp.brokenPercent}%
                          </td>
                          <td className="py-2.5 px-3 font-mono text-ink-primary">
                            {comp.measuredTricyclazoleMgKg.toFixed(4)} mg/kg
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Predicted Output Quality vs MRL Buffer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 space-y-2 text-xs">
                  <span className="font-bold text-ink-primary flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Scales size={15} className="text-accent-primary" />
                    <span>Dự báo phẩm chất mẻ phối trộn:</span>
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-ink-secondary">Độ ẩm dự báo:</span>
                      <span className="font-mono font-bold text-accent-primary">
                        {selectedPlan.predictedQuality.predictedMoisturePercent}% (Yêu cầu &le; {selectedPlan.predictedQuality.maxAllowedMoisturePercent}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-secondary">Độ tấm dự báo:</span>
                      <span className="font-mono font-bold text-accent-primary">
                        {selectedPlan.predictedQuality.predictedBrokenPercent}% (Yêu cầu &le; {selectedPlan.predictedQuality.maxAllowedBrokenPercent}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 space-y-2 text-xs">
                  <span className="font-bold text-ink-primary flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <ShieldCheck size={15} className="text-accent-primary" />
                    <span>Đánh giá MRL & Biên an toàn 20%:</span>
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-ink-secondary">Dư lượng dự báo:</span>
                      <span className="font-mono font-bold text-accent-primary">
                        {selectedPlan.mrlAssessment.predictedBlendMgKg.toFixed(4)} mg/kg
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-secondary">Ngưỡng an toàn sau -20%:</span>
                      <span className="font-mono font-bold text-ink-primary">
                        {selectedPlan.mrlAssessment.safetyThresholdMgKg.toFixed(4)} mg/kg (MRL: {selectedPlan.mrlAssessment.officialMrlMgKg.toFixed(4)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Approval Notes Form if Pending */}
              {selectedPlan.status === "PENDING_REVIEW" && (
                <div className="space-y-2 text-xs">
                  <label className="block font-medium text-ink-secondary">
                    Ghi chú thẩm định & chỉ thị vận hành (Approval Notes):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ví dụ: Đã kiểm tra tính toán Mass Balance và biên an toàn 20%. Phê duyệt cho phép ca trực rút gạo theo đúng tỷ lệ."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary focus:border-accent-primary focus:outline-none transition-colors"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-lg border border-ink-tertiary/20 hover:bg-surface-raised font-semibold text-ink-secondary text-xs transition-colors"
                >
                  Đóng
                </button>

                {selectedPlan.status === "PENDING_REVIEW" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRejectModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-accent-danger/30 text-accent-danger hover:bg-functional-rejected-bg text-xs font-semibold transition-colors"
                    >
                      <XCircle size={15} />
                      <span>Từ chối phương án</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprovePlan(selectedPlan)}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-primary-dim transition-colors shadow-xs"
                    >
                      <CheckCircle size={15} weight="bold" />
                      <span>Phê duyệt xuất kho</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Từ Chối Phương Án */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        ariaLabel="Từ chối phương án phối trộn"
      >
        <div className="w-full max-w-md bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in">
          <header className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between bg-surface-raised">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-accent-danger/10 text-accent-danger flex items-center justify-center shrink-0">
                <XCircle size={18} weight="bold" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-ink-primary">
                  Từ Chối Phương Án Phối Trộn
                </h2>
                <p className="text-[11px] text-ink-secondary">
                  Yêu cầu bộ phận xuất khẩu điều chỉnh lại công thức hoặc đổi silo
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRejectModalOpen(false)}
              className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </header>

          <div className="p-5 space-y-4 text-xs">
            <p className="text-ink-secondary">
              Vui lòng nhập lý do từ chối để bộ phận lập kế hoạch xuất khẩu điều chỉnh lại công thức hoặc hoán đổi lô nguyên liệu thành phần:
            </p>

            <div>
              <textarea
                rows={3}
                required
                placeholder="Ví dụ: Tỷ lệ nồng độ Tricyclazole tiệm cận biên an toàn 20%. Đề nghị thay thế lô Silo 02 bằng lô Silo 04 có dư lượng thấp hơn."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full py-2 px-3 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary focus:border-accent-danger focus:outline-none transition-colors"
              />
            </div>

            <div className="pt-3 border-t border-ink-tertiary/15 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-ink-tertiary/20 hover:bg-surface-raised font-semibold text-ink-secondary text-xs transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-lg bg-accent-danger text-white font-semibold hover:bg-accent-danger/90 transition-colors shadow-xs text-xs"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};