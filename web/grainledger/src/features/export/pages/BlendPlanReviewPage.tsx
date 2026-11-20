import { ExportActionLink as Link } from "../components/ExportActionLink";
import { ExportActionProvider } from "../components/ExportActionProvider";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  Package,
  Scales,
  ShieldCheck,
  XCircle,
} from "@phosphor-icons/react";
import { z } from "zod";
import { planningEndpoints, type BlendPlanDecision } from "@/api/planning";
import { useAuthStore } from "@/app/store/authStore";
import { Modal } from "@/shared/ui/Modal";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { useExportCommand } from "../hooks/useExportCommand";
import { massLabel } from "../model/exportPresentation";
import { blendPlanRequestPath, exportPaths } from "../paths";
import {
  ExportEmpty,
  ExportPageHeader,
  ExportSection,
  ExportStat,
  ExportTable,
  ExportWorkspaceNav,
} from "../components/ExportWorkspaceUI";

const assessmentSchema = z.object({
  assessmentStatus: z.string(),
  selection: z
    .object({
      allocations: z.array(
        z.object({
          lotId: z.string(),
          lotCode: z.string().optional(),
          locationId: z.string().nullable(),
          quantityKg: z.string(),
        }),
      ),
    })
    .nullable()
    .optional(),
  assessmentFindings: z
    .array(
      z.object({
        code: z.string(),
        status: z.string(),
        actual: z.string().nullable(),
        limit: z.string().nullable(),
        unit: z.string().nullable(),
      }),
    )
    .optional(),
});
type DecisionCommand = {
  action: "approve" | "reject" | "revoke";
  proposalId: string;
  expectedDecisionVersion: number;
  reason: string;
};

export function BlendPlanReviewPage() {
  const { planId = "" } = useParams();
  return (
    <ExportActionProvider>
      <BlendPlanReviewContent key={planId} planId={planId} />
    </ExportActionProvider>
  );
}

export function BlendPlanReviewContent({
  planId,
  embedded = false,
}: {
  planId: string;
  embedded?: boolean;
}) {
  const text = useWorkflowText();
  const locale = text("vi", "en");
  const cache = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canDecide =
    user?.role === "CUSTOMER_MANAGER" &&
    Boolean(user.permissions.includes("blend.approve"));
  const plan = useQuery({
    queryKey: ["blend-plan", planId],
    queryFn: () => planningEndpoints.getBlendPlan(planId),
    enabled: Boolean(planId),
  });
  const proposal = useQuery({
    queryKey: ["blend-proposal", planId],
    queryFn: () => planningEndpoints.getProposal(planId),
    enabled: plan.data?.hasProposal === true,
  });
  const decision = useQuery({
    queryKey: ["blend-decision", planId],
    queryFn: () => planningEndpoints.getDecision(planId),
    enabled: Boolean(proposal.data),
  });
  const parsed = assessmentSchema.safeParse(proposal.data?.assessment);
  const assessment = parsed.success ? parsed.data : undefined;
  const [confirmation, setConfirmation] = useState<DecisionCommand | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const refresh = async () => {
    await Promise.all([
      plan.refetch(),
      proposal.isEnabled ? proposal.refetch() : Promise.resolve(),
      decision.isEnabled ? decision.refetch() : Promise.resolve(),
    ]);
  };
  const command = useExportCommand(
    async (operationId, input: DecisionCommand) => {
      if (!canDecide)
        throw new Error(
          text(
            "Không có quyền duyệt phương án.",
            "You cannot decide this plan.",
          ),
        );
      const body = {
        operationId,
        proposalId: input.proposalId,
        expectedDecisionVersion: input.expectedDecisionVersion,
      };
      let result: BlendPlanDecision;
      if (input.action === "approve")
        result = await planningEndpoints.approvePlan(planId, body);
      else if (input.action === "reject")
        result = await planningEndpoints.rejectPlan(planId, {
          ...body,
          reason: input.reason,
        });
      else
        result = await planningEndpoints.revokePlan(planId, {
          ...body,
          reason: input.reason,
        });
      cache.setQueryData(["blend-decision", planId], result);
    },
    async () => {
      setConfirmation(null);
      setReason("");
      await refresh();
    },
  );
  const current = decision.data;
  const fresh =
    proposal.data?.freshness === "CURRENT" &&
    proposal.data.demandCurrent &&
    proposal.data.stockAndEvidenceCurrent === true;
  const approving =
    fresh &&
    assessment?.assessmentStatus === "PASS" &&
    current?.status === "PENDING";
  const busy =
    command.isPending ||
    plan.isFetching ||
    proposal.isFetching ||
    decision.isFetching;
  const open = (action: DecisionCommand["action"]) => {
    if (
      !canDecide ||
      !proposal.data ||
      !current ||
      busy ||
      (action === "approve" && !approving)
    )
      return;
    command.reset();
    setReason("");
    setConfirmation({
      action,
      proposalId: proposal.data.id,
      expectedDecisionVersion: current.decisionVersion,
      reason: "",
    });
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !confirmation ||
      !canDecide ||
      command.isPending ||
      !event.currentTarget.reportValidity()
    )
      return;
    if (confirmation.action !== "approve" && !reason.trim()) return;
    command.submit({ ...confirmation, reason: reason.trim() });
  };
  const labels = {
    approve: text("Phê duyệt phương án", "Approve plan"),
    reject: text("Từ chối đề xuất", "Reject proposal"),
    revoke: text("Thu hồi phê duyệt", "Revoke approval"),
  };
  const context = new URLSearchParams(
    plan.data
      ? { order: plan.data.orderId, container: plan.data.containerId }
      : {},
  );
  const status =
    current?.status === "APPROVED"
      ? "COMPLIANT"
      : current?.status === "REJECTED" || current?.status === "REVOKED"
        ? "REJECTED"
        : "PENDING";
  const statusLabel =
    current?.status === "APPROVED"
      ? text("Đã phê duyệt", "Approved")
      : current?.status === "REJECTED"
        ? text("Đã từ chối", "Rejected")
        : current?.status === "REVOKED"
          ? text("Đã thu hồi", "Revoked")
          : text("Chờ quyết định", "Pending decision");
  return (
    <div
      className={`text-ink-primary [container:workspace/inline-size] space-y-6${embedded ? "" : " pb-12"}`}
    >
      <div hidden={embedded}>
        <ExportPageHeader
          title={text("Chi tiết đề xuất phối trộn", "Blend proposal details")}
          eyebrow={text("ĐỀ XUẤT & QUYẾT ĐỊNH", "PROPOSAL & DECISION")}
          subtitle={text(
            "Đối chiếu đánh giá, quyết định hiện tại và khối lượng bảo lưu của đúng phiên bản đề xuất.",
            "Inspect the assessment, current decision and stock reservation for this proposal version.",
          )}
          refresh={() => void refresh()}
          refreshing={busy}
        />
        <ExportWorkspaceNav view="plans" params={context} />
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
          to={`${exportPaths.plans}?${context}`}
        >
          <ArrowLeft size={15} aria-hidden="true" />
          {text("Về danh sách phương án", "Back to plans")}
        </Link>
      </div>
      {embedded && (
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
            disabled={busy}
            onClick={() => void refresh()}
          >
            {text("Kiểm tra lại đề xuất", "Recheck proposal")}
          </button>
        </div>
      )}
      <Feedback error={plan.error ?? proposal.error ?? decision.error} />
      {plan.isPending ? (
        <ExportEmpty
          pending
          title={text("Đang tải phương án…", "Loading plan…")}
        />
      ) : (
        plan.data && (
          <>
            <ExportSection
              title={`${text("Phương án", "Plan")} v${plan.data.versionNo}`}
              description={plan.data.targetProductIdentity ?? undefined}
              actions={
                <Link
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
                  to={`${blendPlanRequestPath(plan.data.orderId, plan.data.containerId)}?plan=${encodeURIComponent(planId)}`}
                >
                  {text("Mở phiên bản phương án", "Open plan version")}
                </Link>
              }
            >
              <p className="font-mono text-sm">
                {massLabel(plan.data.targetMassKg, locale)} kg
              </p>
              {!plan.data.hasProposal && (
                <ExportEmpty
                  title={text(
                    "Phiên bản chưa gửi đề xuất.",
                    "This version has no proposal.",
                  )}
                  description={text(
                    "Hoàn thành đánh giá và gửi đề xuất từ màn hình lập phương án.",
                    "Complete the assessment and submit it from the planning screen.",
                  )}
                />
              )}
              {proposal.data && (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <StatusBadge
                    status={fresh ? "ACTIVE" : "STALE"}
                    label={
                      fresh
                        ? text("Dữ liệu hiện hành", "Current evidence")
                        : proposal.data.freshness === "NOT_RECHECKED"
                          ? text(
                              "Chưa kiểm tra lại dữ liệu",
                              "Evidence not rechecked",
                            )
                          : text(
                              "Cần kiểm tra lại dữ liệu",
                              "Evidence needs review",
                            )
                    }
                  />
                  <span className="text-ink-secondary">
                    {text("Đề xuất lúc", "Proposed at")}:{" "}
                    {new Date(proposal.data.proposedAt).toLocaleString(
                      text("vi-VN", "en-GB"),
                    )}
                  </span>
                </div>
              )}
              {proposal.data && !fresh && (
                <p className="text-xs text-accent-warning">
                  {proposal.data.freshness === "NOT_RECHECKED"
                    ? text(
                        "Đề xuất đã có quyết định. Điều kiện thực thi được kiểm tra lại tại bước xếp hàng.",
                        "This proposal has a recorded decision. Execution readiness is checked again during loading.",
                      )
                    : text(
                        "Chỉ phê duyệt sau khi nhu cầu, tồn kho và bằng chứng đã được kiểm tra còn hiệu lực.",
                        "Approval requires current demand, stock and evidence.",
                      )}{" "}
                  {proposal.data.freshnessReasons.join(" · ")}
                </p>
              )}
            </ExportSection>
            {proposal.isPending && plan.data.hasProposal && (
              <ExportEmpty
                pending
                title={text("Đang tải đề xuất…", "Loading proposal…")}
              />
            )}
            {proposal.data && (
              <ExportSection
                title={text(
                  "Đánh giá và lô nguyên liệu",
                  "Assessment and source lots",
                )}
                description={
                  assessment
                    ? `${text("Kết quả đánh giá", "Assessment result")}: ${assessment.assessmentStatus}`
                    : text(
                        "Chưa có dữ liệu đánh giá có thể hiển thị.",
                        "No displayable assessment data.",
                      )
                }
              >
                {assessment?.selection?.allocations.length ? (
                  <ExportTable
                    caption={text(
                      "Phân bổ nguyên liệu đề xuất",
                      "Proposed source allocations",
                    )}
                    columns={[
                      text("Lô nguyên liệu", "Source lot"),
                      text("Vị trí", "Location"),
                      text("Khối lượng (kg)", "Mass (kg)"),
                    ]}
                  >
                    {assessment.selection.allocations.map((line, index) => (
                      <tr key={`${line.lotId}-${line.locationId}-${index}`}>
                        <th scope="row" className="font-mono">
                          {line.lotCode ?? line.lotId}
                        </th>
                        <td className="break-all font-mono">
                          {line.locationId ?? "—"}
                        </td>
                        <td className="font-mono">
                          {massLabel(line.quantityKg, locale)}
                        </td>
                      </tr>
                    ))}
                  </ExportTable>
                ) : (
                  <p className="text-xs text-ink-secondary">
                    {text(
                      "Không có dòng phân bổ trong snapshot đề xuất.",
                      "No allocation lines in the proposal snapshot.",
                    )}
                  </p>
                )}
                {assessment?.assessmentFindings?.length ? (
                  <ul className="space-y-2 text-xs">
                    {assessment.assessmentFindings.map((finding, index) => (
                      <li
                        key={index}
                        className="flex flex-wrap justify-between gap-2 rounded-lg border border-ink-tertiary/15 p-3"
                      >
                        <span>
                          {finding.code} · {finding.status}
                        </span>
                        <span className="font-mono">
                          {finding.actual ?? "—"} / {finding.limit ?? "—"}{" "}
                          {finding.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </ExportSection>
            )}
            {current && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <ExportStat
                    label={text("Đã bảo lưu (kg)", "Reserved (kg)")}
                    value={massLabel(current.reservation.reservedKg, locale)}
                    icon={<ShieldCheck size={20} />}
                  />
                  <ExportStat
                    label={text("Còn bảo lưu (kg)", "Remaining reserve (kg)")}
                    value={massLabel(current.reservation.remainingKg, locale)}
                    icon={<Package size={20} />}
                    accent
                  />
                  <ExportStat
                    label={text("Đã sử dụng (kg)", "Consumed (kg)")}
                    value={massLabel(current.reservation.consumedKg, locale)}
                    icon={<Scales size={20} />}
                  />
                  <ExportStat
                    label={text("Đã giải phóng (kg)", "Released (kg)")}
                    value={massLabel(current.reservation.releasedKg, locale)}
                    icon={<XCircle size={20} />}
                  />
                </div>
                <ExportSection
                  title={text("Quyết định hiện tại", "Current decision")}
                  actions={<StatusBadge status={status} label={statusLabel} />}
                >
                  <dl className="grid gap-4 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-ink-secondary">
                        {text("Phiên bản quyết định", "Decision version")}
                      </dt>
                      <dd className="mt-1 font-mono">
                        v{current.decisionVersion}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-secondary">
                        {text("Bảo lưu", "Reservation")}
                      </dt>
                      <dd className="mt-1 font-mono">
                        {current.reservation.status}
                      </dd>
                    </div>
                    {current.recordedAt && (
                      <div>
                        <dt className="text-ink-secondary">
                          {text("Thời điểm ghi nhận", "Recorded at")}
                        </dt>
                        <dd className="mt-1">
                          {new Date(current.recordedAt).toLocaleString(
                            text("vi-VN", "en-GB"),
                          )}
                        </dd>
                      </div>
                    )}
                    {current.reason && (
                      <div>
                        <dt className="text-ink-secondary">
                          {text("Lý do", "Reason")}
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words">
                          {current.reason}
                        </dd>
                      </div>
                    )}
                  </dl>
                  {current.reservation.lines.length > 0 && (
                    <ExportTable
                      caption={text(
                        "Chi tiết bảo lưu theo lô",
                        "Reservation by lot",
                      )}
                      columns={[
                        text("Lô", "Lot"),
                        text("Vị trí", "Location"),
                        text("Đã bảo lưu (kg)", "Reserved (kg)"),
                        text("Đã sử dụng (kg)", "Consumed (kg)"),
                        text("Đã giải phóng (kg)", "Released (kg)"),
                        text("Còn bảo lưu (kg)", "Remaining (kg)"),
                      ]}
                    >
                      {current.reservation.lines.map((line, index) => (
                        <tr key={`${line.lotId}-${line.locationId}-${index}`}>
                          <th scope="row" className="break-all font-mono">
                            {line.lotId}
                          </th>
                          <td className="break-all font-mono">
                            {line.locationId ?? "—"}
                          </td>
                          <td className="font-mono">
                            {massLabel(line.reservedKg, locale)}
                          </td>
                          <td className="font-mono">
                            {massLabel(line.consumedKg, locale)}
                          </td>
                          <td className="font-mono">
                            {massLabel(line.releasedKg, locale)}
                          </td>
                          <td className="font-mono">
                            {massLabel(line.remainingKg, locale)}
                          </td>
                        </tr>
                      ))}
                    </ExportTable>
                  )}
                  {canDecide && (
                    <div className="flex flex-wrap gap-2 border-t border-ink-tertiary/15 pt-4">
                      {current.status === "PENDING" && (
                        <>
                          <button
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-accent-primary bg-accent-primary px-4 text-ink-inverse hover:bg-accent-primary-dim"
                            disabled={busy || !approving}
                            onClick={() => open("approve")}
                          >
                            <CheckCircle size={16} aria-hidden="true" />
                            {labels.approve}
                          </button>
                          <button
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
                            disabled={busy}
                            onClick={() => open("reject")}
                          >
                            {labels.reject}
                          </button>
                        </>
                      )}
                      {current.activeApproval && (
                        <button
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
                          disabled={busy}
                          onClick={() => open("revoke")}
                        >
                          {labels.revoke}
                        </button>
                      )}
                    </div>
                  )}
                </ExportSection>
              </>
            )}
          </>
        )
      )}
      <Modal
        isOpen={confirmation !== null}
        closeOnBackdrop={!command.isPending}
        onClose={() => {
          if (!command.isPending) setConfirmation(null);
        }}
        ariaLabel={confirmation ? labels[confirmation.action] : undefined}
      >
        {confirmation && (
          <form
            onSubmit={submit}
            className="text-ink-primary [container:workspace/inline-size] w-[calc(100vw-2rem)] max-w-lg space-y-4 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-6 dark:bg-surface-raised"
          >
            <h2 className="font-display text-lg font-bold">
              {labels[confirmation.action]}
            </h2>
            <p className="text-xs text-ink-secondary">
              {text(
                "Quyết định áp dụng cho phiên bản đang xem và có thể thay đổi bảo lưu tồn kho.",
                "This decision applies to the displayed version and may change stock reservations.",
              )}
            </p>
            {confirmation.action !== "approve" && (
              <label className="block space-y-2">
                <span>{text("Lý do", "Reason")}</span>
                <textarea
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg"
                  required
                  maxLength={2000}
                  rows={3}
                  value={reason}
                  disabled={command.isPending}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
            )}
            <Feedback error={command.error} />
            {command.isError && (
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
                onClick={() => {
                  setConfirmation(null);
                  void refresh();
                }}
              >
                {text("Tải lại quyết định mới nhất", "Reload latest decision")}
              </button>
            )}
            <div className="flex justify-end gap-2">
              <button
                autoFocus
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
                disabled={command.isPending}
                onClick={() => setConfirmation(null)}
              >
                {text("Quay lại", "Back")}
              </button>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-accent-primary bg-accent-primary px-4 text-ink-inverse hover:bg-accent-primary-dim"
                disabled={
                  command.isPending ||
                  (confirmation.action !== "approve" && !reason.trim())
                }
              >
                {command.isPending
                  ? text("Đang ghi nhận…", "Recording…")
                  : labels[confirmation.action]}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
