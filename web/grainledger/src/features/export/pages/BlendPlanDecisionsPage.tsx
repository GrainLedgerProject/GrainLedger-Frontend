import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { exportEndpoints } from "@/api/exports";
import { planningEndpoints } from "@/api/planning";
import { ApiError } from "@/api/client";
import type { BlendPlanDecision } from "@/api/planning";
import { useAuthStore } from "@/app/store/authStore";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Modal } from "@/shared/ui/Modal";
import { StatusBadge, type StatusType } from "@/shared/ui/StatusBadge";
import {
  ArrowClockwise,
  ArrowLeft,
  ArrowsClockwise,
  Calendar,
  CheckCircle,
  CheckSquare,
  ClockCounterClockwise,
  FileText,
  Package,
  ShieldCheck,
  Truck,
  WarningCircle,
  X,
  XCircle,
} from "@phosphor-icons/react";

const assessmentSchema = z.object({
  assessmentStatus: z.string(),
  predictedOutputKg: z.string().nullable().optional(),
  selection: z
    .object({
      allocations: z.array(
        z.object({
          lotId: z.string(),
          locationId: z.string(),
          lotCode: z.string(),
          quantityKg: z.string(),
        }),
      ),
    })
    .nullable()
    .optional(),
});

const labels: Record<BlendPlanDecision["status"], string> = {
  PENDING: "Chờ quyết định",
  APPROVED: "Đã phê duyệt",
  REJECTED: "Đã từ chối",
  REVOKED: "Đã thu hồi",
};

const badges: Record<BlendPlanDecision["status"], StatusType> = {
  PENDING: "PENDING",
  APPROVED: "COMPLIANT",
  REJECTED: "REJECTED",
  REVOKED: "CLOSED",
};

const actions = {
  approve: "Phê duyệt",
  reject: "Từ chối",
  revoke: "Thu hồi phê duyệt",
} as const;

const reservations: Record<
  BlendPlanDecision["reservation"]["status"],
  string
> = {
  NOT_RESERVED: "Chưa giữ tồn",
  HELD: "Đang giữ tồn",
  CONSUMED: "Đã sử dụng",
  RELEASED: "Đã giải phóng",
  SETTLED: "Đã hoàn tất",
};

type Action = keyof typeof actions;

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Không thể kết nối máy chủ.";

export function BlendPlanDecisionsPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const { i18n } = useTranslation();
  const isEn = i18n?.language?.startsWith("en") ?? false;
  const text = (vi: string, en: string) => (isEn ? en : vi);

  const canDecide = useAuthStore(
    (state) => state.user?.permissions.includes("blend.approve") ?? false,
  );

  const [orderId, setOrderId] = useState("");
  const [containerId, setContainerId] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const [containerPage, setContainerPage] = useState(1);
  const [planPage, setPlanPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState<{
    action: Action;
    decision: BlendPlanDecision;
    operationId: string;
  } | null>(null);
  const [reason, setReason] = useState("");

  const orders = useQuery({
    queryKey: ["review-orders", orderPage],
    queryFn: () => exportEndpoints.getOrders({ page: orderPage, pageSize: 20 }),
    enabled: !planId,
  });

  const containers = useQuery({
    queryKey: ["review-containers", orderId, containerPage],
    queryFn: () =>
      exportEndpoints.getContainers(orderId, {
        page: containerPage,
        pageSize: 20,
      }),
    enabled: !planId && Boolean(orderId),
  });

  const plans = useQuery({
    queryKey: ["review-plans", containerId, planPage],
    queryFn: () =>
      planningEndpoints.getBlendPlans(containerId, {
        page: planPage,
        pageSize: 20,
      }),
    enabled: !planId && Boolean(containerId),
  });

  const plan = useQuery({
    queryKey: ["review-plan", planId],
    queryFn: () => planningEndpoints.getBlendPlan(planId!),
    enabled: Boolean(planId),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const proposal = useQuery({
    queryKey: ["review-proposal", planId],
    queryFn: () => planningEndpoints.getProposal(planId!),
    enabled: Boolean(planId && plan.data?.hasProposal),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const decision = useQuery({
    queryKey: ["review-decision", planId],
    queryFn: () => planningEndpoints.getDecision(planId!),
    enabled: Boolean(planId && plan.data?.hasProposal),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const assessment = assessmentSchema.safeParse(proposal.data?.assessment);

  const canApprove =
    decision.data?.status === "PENDING" &&
    proposal.data?.freshness === "CURRENT" &&
    decision.data.proposalId === proposal.data.id &&
    proposal.data.demandCurrent &&
    proposal.data.stockAndEvidenceCurrent === true &&
    assessment.success &&
    assessment.data.assessmentStatus === "PASS";

  const mutation = useMutation({
    mutationFn: async () => {
      if (!pending || !planId) {
        throw new Error(text("Chưa chọn phương án.", "No blend plan selected."));
      }
      const request = {
        operationId: pending.operationId,
        proposalId: pending.decision.proposalId,
        expectedDecisionVersion: pending.decision.decisionVersion,
      };
      if (pending.action === "approve") {
        return planningEndpoints.approvePlan(planId, request);
      }
      if (!reason.trim()) {
        throw new Error(text("Vui lòng nhập lý do.", "Please provide a reason."));
      }
      return pending.action === "reject"
        ? planningEndpoints.rejectPlan(planId, {
            ...request,
            reason: reason.trim(),
          })
        : planningEndpoints.revokePlan(planId, {
            ...request,
            reason: reason.trim(),
          });
    },
    onSuccess: (updated) => {
      cache.setQueryData(["review-decision", planId], updated);
      setNotice(`Đã ghi nhận: ${labels[updated.status]}.`);
      setPending(null);
      setActionError("");
      void cache.invalidateQueries({ queryKey: ["review-proposal", planId] });
      void cache.invalidateQueries({ queryKey: ["review-plans"] });
    },
    onError: (error) => {
      setActionError(
        error instanceof ApiError && error.status === 409
          ? `Dữ liệu đã thay đổi. ${error.message} Tải lại thông tin trước khi quyết định lại.`
          : message(error),
      );
      if (error instanceof ApiError && error.status === 409) {
        setPending(null);
        void cache.invalidateQueries({ queryKey: ["review-decision", planId] });
        void cache.invalidateQueries({ queryKey: ["review-proposal", planId] });
      }
    },
  });

  function begin(action: Action) {
    if (!decision.data) return;
    setPending({
      action,
      decision: decision.data,
      operationId: crypto.randomUUID(),
    });
    setReason("");
    setActionError("");
    setNotice("");
  }

  const errors = [
    orders.error,
    containers.error,
    plans.error,
    plan.error,
    proposal.error,
    decision.error,
  ].filter(Boolean);

  const fetching =
    orders.isFetching ||
    containers.isFetching ||
    plans.isFetching ||
    plan.isFetching ||
    proposal.isFetching ||
    decision.isFetching;

  const handleRefresh = () => {
    setActionError("");
    void cache.invalidateQueries({
      predicate: (query) => String(query.queryKey[0]).startsWith("review-"),
    });
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      return new Date(isoString).toLocaleString(isEn ? "en-GB" : "vi-VN");
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {text("Thẩm định xuất khẩu", "Export Review & Decisions")}
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            {text("Duyệt phương án phối trộn", "Blend Plan Decisions")}
          </h2>
          <p
            data-ui-detail="secondary"
            className="text-xs text-ink-secondary mt-0.5"
          >
            {text(
              "Xem đề xuất, kiểm tra hiệu lực và ghi nhận quyết định trên máy chủ.",
              "Review proposals, verify stock and residue freshness, and record decisions.",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={fetching || mutation.isPending}
            className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors"
            title={text("Tải lại", "Reload")}
          >
            <ArrowsClockwise
              size={16}
              className={fetching ? "motion-safe:animate-spin" : undefined}
            />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {notice && (
        <div
          role="status"
          className="p-3.5 rounded-lg bg-functional-balanced-bg border border-functional-balanced-border/40 text-accent-primary text-xs flex items-center gap-2"
        >
          <CheckCircle size={18} weight="fill" className="shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {errors.map((err, i) => (
        <div
          key={i}
          role="alert"
          className="p-3.5 rounded-lg bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2"
        >
          <WarningCircle size={18} weight="fill" className="shrink-0" />
          <span>{message(err)}</span>
        </div>
      ))}
      {actionError && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2"
        >
          <WarningCircle size={18} weight="fill" className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* View 1: List & Select Container */}
      {!planId ? (
        <div className="space-y-6">
          {/* Order & Container Selection Card */}
          <div className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised shadow-xs p-5">
            <h3 className="text-sm font-semibold text-ink-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Truck size={18} className="text-accent-primary" />
              <span>
                {text(
                  "Chọn Đơn Hàng & Container Cần Thẩm Định",
                  "Select Order & Target Container",
                )}
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Export Order Select */}
              <div className="space-y-1.5">
                <label
                  htmlFor="review-order"
                  className="block text-xs font-semibold text-ink-secondary"
                >
                  {text("Đơn hàng xuất khẩu", "Export Order")}
                </label>
                <select
                  id="review-order"
                  value={orderId}
                  disabled={orders.isFetching}
                  onChange={(e) => {
                    setOrderId(e.target.value);
                    setContainerId("");
                    setContainerPage(1);
                    setPlanPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none font-medium"
                >
                  <option value="">
                    {orders.isFetching
                      ? text("Đang tải…", "Loading…")
                      : text("Chọn đơn hàng", "Select order")}
                  </option>
                  {orders.data?.items.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.code} · {order.shippingTo}
                    </option>
                  ))}
                </select>
                <PageButtons
                  page={orderPage}
                  hasMore={orders.data?.hasMore ?? false}
                  busy={orders.isFetching}
                  onChange={(page) => {
                    setOrderPage(page);
                    setOrderId("");
                    setContainerId("");
                  }}
                  isEn={isEn}
                />
                {orders.isSuccess && orders.data.items.length === 0 && (
                  <p className="text-xs text-ink-secondary">
                    {text(
                      "Chưa có đơn hàng trong phạm vi được phép xem.",
                      "No orders available within your view scope.",
                    )}
                  </p>
                )}
              </div>

              {/* Container Select */}
              <div className="space-y-1.5">
                <label
                  htmlFor="review-container"
                  className="block text-xs font-semibold text-ink-secondary"
                >
                  {text("Container", "Container")}
                </label>
                <select
                  id="review-container"
                  value={containerId}
                  disabled={!orderId || containers.isFetching}
                  onChange={(e) => {
                    setContainerId(e.target.value);
                    setPlanPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none font-medium disabled:opacity-50"
                >
                  <option value="">
                    {!orderId
                      ? text("Chọn đơn hàng trước", "Select order first")
                      : containers.isFetching
                        ? text("Đang tải…", "Loading…")
                        : text("Chọn container", "Select container")}
                  </option>
                  {containers.data?.items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.internalCode} · {c.targetMassKg} kg · {c.status}
                    </option>
                  ))}
                </select>
                <PageButtons
                  page={containerPage}
                  hasMore={containers.data?.hasMore ?? false}
                  busy={!orderId || containers.isFetching}
                  onChange={(page) => {
                    setContainerPage(page);
                    setContainerId("");
                  }}
                  isEn={isEn}
                />
                {containers.isSuccess && containers.data.items.length === 0 && (
                  <p className="text-xs text-ink-secondary">
                    {text(
                      "Đơn hàng chưa có container.",
                      "This order has no containers.",
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Container's Blend Plans */}
          {containerId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
                  <FileText size={18} className="text-accent-primary" />
                  <span>
                    {text(
                      "Phương án của container",
                      "Blend plans for this container",
                    )}
                  </span>
                </h3>
              </div>

              {plans.isFetching ? (
                <div className="py-16 flex justify-center">
                  <GrainLoader
                    label={text(
                      "Đang tải phương án…",
                      "Loading blend plans…",
                    )}
                  />
                </div>
              ) : plans.data?.items.length === 0 ? (
                <div className="rounded-xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised p-12 text-center space-y-2">
                  <FileText
                    size={36}
                    className="mx-auto text-ink-tertiary opacity-60"
                  />
                  <p className="text-sm font-semibold text-ink-primary">
                    {text(
                      "Chưa có phương án cho container này.",
                      "No blend plans for this container.",
                    )}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/20 text-ink-secondary font-semibold uppercase tracking-wider text-xs">
                        <tr>
                          <th className="py-3 px-4">
                            {text("Phiên bản", "Version")}
                          </th>
                          <th className="py-3 px-4">
                            {text("Sản phẩm đích", "Target Product")}
                          </th>
                          <th className="py-3 px-4 text-right">
                            {text("Khối lượng (kg)", "Target Mass (kg)")}
                          </th>
                          <th className="py-3 px-4">
                            {text("Thời điểm tạo", "Created At")}
                          </th>
                          <th className="py-3 px-4">
                            {text("Trạng thái", "Status")}
                          </th>
                          <th className="py-3 px-4 text-right">
                            {text("Thao tác", "Action")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-tertiary/10">
                        {plans.data?.items.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors"
                          >
                            <td className="py-3 px-4 font-mono font-bold text-accent-primary">
                              v{item.versionNo}
                            </td>
                            <td className="py-3 px-4 font-semibold text-ink-primary">
                              {item.targetProductIdentity ??
                                text("Chưa xác định sản phẩm", "Unspecified")}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold">
                              {item.targetMassKg} kg
                            </td>
                            <td className="py-3 px-4 font-mono text-ink-secondary">
                              <span className="inline-flex items-center gap-1">
                                <Calendar size={13} />
                                <span>{formatDate(item.createdAt)}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge
                                status={
                                  item.hasProposal
                                    ? "PENDING"
                                    : item.status === "CANCELLED"
                                      ? "REJECTED"
                                      : "IN_PROGRESS"
                                }
                                label={
                                  item.hasProposal
                                    ? text("Xem quyết định", "Pending Review")
                                    : item.status === "CANCELLED"
                                      ? text("Đã hủy", "Cancelled")
                                      : text("Bản nháp", "Draft")
                                }
                              />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Link
                                to={`/export/plans/${item.id}/review`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs"
                              >
                                <span>{text("Xem quyết định", "Review")}</span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <PageButtons
                page={planPage}
                hasMore={plans.data?.hasMore ?? false}
                busy={plans.isFetching}
                onChange={setPlanPage}
                isEn={isEn}
              />
            </div>
          )}
        </div>
      ) : (
        /* View 2: Detailed Review of a Plan */
        <div className="space-y-6">
          {/* Back Navigation Button */}
          <div>
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => navigate("/export/plans/pending")}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised font-semibold text-xs text-ink-secondary hover:text-ink-primary transition-colors shadow-xs"
            >
              <ArrowLeft size={14} weight="bold" />
              <span>{text("← Danh sách phương án", "← Back to plans")}</span>
            </button>
          </div>

          {plan.isFetching ? (
            <div className="py-16 flex justify-center">
              <GrainLoader
                label={text(
                  "Đang tải phương án…",
                  "Loading blend plan…",
                )}
              />
            </div>
          ) : plan.data ? (
            <div className="space-y-6">
              {/* Header Info Panel */}
              <div className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised shadow-xs p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-tertiary/15 pb-4">
                  <div>
                    <h3 className="text-xl font-display font-bold text-ink-primary">
                      Phương án v{plan.data.versionNo} ·{" "}
                      {plan.data.targetProductIdentity ??
                        text("Chưa xác định sản phẩm", "Unspecified product")}
                    </h3>
                    <p className="mt-1 break-all text-xs text-ink-secondary font-mono">
                      {text("Mã phương án:", "Plan ID:")} {plan.data.id}
                    </p>
                  </div>

                  {decision.data && (
                    <div>
                      <StatusBadge
                        status={badges[decision.data.status]}
                        label={labels[decision.data.status]}
                        size="md"
                      />
                    </div>
                  )}
                </div>

                {/* Metadata Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <InfoCard
                    label={text("Khối lượng mục tiêu", "Target Mass")}
                    value={`${plan.data.targetMassKg} kg`}
                    icon={Package}
                  />
                  <InfoCard
                    label={text("Thời điểm tạo", "Created At")}
                    value={formatDate(plan.data.createdAt)}
                    icon={Calendar}
                  />
                  <InfoCard
                    label={text("Mã Container", "Container ID")}
                    value={plan.data.containerId.slice(0, 13)}
                    icon={Truck}
                  />
                  <InfoCard
                    label={text("Mã Đơn hàng", "Order ID")}
                    value={plan.data.orderId.slice(0, 13)}
                    icon={FileText}
                  />
                </div>

                {!plan.data.hasProposal && (
                  <div className="p-4 rounded-xl bg-surface-raised dark:bg-surface-overlay text-ink-secondary text-xs flex items-center gap-2">
                    <WarningCircle size={18} className="text-accent-warning shrink-0" />
                    <span>
                      {text(
                        "Phương án chưa có đề xuất để thẩm định.",
                        "This plan has no proposal submitted yet.",
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Proposal & Assessment Section */}
              {proposal.data && (
                <div className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised shadow-xs p-5 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-display font-bold text-base text-ink-primary flex items-center gap-2">
                        <ShieldCheck size={20} className="text-accent-primary" />
                        <span>
                          {text(
                            "Kết Quả Đánh Giá & Thẩm Định Đề Xuất",
                            "Assessment & Proposal Results",
                          )}
                        </span>
                      </h4>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        {text(
                          "Kiểm tra tính khả thi công thức, dư lượng MRL và đồng bộ số dư kho.",
                          "Verify formula viability, MRL limits, and warehouse inventory sync.",
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Stale Warning Banner (Inline without importing messages.ts) */}
                  {proposal.data.freshness === "STALE" && (
                    <div
                      className="p-4 rounded-xl border-2 border-functional-stale-border bg-functional-stale-bg dark:bg-functional-stale-bg/40 text-ink-primary shadow-xs"
                      role="alert"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded bg-accent-warning text-ink-primary shrink-0 mt-0.5">
                          <WarningCircle size={20} weight="fill" />
                        </div>
                        <div className="flex-1 space-y-1 text-xs">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-bold text-accent-warning text-sm">
                              {text(
                                "Phương án phối trộn đã cũ (STALE)",
                                "Blend plan is STALE",
                              )}
                            </span>
                            <span className="font-mono text-ink-secondary bg-surface-base px-2 py-0.5 rounded border border-functional-stale-border/40">
                              {plan.data.id}
                            </span>
                          </div>
                          <p className="text-ink-secondary leading-normal">
                            <strong>{text("Nguyên nhân:", "Reason:")}</strong>{" "}
                            {proposal.data.freshnessReasons?.join("; ") ||
                              text(
                                "Có kết quả kiểm nghiệm mới hoặc thay đổi tồn kho của các lô nguyên liệu thành phần.",
                                "New lab results or inventory changes on component lots.",
                              )}
                          </p>
                          <div className="pt-2 flex items-center gap-3">
                            <Link
                              to={`/export/orders/${plan.data.orderId}/containers/${plan.data.containerId}/plan`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-accent-warning text-ink-primary hover:opacity-90 transition-colors shadow-xs"
                            >
                              <ArrowClockwise size={14} weight="bold" />
                              {text(
                                "Yêu cầu đánh giá lại phương án",
                                "Request re-assessment",
                              )}
                            </Link>
                            <span className="text-ink-tertiary">
                              {text(
                                "Đề xuất đã cũ. Cần đánh giá và đề xuất lại trước khi phê duyệt.",
                                "Proposal is stale. Must re-assess and re-propose before approval.",
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KPI Status Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <InfoCard
                      label={text("Ngày đề xuất", "Proposed Date")}
                      value={formatDate(proposal.data.proposedAt)}
                      icon={Calendar}
                    />
                    <InfoCard
                      label={text("Hiệu lực dữ liệu", "Data Freshness")}
                      value={
                        proposal.data.freshness === "CURRENT" ? (
                          <StatusBadge
                            status="COMPLIANT"
                            label={text("Còn hiệu lực", "Current")}
                            size="sm"
                          />
                        ) : proposal.data.freshness === "STALE" ? (
                          <StatusBadge
                            status="STALE"
                            label={text("Đã thay đổi", "Stale")}
                            size="sm"
                          />
                        ) : (
                          <StatusBadge
                            status="PENDING"
                            label={text("Chưa kiểm tra lại", "Unchecked")}
                            size="sm"
                          />
                        )
                      }
                      icon={ShieldCheck}
                    />
                    <InfoCard
                      label={text("Đánh giá đã lưu", "Saved Assessment")}
                      value={
                        assessment.success ? (
                          <StatusBadge
                            status={
                              assessment.data.assessmentStatus === "PASS"
                                ? "COMPLIANT"
                                : "NON_COMPLIANT"
                            }
                            label={assessment.data.assessmentStatus}
                            size="sm"
                          />
                        ) : (
                          <span className="text-xs text-ink-tertiary">
                            {text("Chưa đủ dữ liệu", "Insufficient data")}
                          </span>
                        )
                      }
                      icon={CheckCircle}
                    />
                    <InfoCard
                      label={text("Đồng bộ sổ cái", "Ledger Consistency")}
                      value={
                        proposal.data.demandCurrent &&
                        proposal.data.stockAndEvidenceCurrent === true ? (
                          <StatusBadge
                            status="COMPLIANT"
                            label={text("Khớp sổ cái", "Consistent")}
                            size="sm"
                          />
                        ) : (
                          <StatusBadge
                            status="REJECTED"
                            label={text("Có sai lệch", "Discrepancy")}
                            size="sm"
                          />
                        )
                      }
                      icon={Package}
                    />
                  </div>

                  {/* Allocations Formula Table */}
                  {assessment.success && assessment.data.selection && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                          {text("Thành phần đề xuất", "Proposed Allocations")}
                        </span>
                        <span className="text-xs text-ink-tertiary font-mono">
                          {assessment.data.selection.allocations.length}{" "}
                          {text("vị trí xuất", "positions")}
                        </span>
                      </div>

                      <div className="rounded-xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <caption className="sr-only">
                              Thành phần đề xuất
                            </caption>
                            <thead className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/20 text-ink-secondary font-semibold uppercase tracking-wider text-xs">
                              <tr>
                                <th className="py-3 px-4">
                                  {text("Lô", "Lot")}
                                </th>
                                <th className="py-3 px-4">
                                  {text("Vị trí", "Location")}
                                </th>
                                <th className="py-3 px-4 text-right">
                                  {text("Khối lượng (kg)", "Mass (kg)")}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-tertiary/10">
                              {assessment.data.selection.allocations.map(
                                (line, index) => (
                                  <tr
                                    key={index}
                                    className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors"
                                  >
                                    <td className="py-3 px-4 font-mono font-bold text-accent-primary flex items-center gap-2">
                                      <Package size={14} className="shrink-0" />
                                      <span>{line.lotCode}</span>
                                    </td>
                                    <td className="py-3 px-4 font-mono text-ink-secondary">
                                      {line.locationId}
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono font-semibold">
                                      {line.quantityKg}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reservation Status & Decision Details Panel */}
              {decision.data && (
                <div className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised shadow-xs p-5 sm:p-6 space-y-4">
                  <h4 className="font-display font-bold text-base text-ink-primary">
                    {text(
                      "Tình Trạng Giữ Tồn Kho & Quyết Định",
                      "Stock Reservation & Decision Status",
                    )}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <InfoCard
                      label={text("Trạng thái giữ tồn", "Reservation Status")}
                      value={reservations[decision.data.reservation.status]}
                    />
                    <InfoCard
                      label={text("Đang giữ (kg)", "Holding (kg)")}
                      value={`${decision.data.reservation.remainingKg} kg`}
                    />
                    <InfoCard
                      label={text("Đã sử dụng (kg)", "Consumed (kg)")}
                      value={`${decision.data.reservation.consumedKg} kg`}
                    />
                  </div>

                  {decision.data.reason && (
                    <div className="p-4 rounded-xl bg-surface-raised dark:bg-surface-overlay text-xs space-y-1">
                      <p className="font-semibold text-ink-secondary">
                        {text("Lý do:", "Reason:")}
                      </p>
                      <p className="text-ink-primary font-medium">
                        {decision.data.reason}
                      </p>
                    </div>
                  )}

                  {decision.data.recordedAt && (
                    <p className="text-xs text-ink-secondary">
                      {text(
                        `Ghi nhận lúc ${formatDate(decision.data.recordedAt)}`,
                        `Recorded at ${formatDate(decision.data.recordedAt)}`,
                      )}
                    </p>
                  )}

                  {/* Actions / Decision Bar */}
                  <div className="pt-4 border-t border-ink-tertiary/15">
                    {!canDecide ? (
                      <p className="text-xs text-ink-secondary">
                        {text(
                          "Tài khoản có quyền xem. Cần quyền duyệt phương án để ghi nhận quyết định.",
                          "View-only access. Approval permission is required to record decisions.",
                        )}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {decision.data.status === "PENDING" && !canApprove && (
                          <div className="p-3 rounded-lg bg-functional-hold-bg border border-functional-hold-border/40 text-accent-warning text-xs flex items-center gap-2">
                            <WarningCircle size={16} weight="fill" className="shrink-0" />
                            <span>
                              {text(
                                "Chưa thể phê duyệt: Đề xuất đã thay đổi (STALE), đánh giá chưa đạt (PASS) hoặc dữ liệu tồn kho không còn khớp.",
                                "Cannot approve: proposal is STALE, assessment not PASS, or inventory mismatch.",
                              )}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                          {decision.data.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                disabled={
                                  !canApprove || fetching || mutation.isPending
                                }
                                onClick={() => begin("approve")}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <CheckSquare size={16} weight="bold" />
                                <span>Phê duyệt</span>
                              </button>

                              <button
                                type="button"
                                disabled={fetching || mutation.isPending}
                                onClick={() => begin("reject")}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-danger text-white font-semibold text-xs hover:opacity-90 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <XCircle size={16} weight="bold" />
                                <span>Từ chối</span>
                              </button>
                            </>
                          )}

                          {decision.data.status === "APPROVED" &&
                            decision.data.activeApproval && (
                              <button
                                type="button"
                                disabled={fetching || mutation.isPending}
                                onClick={() => begin("revoke")}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-accent-danger/40 bg-accent-danger/10 text-accent-danger hover:bg-accent-danger/20 font-semibold text-xs transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ClockCounterClockwise size={16} weight="bold" />
                                <span>Thu hồi phê duyệt</span>
                              </button>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-ink-tertiary/20 bg-surface-base p-12 text-center text-ink-secondary text-sm">
              {text(
                "Không tìm thấy thông tin phương án.",
                "Blend plan information not found.",
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation & Reason Modal */}
      <Modal
        isOpen={Boolean(pending)}
        onClose={() => {
          if (!mutation.isPending) setPending(null);
        }}
        ariaLabel={pending ? actions[pending.action] : "Quyết định phương án"}
        className="w-full max-w-md p-6"
        closeOnBackdrop={!mutation.isPending}
      >
        {pending && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-ink-tertiary/15">
              <h3 className="text-base font-display font-bold text-ink-primary flex items-center gap-2">
                {pending.action === "approve" ? (
                  <CheckCircle size={18} className="text-accent-primary" weight="fill" />
                ) : (
                  <WarningCircle size={18} className="text-accent-danger" weight="fill" />
                )}
                <span>{actions[pending.action]}</span>
              </h3>
              <button
                type="button"
                aria-label="Đóng"
                disabled={mutation.isPending}
                onClick={() => setPending(null)}
                className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-ink-secondary leading-relaxed">
              {pending.action === "approve"
                ? text(
                    "Máy chủ sẽ kiểm tra lại hiệu lực đề xuất và giữ lượng tồn cần thiết trước khi xác nhận phê duyệt.",
                    "The server will verify proposal validity and reserve inventory before confirming approval.",
                  )
                : pending.action === "revoke"
                  ? text(
                      "Thu hồi quyết định và giải phóng phần tồn còn giữ theo kiểm tra của máy chủ.",
                      "Revoke decision and release reserved inventory based on server check.",
                    )
                  : text(
                      "Ghi nhận lý do từ chối đề xuất này.",
                      "Record reason for rejecting this proposal.",
                    )}
            </p>

            {actionError && (
              <div className="p-3 rounded-lg bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2">
                <WarningCircle size={16} weight="fill" className="shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {pending.action !== "approve" && (
              <div>
                <label
                  htmlFor="decision-reason"
                  className="block font-semibold text-ink-secondary mb-1"
                >
                  Lý do (bắt buộc)
                </label>
                <textarea
                  id="decision-reason"
                  rows={3}
                  required
                  maxLength={1000}
                  value={reason}
                  disabled={mutation.isPending}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setPending({ ...pending, operationId: crypto.randomUUID() });
                  }}
                  placeholder={text(
                    "Nhập lý do chi tiết…",
                    "Enter detailed reason…",
                  )}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none"
                />
              </div>
            )}

            <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={mutation.isPending}
                className="px-4 py-2 rounded-lg border border-ink-tertiary/20 hover:bg-surface-raised font-semibold text-ink-secondary"
              >
                {text("Huỷ", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={
                  mutation.isPending ||
                  (pending.action !== "approve" && !reason.trim())
                }
                className={`px-5 py-2 rounded-lg text-white font-semibold transition-colors disabled:opacity-60 ${
                  pending.action === "approve"
                    ? "bg-accent-primary hover:bg-accent-primary-dim"
                    : "bg-accent-danger hover:opacity-90"
                }`}
              >
                {mutation.isPending
                  ? text("Đang gửi…", "Submitting…")
                  : `Xác nhận ${actions[pending.action].toLowerCase()}`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="p-3.5 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-ink-tertiary">
        {Icon && <Icon size={14} className="shrink-0" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="font-semibold text-xs text-ink-primary break-words">
        {value}
      </div>
    </div>
  );
}

function PageButtons({
  page,
  hasMore,
  busy,
  onChange,
  isEn,
}: {
  page: number;
  hasMore: boolean;
  busy: boolean;
  onChange: (page: number) => void;
  isEn: boolean;
}) {
  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <button
        type="button"
        className="px-2.5 py-1 rounded-md border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={page <= 1 || busy}
        onClick={() => onChange(page - 1)}
      >
        {isEn ? "Prev" : "Trước"}
      </button>
      <span className="text-ink-secondary font-mono">
        {isEn ? "Page" : "Trang"} {page}
      </span>
      <button
        type="button"
        className="px-2.5 py-1 rounded-md border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!hasMore || busy}
        onClick={() => onChange(page + 1)}
      >
        {isEn ? "Next" : "Sau"}
      </button>
    </div>
  );
}
