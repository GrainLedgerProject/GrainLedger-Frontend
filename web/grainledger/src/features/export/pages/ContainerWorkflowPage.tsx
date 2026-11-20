import { ExportActionLink as Link } from "../components/ExportActionLink";
import { ExportActionProvider } from "../components/ExportActionProvider";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useAuthStore } from "@/app/store/authStore";
import { containerExecutionEndpoints } from "@/api/containerExecution";
import { planningEndpoints } from "@/api/planning";
import { collectPages } from "@/api/query";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { StatusBadge, type StatusType } from "@/shared/ui/StatusBadge";
import { ContainerReadiness } from "../components/ContainerReadiness";
import { ContainerLoadingForm } from "../components/ContainerLoadingForm";
import { ContainerClosureForm } from "../components/ContainerClosureForm";
import { ContainerDossierPanel } from "../components/ContainerDossierPanel";
import { ContainerProductionPanel } from "../components/ContainerProductionPanel";
import { useContainerWorkspace } from "../hooks/useContainerWorkspace";
import { ExportWorkspaceNav } from "../components/ExportWorkspaceUI";
import {
  blendPlanRequestPath,
  containerPath,
  exportPaths,
  planReviewPath,
} from "../paths";
import { BlendPlanRequestModalContent } from "./BlendPlanRequestPage";
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  CaretLeft,
  CaretRight,
  ChartPieSlice,
  ClockCounterClockwise,
  FileText,
  LockSimple,
  ShieldCheck,
  Truck,
} from "@phosphor-icons/react";

const panelClass =
  "rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised shadow-xs p-5 space-y-4";

function mapContainerStatus(status: string): {
  type: StatusType;
  labelVi: string;
  labelEn: string;
} {
  switch (status) {
    case "CLOSED":
      return { type: "CLOSED", labelVi: "Đã niêm phong", labelEn: "Closed" };
    case "LOADING":
      return {
        type: "IN_PROGRESS",
        labelVi: "Đang xếp hàng",
        labelEn: "Loading",
      };
    case "PLANNED":
      return {
        type: "PENDING",
        labelVi: "Đã lên kế hoạch",
        labelEn: "Planned",
      };
    case "HOLD":
      return { type: "HOLD", labelVi: "Tạm giữ HOLD", labelEn: "On Hold" };
    default:
      return { type: "ACTIVE", labelVi: status, labelEn: status };
  }
}

export function ContainerPlanPage() {
  return <ContainerWorkflowPage step="plan" />;
}
export function ContainerLoadingPage() {
  return <ContainerWorkflowPage step="loading" />;
}
export function ContainerClosurePage() {
  return <ContainerWorkflowPage step="closure" />;
}
export function ContainerDossierPage() {
  return <ContainerWorkflowPage step="dossier" />;
}

function ContainerWorkflowPage({
  step,
}: {
  step: "plan" | "loading" | "closure" | "dossier";
}) {
  const { id = "" } = useParams();
  return (
    <ExportActionProvider>
      <ContainerWorkflowContent key={id} id={id} step={step} />
    </ExportActionProvider>
  );
}

export function ContainerWorkflowContent({
  id,
  step,
  embedded = false,
}: {
  id: string;
  step: "plan" | "loading" | "closure" | "dossier";
  embedded?: boolean;
}) {
  const text = useWorkflowText();
  const user = useAuthStore((s) => s.user);
  const canWrite =
    user?.role === "CUSTOMER_EXPORT_OFFICER" &&
    user.permissions.includes("containers.write");
  const canAssess = user?.permissions.includes("residue.evaluate") ?? false;
  const { execution, refresh } = useContainerWorkspace(id);
  const plans = useQuery({
    queryKey: ["container-plans", id],
    queryFn: () => collectPages((q) => planningEndpoints.getBlendPlans(id, q)),
    enabled: Boolean(execution.data),
  });

  const title =
    step === "plan"
      ? text("Phương án phối trộn container", "Container blend plan")
      : step === "loading"
        ? text("Xếp hàng lên container", "Container loading")
        : step === "closure"
          ? text("Đóng niêm container", "Container closure")
          : text("Hồ sơ tuân thủ container", "Container compliance dossier");

  const subtitle =
    step === "plan"
      ? text(
          "Lập phương án, tính toán mô phỏng MRL và đề xuất bảo lưu tồn kho cho container.",
          "Plan blend versions, simulate MRL assessment and submit reservation proposal.",
        )
      : step === "loading"
        ? text(
            "Ghi nhận khối lượng thực xếp theo từng mẻ bảo lưu đã được phê duyệt.",
            "Record actual loading masses according to approved reservation batches.",
          )
        : step === "closure"
          ? text(
              "Cập nhật số hiệu container, số chì niêm phong và khóa chứng thư xuất xưởng.",
              "Save container number, seal identifier, and close compliance dossier.",
            )
          : text(
              "Tra cứu hồ sơ đóng niêm, snapshot JSON và chứng từ xuất khẩu.",
              "Review the closure dossier, JSON snapshot and export documents.",
            );

  const c = execution.data?.container;
  const readiness = execution.data?.readiness;

  const targetKg = c ? parseFloat(c.targetKg || "0") : 0;
  const loadedKg = c ? parseFloat(c.loadedKg || "0") : 0;
  const loadPercentage =
    targetKg > 0 ? Math.min(100, Math.round((loadedKg / targetKg) * 100)) : 0;
  const statusMeta = c ? mapContainerStatus(c.status) : null;

  return (
    <div className={`text-ink-primary [container:workspace/inline-size] space-y-6${embedded ? "" : " pb-12"}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div hidden={embedded}>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to={
                exportPaths.containers +
                (c ? "?order=" + encodeURIComponent(c.orderId) : "")
              }
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-primary hover:underline"
            >
              <ArrowLeft size={14} />
              <span>{text("Danh sách container", "All containers")}</span>
            </Link>
            <span className="text-ink-tertiary">/</span>
            <span
              data-ui-detail="secondary"
              className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
            >
              {text("QUY TRÌNH CONTAINER", "CONTAINER WORKFLOW")}
            </span>
          </div>

          <h1 className="text-2xl font-display font-bold text-ink-primary">
            {title}
          </h1>
          <p
            data-ui-detail="secondary"
            className="text-xs text-ink-secondary mt-0.5"
          >
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={execution.isFetching}
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-base hover:bg-surface-raised border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary text-xs font-semibold transition-all shadow-xs"
          >
            <ArrowsClockwise
              size={16}
              className={
                execution.isFetching ? "motion-safe:animate-spin" : undefined
              }
            />
            <span>
              {text(
                "Tải lại dữ liệu và điều kiện",
                "Reload data and readiness",
              )}
            </span>
          </button>
        </div>
      </div>

      {!embedded && (
        <ExportWorkspaceNav
          view={step === "dossier" ? "dossiers" : "containers"}
          params={
            new URLSearchParams(c ? { order: c.orderId, container: id } : {})
          }
        />
      )}
      <Feedback pending={execution.isPending} error={execution.error} />

      {c && readiness && (
        <>
          {/* Container Overview Card */}
          <section aria-label={c.code} className={`${panelClass}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                  <Truck size={24} weight="bold" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-ink-primary flex items-center gap-3">
                    <span>{c.code}</span>
                    {statusMeta && (
                      <StatusBadge
                        status={statusMeta.type}
                        label={text(statusMeta.labelVi, statusMeta.labelEn)}
                        size="sm"
                      />
                    )}
                  </h2>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    {text("Mã đơn hàng", "Order ID")}:{" "}
                    <strong className="font-mono text-ink-primary">
                      {c.orderId}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full md:w-56 space-y-1.5">
                <div className="flex justify-between text-xs text-ink-secondary">
                  <span>{text("Tiến độ nạp hàng", "Loading progress")}</span>
                  <span className="font-mono font-semibold text-ink-primary">
                    {loadPercentage}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised dark:bg-surface-base border border-ink-tertiary/15">
                  <div
                    className="h-full bg-accent-primary transition-all duration-300 rounded-full"
                    style={{ width: `${loadPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* DL KPI Stats */}
            <dl className="grid gap-3 sm:grid-cols-4">
              <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-surface-overlay/20 border border-ink-tertiary/15">
                <dt className="text-xs font-semibold text-ink-secondary mb-1">
                  {text("Mục tiêu", "Target")}
                </dt>
                <dd className="font-mono text-lg font-bold text-ink-primary">
                  {c.targetKg} kg
                </dd>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-surface-overlay/20 border border-ink-tertiary/15">
                <dt className="text-xs font-semibold text-ink-secondary mb-1">
                  {text("Đã thực xếp", "Actually loaded")}
                </dt>
                <dd className="font-mono text-lg font-bold text-accent-primary">
                  {c.loadedKg} kg
                </dd>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-surface-overlay/20 border border-ink-tertiary/15">
                <dt className="text-xs font-semibold text-ink-secondary mb-1">
                  {text("Còn lại", "Remaining")}
                </dt>
                <dd className="font-mono text-lg font-bold text-accent-warning">
                  {c.remainingKg} kg
                </dd>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-surface-overlay/20 border border-ink-tertiary/15">
                <dt className="text-xs font-semibold text-ink-secondary mb-1">
                  {text("Trạng thái", "Status")}
                </dt>
                <dd className="font-mono text-lg font-bold text-ink-primary">
                  {c.status}
                </dd>
              </div>
            </dl>

            {/* Quarantine HOLD Warning */}
            {c.holds.length > 0 && (
              <div
                role="alert"
                className="p-4 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg text-accent-danger text-xs space-y-2"
              >
                <div className="flex items-center gap-2">
                  <LockSimple size={18} weight="bold" />
                  <strong className="font-bold tracking-wider">
                    {text(
                      "CONTAINER ĐANG CÓ LỆNH PHONG TỎA (HOLD)",
                      "CONTAINER UNDER QUARANTINE HOLD",
                    )}
                  </strong>
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {c.holds.map((h) => (
                    <li key={h.id}>{h.reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Container Workflow Step Tabs */}
            <nav
              aria-label={text("Các bước container", "Container steps")}
              className="flex flex-wrap gap-2 pt-2 border-t border-ink-tertiary/10"
            >
              <Link
                aria-current={step === "plan" ? "step" : undefined}
                to={blendPlanRequestPath(c.orderId, id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  step === "plan"
                    ? "bg-accent-primary text-white shadow-xs"
                    : "bg-surface-base hover:bg-surface-raised border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary"
                }`}
              >
                <ChartPieSlice size={16} />
                <span>{text("Phối trộn", "Blend planning")}</span>
              </Link>

              <Link
                aria-current={step === "loading" ? "step" : undefined}
                to={containerPath(exportPaths.loading, id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  step === "loading"
                    ? "bg-accent-primary text-white shadow-xs"
                    : "bg-surface-base hover:bg-surface-raised border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary"
                }`}
              >
                <Truck size={16} />
                <span>{text("Xếp hàng", "Loading")}</span>
              </Link>

              <Link
                aria-current={step === "closure" ? "step" : undefined}
                to={containerPath(exportPaths.closure, id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  step === "closure"
                    ? "bg-accent-primary text-white shadow-xs"
                    : "bg-surface-base hover:bg-surface-raised border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary"
                }`}
              >
                <ShieldCheck size={16} />
                <span>{text("Niêm phong", "Closure")}</span>
              </Link>

              <Link
                aria-current={step === "dossier" ? "step" : undefined}
                to={containerPath(exportPaths.dossier, id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  step === "dossier"
                    ? "bg-accent-primary text-white shadow-xs"
                    : "bg-surface-base hover:bg-surface-raised border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary"
                }`}
              >
                <FileText size={16} />
                <span>{text("Hồ sơ", "Dossier")}</span>
              </Link>
            </nav>
          </section>

          {/* Readiness check panel */}
          {step !== "dossier" && step !== "plan" && c.status !== "CLOSED" && (
            <ContainerReadiness readiness={readiness} />
          )}

          {/* Plan Step Content */}
          {step === "plan" && (
            <div className="space-y-4">
              <BlendPlanRequestModalContent
                orderId={c.orderId}
                containerId={id}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Link
                  to={`${exportPaths.orders}?order=${encodeURIComponent(c.orderId)}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-base hover:bg-surface-raised border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary text-xs font-semibold transition-all shadow-xs"
                >
                  <ArrowLeft size={14} />
                  <span>{text("Về đơn hàng", "Back to order")}</span>
                </Link>
                <Link
                  to={containerPath(exportPaths.loading, id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white text-xs font-semibold transition-all shadow-xs ml-auto"
                >
                  <span>{text("Chuyển sang bước Xếp hàng", "Proceed to loading")}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}

          {/* Loading Step Content */}
          {step === "loading" && (
            <>
              {c.approval?.mode === "BLEND_INPUT_STOCK" && (
                <ContainerProductionPanel
                  container={c}
                  canWrite={Boolean(canWrite && canAssess)}
                  saved={refresh}
                />
              )}

              <ContainerLoadingForm
                container={c}
                readiness={readiness}
                canWrite={Boolean(canWrite && canAssess)}
                refreshing={execution.isFetching || execution.isError}
                saved={refresh}
              />

              {c.loads.length > 0 && (
                <section
                  aria-label={text("Lần xếp đã ghi nhận", "Recorded loads")}
                  className={`${panelClass}`}
                >
                  <div className="flex items-center gap-2.5 border-b border-ink-tertiary/15 pb-3">
                    <ClockCounterClockwise
                      size={20}
                      className="text-accent-primary"
                    />
                    <h2 className="font-display text-sm font-bold text-ink-primary">
                      {text("Lần xếp đã ghi nhận", "Recorded loads")}
                    </h2>
                  </div>

                  <ul className="space-y-3">
                    {c.loads.map((l) => (
                      <li
                        key={l.id}
                        className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-surface-overlay/20 border border-ink-tertiary/15 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between text-ink-secondary">
                          <span className="font-medium">
                            {new Date(l.loadedAt).toLocaleString()}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {l.lines.map((line, i) => (
                            <li
                              key={i}
                              className="flex items-center justify-between font-mono text-ink-primary"
                            >
                              <span>{line.lotCode}</span>
                              <strong className="text-accent-primary">
                                {line.quantityKg} kg
                              </strong>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Link
                  to={blendPlanRequestPath(c.orderId, id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-base hover:bg-surface-raised border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary text-xs font-semibold transition-all shadow-xs"
                >
                  <ArrowLeft size={14} />
                  <span>{text("Phương án phối trộn", "Blend planning")}</span>
                </Link>
                <Link
                  to={containerPath(exportPaths.closure, id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white text-xs font-semibold transition-all shadow-xs ml-auto"
                >
                  <span>{text("Chuyển sang bước Niêm phong", "Proceed to closure")}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </>
          )}

          {/* Closure Step Content */}
          {step === "closure" && (
            <>
              <ContainerClosureForm
                container={c}
                readiness={readiness}
                canWrite={Boolean(canWrite)}
                canClose={Boolean(canWrite && canAssess)}
                refreshing={execution.isFetching || execution.isError}
                saved={refresh}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Link
                  to={containerPath(exportPaths.loading, id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-base hover:bg-surface-raised border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary text-xs font-semibold transition-all shadow-xs"
                >
                  <ArrowLeft size={14} />
                  <span>{text("Quay lại Xếp hàng", "Back to loading")}</span>
                </Link>
                <Link
                  to={containerPath(exportPaths.dossier, id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white text-xs font-semibold transition-all shadow-xs ml-auto"
                >
                  <span>{text("Xem Hồ sơ & Chứng từ", "View dossier & documents")}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </>
          )}

          {/* Dossier Step Content */}
          {step === "dossier" && (
            <>
              <ContainerDossierPanel
                container={c}
                canWrite={Boolean(canWrite)}
                saved={refresh}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Link
                  to={containerPath(exportPaths.closure, id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-base hover:bg-surface-raised border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary text-xs font-semibold transition-all shadow-xs"
                >
                  <ArrowLeft size={14} />
                  <span>{text("Xem bước Niêm phong", "View closure")}</span>
                </Link>
              </div>
            </>
          )}

          {/* Related Plans Panel */}
          <section
            aria-label={text("Phương án liên quan", "Related plans")}
            className={`${panelClass}`}
          >
            <div className="flex items-center gap-2.5 border-b border-ink-tertiary/15 pb-3">
              <ChartPieSlice size={20} className="text-accent-primary" />
              <h2 className="font-display text-sm font-bold text-ink-primary">
                {text("Phương án liên quan", "Related plans")}
              </h2>
            </div>

            <Feedback pending={plans.isPending} error={plans.error} />

            {plans.data && plans.data.length > 0 ? (
              <div className="space-y-2">
                {plans.data.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-surface-overlay/20 border border-ink-tertiary/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <p className="font-medium text-ink-primary flex items-center gap-2">
                      <span className="font-mono font-bold">
                        v{p.versionNo}
                      </span>
                      <span>·</span>
                      <span className="rounded bg-surface-base px-2 py-0.5 text-xs font-semibold">
                        {p.status}
                      </span>
                      <span>·</span>
                      <span className="font-mono">{p.targetMassKg} kg</span>
                    </p>

                    {p.hasProposal && (
                      <Link
                        to={planReviewPath(p.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-base hover:bg-surface-raised border border-ink-tertiary/20 text-accent-primary text-xs font-semibold transition-all shadow-xs"
                      >
                        <FileText size={14} />
                        <span>
                          {text(
                            "Xem quyết định và bảo lưu",
                            "View decision and reservation",
                          )}
                        </span>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-secondary py-2">
                {text(
                  "Chưa có phương án cho container này.",
                  "No plans for this container.",
                )}
              </p>
            )}
          </section>

          {/* History Panel */}
          <ContainerHistory id={id} />
        </>
      )}
    </div>
  );
}

function ContainerHistory({ id }: { id: string }) {
  const text = useWorkflowText();
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: ["container-execution-history", id, page],
    queryFn: () =>
      containerExecutionEndpoints.getHistory(id, { page, pageSize: 20 }),
  });

  return (
    <section
      aria-label={text("Lịch sử container", "Container history")}
      className={`${panelClass}`}
    >
      <div className="flex items-center gap-2.5 border-b border-ink-tertiary/15 pb-3">
        <ClockCounterClockwise size={20} className="text-accent-primary" />
        <h2 className="font-display text-sm font-bold text-ink-primary">
          {text("Lịch sử container", "Container history")}
        </h2>
      </div>

      <Feedback error={history.error} pending={history.isPending} />

      {history.data && (
        <div className="space-y-4">
          {history.data.items.length > 0 ? (
            <ul className="space-y-2">
              {history.data.items.map((e) => (
                <li
                  key={e.id}
                  className="p-3 rounded-xl bg-surface-raised/40 dark:bg-surface-overlay/20 border border-ink-tertiary/10 flex items-center justify-between text-xs"
                >
                  <span className="font-mono font-semibold text-ink-primary">
                    {e.kind}
                  </span>
                  <span className="text-ink-secondary">
                    {new Date(e.recorded_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-secondary py-2">
              {text("Chưa có sự kiện.", "No events yet.")}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={page === 1 || history.isFetching}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-base hover:bg-surface-raised border border-ink-tertiary/20 text-xs font-semibold text-ink-secondary hover:text-ink-primary transition-all disabled:opacity-40"
            >
              <CaretLeft size={14} />
              <span>{text("Trước", "Previous")}</span>
            </button>

            <span className="font-mono text-xs font-bold text-ink-primary px-2">
              {page}
            </span>

            <button
              type="button"
              disabled={!history.data.hasMore || history.isFetching}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-base hover:bg-surface-raised border border-ink-tertiary/20 text-xs font-semibold text-ink-secondary hover:text-ink-primary transition-all disabled:opacity-40"
            >
              <span>{text("Sau", "Next")}</span>
              <CaretRight size={14} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
