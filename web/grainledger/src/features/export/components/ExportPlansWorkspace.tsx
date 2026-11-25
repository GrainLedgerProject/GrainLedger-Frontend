import { useId, useState, type ReactNode } from "react";
import { ExportActionLink as Link } from "./ExportActionLink";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Calculator,
  ChartPieSlice,
  FileText,
  Plus,
  Truck,
} from "@phosphor-icons/react";
import { planningEndpoints } from "@/api/planning";
import type { ExportContainerDto } from "@/api/exports";
import { collectPages } from "@/api/query";
import { Feedback } from "@/shared/ui/Workflow";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { blendPlanRequestPath, exportPaths, planReviewPath } from "../paths";
import { massLabel, planStatus } from "../model/exportPresentation";
import { ExportEmpty, ExportSection } from "./ExportWorkspaceUI";

export function ExportPlansWorkspace({
  orderId,
  containers,
  params,
  setParams,
  canPropose,
  scope,
}: {
  orderId: string;
  containers: ExportContainerDto[];
  params: URLSearchParams;
  setParams: (params: URLSearchParams) => void;
  canPropose: boolean;
  scope: ReactNode;
}) {
  const text = useWorkflowText();
  const id = useId();
  const [filter, setFilter] = useState("ALL");
  const requested = params.get("container");
  const selected =
    requested === null
      ? containers[0]
      : containers.find((c) => c.id === requested);
  const plans = useQuery({
    queryKey: ["container-plans", selected?.id],
    queryFn: () =>
      collectPages((q) => planningEndpoints.getBlendPlans(selected!.id, q)),
    enabled: Boolean(selected),
  });
  const rows =
    plans.data
      ?.filter(
        (p) =>
          filter === "ALL" ||
          (filter === "PROPOSED"
            ? p.hasProposal
            : filter === "STALE"
              ? !p.demandCurrent && p.status !== "CANCELLED"
              : filter === "CANCELLED"
                ? p.status === "CANCELLED"
                : p.status === "DRAFT" && !p.hasProposal && p.demandCurrent),
      )
      .slice()
      .sort((a, b) => b.versionNo - a.versionNo) ?? [];
  return (
    <div className="grid grid-cols-1 items-start gap-6 [@container_workspace_(width>48rem)]:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.7fr)]">
      <aside
        className="space-y-4"
        aria-label={text("Nhu cầu phối trộn", "Blend demand")}
      >
        <section className="rounded-2xl border border-ink-tertiary/20 bg-surface-base space-y-4 p-5">
          <div className="flex items-center gap-2 border-b border-ink-tertiary/15 pb-3">
            <ChartPieSlice
              size={20}
              className="text-accent-primary"
              aria-hidden="true"
            />
            <h2 className="font-display text-sm font-bold">
              {text("Chọn nhu cầu", "Choose demand")}
            </h2>
          </div>
          {scope}
          <div>
            <label
              htmlFor={id}
              className="mb-1.5 block text-xs font-semibold text-ink-secondary"
            >
              {text("Container", "Container")}
            </label>
            <select
              className="filter-control border-ink-tertiary/20 bg-surface-raised font-semibold dark:bg-surface-base"
              id={id}
              value={selected?.id ?? ""}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                next.set("container", e.target.value);
                next.delete("plan");
                setParams(next);
              }}
            >
              <option value="" disabled>
                {text("Chọn container", "Select container")}
              </option>
              {containers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.internalCode} ·{" "}
                  {massLabel(c.targetMassKg, text("vi", "en"))} kg
                </option>
              ))}
            </select>
          </div>
          {selected && (
            <div className="rounded-xl bg-accent-primary/5 p-4">
              <p className="text-xs text-ink-secondary">
                {text("Khối lượng cần lập phương án", "Planning target")}
              </p>
              <p className="mt-2 break-words font-mono text-3xl font-bold text-accent-primary">
                {massLabel(selected.targetMassKg, text("vi", "en"))}{" "}
                <span className="text-sm font-medium">kg</span>
              </p>
              <p className="mt-2 break-all font-mono text-xs text-ink-secondary">
                {selected.internalCode}
              </p>
            </div>
          )}
          <Link
            className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-accent-primary hover:underline hover:underline-offset-2"
            to={`${exportPaths.containers}?order=${encodeURIComponent(orderId)}`}
          >
            {text("Xem container của đơn", "View order containers")}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </section>
        {/* <section className="px-2 py-3">
          <h2 className="mb-4 text-xs font-semibold text-ink-secondary">
            {text("Quy trình lập phương án", "Planning workflow")}
          </h2>
          <ol className="grid gap-5">
            {[
              [
                text("Tạo phiên bản", "Create version"),
                text(
                  "Chọn sản phẩm đích theo nhu cầu container.",
                  "Choose a target product for the container.",
                ),
              ],
              [
                text("Tính & đánh giá", "Calculate & assess"),
                text(
                  "Kiểm tra nguồn nguyên liệu và kết quả đánh giá.",
                  "Inspect source stock and assessment findings.",
                ),
              ],
              [
                text("Gửi đề xuất", "Submit proposal"),
                text(
                  "Quản lý xem xét và quyết định bảo lưu tồn kho.",
                  "A manager reviews and decides stock reservation.",
                ),
              ],
            ].map(([title, detail], index) => (
              <li key={title} className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-ink-tertiary/20 text-[11px] font-semibold text-ink-secondary" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-xs font-semibold">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                    {detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section> */}
      </aside>
      <ExportSection
        title={text("Phiên bản phương án", "Plan versions")}
        description={text(
          "Mỗi phiên bản giữ riêng nhu cầu, đánh giá và đề xuất đã gửi.",
          "Each version keeps its own demand, assessment and submitted proposal.",
        )}
        actions={
          canPropose &&
          selected &&
          selected.status !== "CLOSED" && (
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-accent-primary bg-accent-primary px-4 text-ink-inverse hover:bg-accent-primary-dim"
              to={blendPlanRequestPath(orderId, selected.id)}
            >
              <Plus size={15} aria-hidden="true" />
              {text("Tạo phương án", "Create plan")}
            </Link>
          )
        }
        className="min-w-0 self-start"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-secondary">
            <strong className="text-ink-primary">
              {plans.data?.length ?? "—"}
            </strong>{" "}
            {text("phiên bản", "versions")}
            <span className="mx-2">·</span>
            {plans.data?.filter((p) => p.hasProposal).length ?? "—"}{" "}
            {text("đã gửi đề xuất", "submitted")}
          </p>
          <div className="w-full sm:w-56">
            <label htmlFor={`${id}-state`} className="sr-only">
              {text("Lọc phiên bản", "Filter versions")}
            </label>
            <select
              className="filter-control border-ink-tertiary/20 bg-surface-raised font-semibold dark:bg-surface-base"
              id={`${id}-state`}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {[
                ["ALL", text("Tất cả phiên bản", "All versions")],
                ["DRAFT", text("Bản nháp hiện hành", "Current drafts")],
                ["PROPOSED", text("Đã gửi đề xuất", "Submitted proposals")],
                ["STALE", text("Nhu cầu đã thay đổi", "Demand changed")],
                ["CANCELLED", text("Đã hủy", "Cancelled")],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Feedback error={plans.error} />
        {!selected ? (
          <ExportEmpty
            title={
              containers.length
                ? text("Chọn container hợp lệ.", "Select a valid container.")
                : text("Chưa có container.", "No containers yet.")
            }
            description={text(
              "Đơn hàng cần có container mục tiêu để lập phương án.",
              "The order needs a target container before planning.",
            )}
            icon={<Truck size={24} />}
          />
        ) : plans.isPending ? (
          <ExportEmpty
            pending
            title={text("Đang tải phương án…", "Loading plans…")}
          />
        ) : (
          !plans.error &&
          (rows.length ? (
            <ol
              className="grid gap-4"
              aria-label={text(
                "Các phiên bản phương án phối trộn",
                "Blend plan versions",
              )}
            >
              {rows.map((p, index) => {
                const status = planStatus(p);
                return (
                  <li key={p.id}>
                    <article className="rounded-[0.875rem] border border-ink-tertiary/20 border-s-[3px] border-s-accent-primary p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="grid min-h-11 w-11 shrink-0 place-items-center rounded-[0.875rem] bg-surface-raised font-mono text-sm font-bold text-accent-primary">
                            v{p.versionNo}
                          </span>
                          <div>
                            <h3 className="text-sm font-semibold">
                              {p.targetProductIdentity ??
                                text(
                                  "Chưa chọn sản phẩm",
                                  "Product not selected",
                                )}
                            </h3>
                            <p className="mt-1 text-[11px] text-ink-secondary">
                              {new Date(p.createdAt).toLocaleString(
                                text("vi-VN", "en-GB"),
                              )}
                            </p>
                          </div>
                        </div>
                        <StatusBadge
                          status={status.type}
                          label={text(...status.label)}
                          size="sm"
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-ink-tertiary/15 pt-4">
                        <div>
                          <p className="text-[11px] text-ink-secondary">
                            {text("Mục tiêu phiên bản", "Version target")}
                          </p>
                          <p className="mt-1 font-mono text-base font-semibold">
                            {massLabel(p.targetMassKg, text("vi", "en"))} kg
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 [flex-wrap:balance] [@container_(width<560px)]:min-w-36">
                          <Link
                            className={
                              !p.hasProposal &&
                              index === 0 &&
                              p.status !== "CANCELLED"
                                ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-accent-primary bg-accent-primary px-4 text-ink-inverse hover:bg-accent-primary-dim"
                                : "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
                            }
                            to={`${blendPlanRequestPath(orderId, selected.id)}?plan=${encodeURIComponent(p.id)}`}
                          >
                            <Calculator size={15} aria-hidden="true" />
                            {text("Xem phương án", "View plan")}
                            <span className="sr-only"> v{p.versionNo}</span>
                          </Link>
                          {p.hasProposal && (
                            <Link
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-accent-primary bg-accent-primary px-4 text-ink-inverse hover:bg-accent-primary-dim"
                              to={planReviewPath(p.id)}
                            >
                              {text("Xem đề xuất", "View proposal")}
                              <span className="sr-only"> v{p.versionNo}</span>
                              <ArrowRight size={14} aria-hidden="true" />
                            </Link>
                          )}
                        </div>
                      </div>
                      {!p.demandCurrent && p.status !== "CANCELLED" && (
                        <p className="mt-3 text-xs text-accent-warning">
                          {text(
                            "Nhu cầu đã thay đổi. Mở phiên bản để đối chiếu hoặc tạo bản nháp mới.",
                            "Demand changed. Inspect this version or create a new draft.",
                          )}
                        </p>
                      )}
                    </article>
                  </li>
                );
              })}
            </ol>
          ) : (
            <ExportEmpty
              title={
                plans.data?.length
                  ? text("Không có phiên bản phù hợp.", "No matching versions.")
                  : text("Chưa có phương án.", "No plans yet.")
              }
              description={text(
                "Chọn nhu cầu bên cạnh, sau đó tạo bản nháp để bắt đầu tính phương án.",
                "Choose demand, then create a draft to start planning.",
              )}
              icon={<FileText size={24} />}
            />
          ))
        )}
      </ExportSection>
    </div>
  );
}
