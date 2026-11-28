import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowsClockwise,
  CaretLeft,
  CaretRight,
  Eye,
  GitBranch,
  ShieldWarning,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  residueEndpoints,
  type ResidueRiskAssessmentStatus,
  type ResidueRiskEvent,
  type ResidueRiskTargetKind,
} from "@/api/residue";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Modal } from "@/shared/ui/Modal";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { compliancePaths } from "../paths";

function formatTimestamp(iso?: string | null): string {
  if (!iso) return "—";
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return iso;
  return new Date(time).toLocaleString();
}

const TARGET_KINDS: Array<{ value: "" | ResidueRiskTargetKind; vi: string; en: string }> = [
  { value: "", vi: "Tất cả đối tượng", en: "All targets" },
  { value: "LOT", vi: "Lô hàng (LOT)", en: "Lot (LOT)" },
  { value: "PLAN", vi: "Phương án (PLAN)", en: "Plan (PLAN)" },
  { value: "CONTAINER", vi: "Container (CONTAINER)", en: "Container (CONTAINER)" },
];

const ASSESSMENT_STATUSES: Array<{
  value: "" | ResidueRiskAssessmentStatus;
  vi: string;
  en: string;
}> = [
  { value: "", vi: "Mọi trạng thái đánh giá", en: "All statuses" },
  { value: "FAIL", vi: "Không đạt (FAIL)", en: "Fail (FAIL)" },
  { value: "UNRESOLVED", vi: "Chưa giải quyết (UNRESOLVED)", en: "Unresolved" },
  { value: "INCOMPLETE", vi: "Thiếu dữ liệu (INCOMPLETE)", en: "Incomplete" },
  { value: "COMPLETE", vi: "Hoàn tất (COMPLETE)", en: "Complete" },
  { value: "PASS", vi: "Đạt (PASS)", en: "Pass (PASS)" },
];

const TARGET_STATES = [
  { value: "", vi: "Tất cả tiến trình", en: "All states" },
  { value: "PENDING", vi: "Chờ xử lý (PENDING)", en: "Pending" },
  { value: "PROCESSING", vi: "Đang xử lý (PROCESSING)", en: "Processing" },
  { value: "COMPLETED", vi: "Hoàn thành (COMPLETED)", en: "Completed" },
  { value: "FAILED_RETRYABLE", vi: "Lỗi có thể thử lại", en: "Failed retryable" },
] as const;

export function ResidueRiskPage() {
  const text = useWorkflowText();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [targetKind, setTargetKind] = useState<"" | ResidueRiskTargetKind>("");
  const [assessmentStatus, setAssessmentStatus] = useState<
    "" | ResidueRiskAssessmentStatus
  >("");
  const [targetIdFilter, setTargetIdFilter] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedChangeId, setSelectedChangeId] = useState<string>(
    () => params.get("changeId") ?? "",
  );
  const [targetPage, setTargetPage] = useState(1);
  const [targetStateFilter, setTargetStateFilter] = useState("");

  const riskEvents = useQuery({
    queryKey: [
      "residue-risk-events",
      page,
      targetKind,
      assessmentStatus,
      targetIdFilter.trim(),
    ],
    queryFn: () =>
      residueEndpoints.getResidueRiskEvents({
        page,
        pageSize: 25,
        targetKind: targetKind || undefined,
        assessmentStatus: assessmentStatus || undefined,
        targetId: targetIdFilter.trim() || undefined,
      }),
  });

  const eventDetail = useQuery({
    queryKey: ["residue-risk-event", selectedEventId],
    queryFn: () => residueEndpoints.getResidueRiskEvent(selectedEventId!),
    enabled: Boolean(selectedEventId),
  });

  const changeDetail = useQuery({
    queryKey: ["residue-change", selectedChangeId],
    queryFn: () => residueEndpoints.getResidueChange(selectedChangeId),
    enabled: Boolean(selectedChangeId),
  });

  const changeTargets = useQuery({
    queryKey: [
      "residue-change-targets",
      selectedChangeId,
      targetPage,
      targetStateFilter,
    ],
    queryFn: () =>
      residueEndpoints.getResidueChangeTargets(selectedChangeId, {
        page: targetPage,
        pageSize: 20,
        state: targetStateFilter
          ? (targetStateFilter as
              | "PENDING"
              | "PROCESSING"
              | "COMPLETED"
              | "FAILED_RETRYABLE")
          : undefined,
      }),
    enabled: Boolean(selectedChangeId),
  });

  function openChangeInspector(changeId: string) {
    setSelectedChangeId(changeId);
    setTargetPage(1);
    const next = new URLSearchParams(params);
    if (changeId) next.set("changeId", changeId);
    else next.delete("changeId");
    setParams(next, { replace: true });
  }

  function closeChangeInspector() {
    setSelectedChangeId("");
    const next = new URLSearchParams(params);
    next.delete("changeId");
    setParams(next, { replace: true });
  }

  function badgeStatus(status: string) {
    if (status === "FAIL" || status === "FAILED_RETRYABLE") return "HOLD" as const;
    if (status === "PASS" || status === "COMPLETE" || status === "COMPLETED")
      return "ACTIVE" as const;
    return "PENDING" as const;
  }

  const events: ResidueRiskEvent[] = riskEvents.data?.items ?? [];

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col justify-between gap-4 border-b border-ink-tertiary/15 pb-4 sm:flex-row sm:items-center">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {text("GIÁM SÁT RỦI RO DƯ LƯỢNG (PR #27)", "RESIDUE RISK MONITORING")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">
            {text(
              "Sự kiện đánh giá lại & Rủi ro dư lượng",
              "Residue change re-evaluations & risk events",
            )}
          </h1>
          <p className="mt-0.5 text-xs text-ink-secondary">
            {text(
              "Theo dõi các lô hàng, phương án và container bị tác động khi hồ sơ dư lượng hoặc kết quả lab thay đổi.",
              "Track affected lots, plans, and containers when residue rules or lab results change.",
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={compliancePaths.profiles}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:bg-surface-raised hover:text-ink-primary dark:bg-surface-raised"
          >
            <GitBranch size={15} aria-hidden="true" />
            <span>{text("Hồ sơ dư lượng", "Residue profiles")}</span>
          </Link>
          <button
            type="button"
            disabled={riskEvents.isFetching}
            onClick={() =>
              void queryClient.invalidateQueries({
                queryKey: ["residue-risk-events"],
              })
            }
            aria-label={text("Làm mới", "Refresh")}
            className="inline-flex size-10 items-center justify-center rounded-full border border-ink-tertiary/20 bg-surface-base text-ink-secondary hover:bg-surface-raised disabled:opacity-50 dark:bg-surface-raised"
          >
            <ArrowsClockwise
              size={16}
              className={
                riskEvents.isFetching ? "motion-safe:animate-spin" : undefined
              }
              aria-hidden="true"
            />
          </button>
        </div>
      </header>

      {/* Filters */}
      <section className="record-card p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="block text-xs font-semibold text-ink-secondary">
            <span>{text("Loại đối tượng", "Target kind")}</span>
            <select
              value={targetKind}
              onChange={(e) => {
                setTargetKind(e.target.value as "" | ResidueRiskTargetKind);
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-ink-tertiary/25 bg-surface-base px-3 py-2 text-xs text-ink-primary dark:bg-surface-raised"
            >
              {TARGET_KINDS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {text(opt.vi, opt.en)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-ink-secondary">
            <span>{text("Trạng thái đánh giá", "Assessment status")}</span>
            <select
              value={assessmentStatus}
              onChange={(e) => {
                setAssessmentStatus(
                  e.target.value as "" | ResidueRiskAssessmentStatus,
                );
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-ink-tertiary/25 bg-surface-base px-3 py-2 text-xs text-ink-primary dark:bg-surface-raised"
            >
              {ASSESSMENT_STATUSES.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {text(opt.vi, opt.en)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-ink-secondary sm:col-span-2">
            <span>{text("Lọc theo Target UUID", "Filter by Target UUID")}</span>
            <input
              type="text"
              value={targetIdFilter}
              onChange={(e) => {
                setTargetIdFilter(e.target.value);
                setPage(1);
              }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="mt-1 w-full rounded-lg border border-ink-tertiary/25 bg-surface-base px-3 py-2 font-mono text-xs text-ink-primary dark:bg-surface-raised"
            />
          </label>
        </div>
      </section>

      {riskEvents.isPending && (
        <div className="flex justify-center py-6">
          <GrainLoader
            size="sm"
            label={text(
              "Đang tải danh sách sự kiện rủi ro dư lượng…",
              "Loading residue risk events…",
            )}
          />
        </div>
      )}
      <Feedback
        error={riskEvents.error}
        pending={false}
      />

      {riskEvents.data && (
        <section className="record-card">
          <div className="record-card-header">
            <div className="flex items-center gap-2">
              <ShieldWarning
                size={18}
                className="text-accent-primary"
                aria-hidden="true"
              />
              <h2 className="font-display text-base font-bold text-ink-primary">
                {text("Danh sách sự kiện rủi ro", "Risk events")}
              </h2>
            </div>
            <span className="font-mono text-xs text-ink-secondary">
              {riskEvents.data.total} {text("bản ghi", "records")}
            </span>
          </div>

          {events.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-secondary">
              {text(
                "Không có sự kiện rủi ro dư lượng nào khớp bộ lọc.",
                "No residue risk events match the current filters.",
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ink-tertiary/15 text-xs">
                <thead className="bg-surface-raised/70 text-[11px] font-semibold uppercase tracking-wider text-ink-secondary dark:bg-surface-overlay/50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      {text("Đối tượng", "Target")}
                    </th>
                    <th className="px-4 py-3 text-left">
                      {text("Quan hệ ảnh hưởng", "Relationship")}
                    </th>
                    <th className="px-4 py-3 text-left">
                      {text("Trạng thái", "Assessment")}
                    </th>
                    <th className="px-4 py-3 text-left">
                      {text("Đánh giá lúc", "Evaluated at")}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {text("Thao tác", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-tertiary/10 bg-surface-base dark:bg-surface-raised">
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink-primary">
                          {ev.targetType}
                        </div>
                        <div className="font-mono text-[11px] text-ink-secondary">
                          {ev.targetId}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-secondary">
                        {ev.relationshipBasis || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={badgeStatus(ev.assessmentStatus)}
                          label={ev.assessmentStatus}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-ink-secondary">
                        {formatTimestamp(ev.evaluatedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openChangeInspector(ev.changeId)}
                            className="inline-flex items-center gap-1 rounded-full border border-ink-tertiary/20 px-2.5 py-1 text-[11px] font-semibold text-ink-secondary hover:border-accent-primary hover:text-accent-primary"
                          >
                            <GitBranch size={12} aria-hidden="true" />
                            <span>{text("Đợt thay đổi", "Change")}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedEventId(ev.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-2.5 py-1 text-[11px] font-semibold text-accent-primary hover:bg-accent-primary/20"
                          >
                            <Eye size={12} aria-hidden="true" />
                            <span>{text("Chi tiết", "Details")}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(page > 1 || riskEvents.data.hasNext) && (
            <div className="flex items-center justify-between border-t border-ink-tertiary/15 px-4 py-3 text-xs">
              <button
                type="button"
                disabled={page <= 1 || riskEvents.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="record-button rounded-full px-3 py-1 disabled:opacity-50"
              >
                <CaretLeft size={14} aria-hidden="true" />
                <span>{text("Trước", "Prev")}</span>
              </button>
              <span className="font-mono text-ink-secondary">
                {text(`Trang ${page}`, `Page ${page}`)}
              </span>
              <button
                type="button"
                disabled={!riskEvents.data.hasNext || riskEvents.isFetching}
                onClick={() => setPage((p) => p + 1)}
                className="record-button rounded-full px-3 py-1 disabled:opacity-50"
              >
                <span>{text("Sau", "Next")}</span>
                <CaretRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      )}

      {/* Selected Change Targets Inspector */}
      {selectedChangeId && (
        <section className="record-card border-accent-primary/30">
          <div className="record-card-header">
            <div>
              <h2 className="font-display text-base font-bold text-ink-primary">
                {text(
                  "Chi tiết đợt thay đổi quy tắc/lab & đối tượng tác động",
                  "Residue change progress & targets",
                )}
              </h2>
              <p className="font-mono text-[11px] text-ink-secondary">
                Change ID: {selectedChangeId}
              </p>
            </div>
            <button
              type="button"
              onClick={closeChangeInspector}
              className="rounded-full border border-ink-tertiary/20 px-3 py-1 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
            >
              {text("Đóng", "Close")}
            </button>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <Feedback
              error={changeDetail.error ?? changeTargets.error}
              pending={changeDetail.isPending}
            />

            {changeDetail.data && (
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-3.5 text-xs sm:grid-cols-4 dark:bg-surface-overlay/25">
                <div>
                  <span className="text-ink-tertiary block">
                    {text("Nguyên nhân", "Cause kind")}
                  </span>
                  <span className="font-semibold text-ink-primary">
                    {changeDetail.data.changeKind}
                  </span>
                </div>
                <div>
                  <span className="text-ink-tertiary block">
                    {text("Trạng thái đợt", "State")}
                  </span>
                  <StatusBadge
                    status={badgeStatus(changeDetail.data.state)}
                    label={changeDetail.data.state}
                    size="sm"
                  />
                </div>
                <div>
                  <span className="text-ink-tertiary block">
                    {text("Tiến độ", "Progress")}
                  </span>
                  <span className="font-mono font-semibold text-ink-primary">
                    {changeDetail.data.progress.completedTargets}/
                    {changeDetail.data.progress.totalTargets} (
                    {changeDetail.data.progress.remainingTargets}{" "}
                    {text("còn lại", "remaining")})
                  </span>
                </div>
                <div>
                  <span className="text-ink-tertiary block">
                    {text("Hạn hoàn tất", "Due at")}
                  </span>
                  <span className="font-mono text-ink-primary">
                    {formatTimestamp(changeDetail.data.dueAt)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-ink-secondary">
                <span>{text("Lọc trạng thái target:", "Filter target state:")}</span>
                <select
                  value={targetStateFilter}
                  onChange={(e) => {
                    setTargetStateFilter(e.target.value);
                    setTargetPage(1);
                  }}
                  className="rounded-lg border border-ink-tertiary/25 bg-surface-base px-2.5 py-1.5 text-xs text-ink-primary dark:bg-surface-raised"
                >
                  {TARGET_STATES.map((s) => (
                    <option key={s.value || "all"} value={s.value}>
                      {text(s.vi, s.en)}
                    </option>
                  ))}
                </select>
              </label>
              {changeTargets.data && (
                <span className="font-mono text-xs text-ink-secondary">
                  {changeTargets.data.total} {text("đối tượng", "targets")}
                </span>
              )}
            </div>

            {changeTargets.isPending ? (
              <GrainLoader
                size="sm"
                label={text("Đang tải targets…", "Loading targets…")}
              />
            ) : (
              changeTargets.data && (
                <div className="overflow-x-auto rounded-xl border border-ink-tertiary/15">
                  <table className="min-w-full divide-y divide-ink-tertiary/15 text-xs">
                    <thead className="bg-surface-raised/60 text-[11px] uppercase text-ink-secondary">
                      <tr>
                        <th className="px-3 py-2 text-left">Target</th>
                        <th className="px-3 py-2 text-left">
                          {text("Quan hệ", "Basis")}
                        </th>
                        <th className="px-3 py-2 text-left">
                          {text("Trạng thái", "State")}
                        </th>
                        <th className="px-3 py-2 text-left">
                          {text("Cập nhật", "Updated")}
                        </th>
                        <th className="px-3 py-2 text-right">
                          {text("Sự kiện rủi ro", "Risk event")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-tertiary/10">
                      {changeTargets.data.items.map((tgt) => (
                        <tr key={tgt.id}>
                          <td className="px-3 py-2">
                            <span className="font-semibold">{tgt.targetType}</span>{" "}
                            <span className="font-mono text-[11px] text-ink-secondary">
                              {tgt.targetId}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-ink-secondary">
                            {tgt.relationshipBasis}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge
                              status={badgeStatus(tgt.state)}
                              label={tgt.state}
                              size="sm"
                            />
                            {tgt.errorCode && (
                              <span className="ml-1.5 font-mono text-[10px] text-accent-danger">
                                ({tgt.errorCode})
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-ink-secondary">
                            {formatTimestamp(tgt.updatedAt)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {tgt.latestRiskEventId ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedEventId(tgt.latestRiskEventId!)
                                }
                                className="font-semibold text-accent-primary hover:underline"
                              >
                                {text("Xem đánh giá", "Inspect event")}
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Event Detail Modal */}
      {selectedEventId && (
        <Modal
          isOpen
          onClose={() => setSelectedEventId(null)}
          ariaLabel={text("Chi tiết sự kiện rủi ro dư lượng", "Residue risk event details")}
        >
          <div className="w-[calc(100vw-2rem)] max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-ink-tertiary/20 bg-surface-base p-5 text-ink-primary shadow-xl dark:bg-surface-raised space-y-4">
          <div className="flex items-center justify-between border-b border-ink-tertiary/15 pb-3">
            <h2 className="font-display text-base font-bold">
              {text("Chi tiết sự kiện rủi ro dư lượng", "Residue risk event details")}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedEventId(null)}
              className="rounded-lg border border-ink-tertiary/20 px-2.5 py-1 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
            >
              {text("Đóng", "Close")}
            </button>
          </div>
          {eventDetail.isPending && (
            <div className="py-6 flex justify-center">
              <GrainLoader
                size="sm"
                label={text("Đang tải đánh giá chi tiết…", "Loading event assessment…")}
              />
            </div>
          )}
          {eventDetail.error && (
            <div className="flex items-center gap-2 rounded-lg border border-functional-rejected-border bg-functional-rejected-bg p-3 text-xs text-accent-danger">
              <WarningCircle size={16} aria-hidden="true" />
              <Feedback error={eventDetail.error} />
            </div>
          )}
          {eventDetail.data && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-3.5 sm:grid-cols-2">
                <div>
                  <span className="text-ink-tertiary block">Target</span>
                  <span className="font-mono font-semibold text-ink-primary">
                    {eventDetail.data.targetType} · {eventDetail.data.targetId}
                  </span>
                </div>
                <div>
                  <span className="text-ink-tertiary block">
                    {text("Trạng thái đánh giá", "Assessment status")}
                  </span>
                  <StatusBadge
                    status={badgeStatus(eventDetail.data.assessmentStatus)}
                    label={eventDetail.data.assessmentStatus}
                    size="sm"
                  />
                </div>
                <div>
                  <span className="text-ink-tertiary block">
                    {text("Động cơ / Căn cứ", "Material basis")}
                  </span>
                  <span className="font-mono text-ink-primary">
                    {eventDetail.data.assessment?.materialBasis || "—"} (
                    {eventDetail.data.relationshipBasis})
                  </span>
                </div>
                <div>
                  <span className="text-ink-tertiary block">
                    {text("Đánh giá lúc", "Evaluated at")}
                  </span>
                  <span className="font-mono text-ink-primary">
                    {formatTimestamp(eventDetail.data.evaluatedAt)}
                  </span>
                </div>
              </div>

              {eventDetail.data.assessment?.findings &&
                eventDetail.data.assessment.findings.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-ink-primary">
                      {text("Phát hiện đánh giá (Findings)", "Assessment findings")}
                    </h3>
                    <ul className="space-y-1.5">
                      {eventDetail.data.assessment.findings.map((f, idx) => (
                        <li
                          key={`${f.code ?? "finding"}-${idx}`}
                          className="rounded-lg border border-ink-tertiary/15 px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                        >
                          <span className="font-mono font-semibold text-ink-primary">
                            {f.code || "FINDING"}
                          </span>
                          <span className="font-mono text-ink-secondary">
                            {f.actual ?? "—"} / {f.limit ?? "—"} {f.unit ?? ""}
                          </span>
                          {f.status && (
                            <StatusBadge
                              status={badgeStatus(f.status)}
                              label={f.status}
                              size="sm"
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {eventDetail.data.assessment?.results &&
                eventDetail.data.assessment.results.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-ink-primary">
                      {text("Kết quả ước lượng theo hoạt chất", "Substance assessment results")}
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-ink-tertiary/15">
                      <table className="min-w-full divide-y divide-ink-tertiary/15 text-xs">
                        <thead className="bg-surface-raised/60">
                          <tr>
                            <th className="px-3 py-2 text-left">Substance</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-right">Range</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-tertiary/10">
                          {eventDetail.data.assessment.results.map((r, idx) => (
                            <tr key={`${r.substanceId ?? "sub"}-${idx}`}>
                              <td className="px-3 py-2 font-mono">
                                {r.substanceId || r.profileCode || "—"}
                              </td>
                              <td className="px-3 py-2">
                                {r.status ? (
                                  <StatusBadge
                                    status={badgeStatus(r.status)}
                                    label={r.status}
                                    size="sm"
                                  />
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {r.lower ?? "?"} – {r.upper ?? "?"} {r.unit ?? ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>
          )}
          </div>
        </Modal>
      )}
    </div>
  );
}
