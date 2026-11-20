import { useId, useState, type ReactNode } from "react";
import { ExportActionLink as Link } from "./ExportActionLink";
import {
  ArrowRight,
  ChartPieSlice,
  FileText,
  LockSimple,
  Plus,
  Truck,
} from "@phosphor-icons/react";
import type { ExportContainerDto } from "@/api/exports";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { blendPlanRequestPath, containerPath, exportPaths } from "../paths";
import {
  containerStatus,
  massLabel,
  sumMass,
} from "../model/exportPresentation";
import { ExportEmpty, ExportSearch } from "./ExportWorkspaceUI";

/** Stages describe recorded lifecycle, never an inferred loaded mass. */
export function ExportContainerList({
  containers,
  orderId,
  scope,
  onAllocate,
}: {
  containers: ExportContainerDto[];
  orderId: string;
  scope?: ReactNode;
  onAllocate?: () => void;
}) {
  const text = useWorkflowText();
  const id = useId();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const rows = containers.filter(
    (c) =>
      c.internalCode.toLowerCase().includes(search.trim().toLowerCase()) &&
      (status === "ALL" || c.status === status),
  );
  const stages = [
    {
      id: "PLANNED",
      label: text("Chuẩn bị xếp hàng", "Prepare loading"),
      description: text(
        "Lập phương án và kiểm tra điều kiện trước khi xếp.",
        "Plan and check readiness before loading.",
      ),
      icon: ChartPieSlice,
    },
    {
      id: "LOADING",
      label: text("Đang xếp hàng", "Loading in progress"),
      description: text(
        "Ghi nhận thực xếp và hoàn thiện thông tin niêm phong.",
        "Record loading and complete seal metadata.",
      ),
      icon: Truck,
    },
    {
      id: "CLOSED",
      label: text("Đã niêm phong", "Closed containers"),
      description: text(
        "Tra cứu hồ sơ và chứng từ đã phát hành.",
        "Inspect issued dossiers and documents.",
      ),
      icon: LockSimple,
    },
    ...(containers.some(
      (c) => !["PLANNED", "LOADING", "CLOSED"].includes(c.status),
    )
      ? [
          {
            id: "OTHER",
            label: text("Trạng thái khác", "Other states"),
            description: text(
              "Mở container để xem điều kiện và hạn chế hiện tại.",
              "Open the container to inspect current restrictions.",
            ),
            icon: Truck,
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-5">
      <section
        aria-label={text("Điều phối container", "Container dispatch")}
        className="rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 sm:p-5"
      >
        <div className="grid grid-cols-1 items-end gap-4 [&>div]:min-w-0 [&>div]:max-w-none [@container_workspace_(width>40rem)]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(10rem,0.7fr)]">
          <div>{scope}</div>
          <ExportSearch
            label={text("Tìm mã container", "Search container code")}
            value={search}
            onChange={setSearch}
          />
          <div>
            <label
              htmlFor={id}
              className="mb-1.5 block text-xs font-semibold text-ink-secondary"
            >
              {text("Trạng thái container", "Container status")}
            </label>
            <select
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg"
              id={id}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">
                {text("Tất cả trạng thái", "All statuses")}
              </option>
              {Array.from(
                new Set([
                  "PLANNED",
                  "LOADING",
                  "CLOSED",
                  ...containers.map((c) => c.status),
                ]),
              ).map((s) => (
                <option key={s} value={s}>
                  {text(...containerStatus(s).label)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-tertiary/15 pt-4 text-xs">
          <p>
            <strong>{rows.length}</strong> / {containers.length} container{" "}
            <span className="mx-2 text-ink-tertiary">·</span>
            {text("Tổng mục tiêu", "Total target")}:{" "}
            <span className="font-mono font-semibold">
              {massLabel(
                sumMass(containers.map((c) => c.targetMassKg)),
                text("vi", "en"),
              )}{" "}
              kg
            </span>
          </p>
          {onAllocate ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-accent-primary bg-accent-primary px-4 text-ink-inverse hover:bg-accent-primary-dim inline-flex items-center gap-1.5"
              onClick={onAllocate}
            >
              <Plus size={15} aria-hidden="true" />
              {text("Phân bổ thêm container", "Allocate more containers")}
            </button>
          ) : (
            <Link
              className="inline-flex items-center gap-1.5 font-semibold text-accent-primary"
              to={`${exportPaths.orders}?order=${encodeURIComponent(orderId)}`}
            >
              {text("Chi tiết đơn hàng", "Order details")}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>
      {!rows.length ? (
        <ExportEmpty
          title={
            containers.length
              ? text("Không có container phù hợp.", "No matching containers.")
              : text("Chưa có container.", "No containers yet.")
          }
          description={
            containers.length
              ? text(
                  "Thử đổi mã tìm kiếm hoặc trạng thái lọc.",
                  "Try a different code or status filter.",
                )
              : text(
                  "Phân bổ container từ đơn hàng để bắt đầu lập phương án.",
                  "Allocate containers from the order to start planning.",
                )
          }
          icon={<Truck size={24} />}
          action={
            !containers.length && onAllocate ? (
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-accent-primary bg-accent-primary px-4 text-ink-inverse hover:bg-accent-primary-dim"
                onClick={onAllocate}
              >
                <Plus size={15} aria-hidden="true" />
                {text("Phân bổ container ngay", "Allocate container now")}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 [@container_workspace_(width>60rem)]:grid-cols-3">
          {stages
            .filter(
              (stage) =>
                status === "ALL" ||
                stage.id === status ||
                (stage.id === "OTHER" &&
                  !["PLANNED", "LOADING", "CLOSED"].includes(status)),
            )
            .map(({ id: stage, label, description, icon: Icon }) => {
              const items = rows.filter((c) =>
                stage === "OTHER"
                  ? !["PLANNED", "LOADING", "CLOSED"].includes(c.status)
                  : c.status === stage,
              );
              return (
                <section
                  key={stage}
                  aria-label={label}
                  className="min-w-0 rounded-2xl border border-ink-tertiary/20 border-t-[3px] border-t-ink-tertiary bg-surface-raised/65 p-4 data-[stage=LOADING]:border-t-accent-warning data-[stage=CLOSED]:border-t-accent-primary"
                  data-stage={stage}
                >
                  <header className="mb-4">
                    <div className="flex items-center gap-2">
                      <Icon
                        size={18}
                        className="text-accent-primary"
                        aria-hidden="true"
                      />
                      <h2 className="font-display text-sm font-bold">
                        {label}
                      </h2>
                      <span className="ml-auto rounded-full border border-ink-tertiary/20 px-2 py-0.5 font-mono text-xs">
                        {items.length}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
                      {description}
                    </p>
                  </header>
                  <div className="space-y-3">
                    {items.map((c) => {
                      const badge = containerStatus(c.status);
                      return (
                        <article
                          key={c.id}
                          className="rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4"
                        >
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="break-all font-mono text-sm font-bold">
                              {c.internalCode}
                            </h3>
                            <StatusBadge
                              status={badge.type}
                              label={text(...badge.label)}
                              size="sm"
                            />
                          </div>
                          <p className="text-[11px] text-ink-secondary">
                            {text("Mục tiêu container", "Container target")}
                          </p>
                          <p className="mt-1 font-mono text-xl font-semibold">
                            {massLabel(c.targetMassKg, text("vi", "en"))}{" "}
                            <span className="text-xs font-normal text-ink-secondary">
                              kg
                            </span>
                          </p>
                          <div className="mt-5 space-y-2">
                            {c.status === "CLOSED" ? (
                              <Link
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-accent-primary bg-accent-primary px-4 text-ink-inverse hover:bg-accent-primary-dim w-full"
                                to={containerPath(exportPaths.dossier, c.id)}
                              >
                                <FileText size={16} aria-hidden="true" />
                                {text("Hồ sơ", "Records")}
                                <span className="sr-only">
                                  {" "}
                                  · {c.internalCode}
                                </span>
                                <ArrowRight size={14} aria-hidden="true" />
                              </Link>
                            ) : (
                              <>
                                <Link
                                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-accent-primary bg-accent-primary px-4 text-ink-inverse hover:bg-accent-primary-dim w-full"
                                  to={containerPath(exportPaths.loading, c.id)}
                                >
                                  <Truck size={16} aria-hidden="true" />
                                  {text("Xếp hàng", "Loading")}
                                  <span className="sr-only">
                                    {" "}
                                    · {c.internalCode}
                                  </span>
                                  <ArrowRight size={14} aria-hidden="true" />
                                </Link>
                                <div className="flex flex-wrap justify-between gap-2">
                                  <Link
                                    className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-accent-primary hover:underline hover:underline-offset-2"
                                    to={blendPlanRequestPath(orderId, c.id)}
                                  >
                                    {text("Phối trộn", "Blend plans")}
                                    <span className="sr-only">
                                      {" "}
                                      · {c.internalCode}
                                    </span>
                                  </Link>
                                  <Link
                                    className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-accent-primary hover:underline hover:underline-offset-2"
                                    to={containerPath(
                                      exportPaths.closure,
                                      c.id,
                                    )}
                                  >
                                    {text("Niêm phong", "Closure")}
                                    <span className="sr-only">
                                      {" "}
                                      · {c.internalCode}
                                    </span>
                                  </Link>
                                </div>
                              </>
                            )}
                          </div>
                        </article>
                      );
                    })}
                    {!items.length && (
                      <p className="rounded-xl border border-dashed border-ink-tertiary/25 p-5 text-center text-xs text-ink-secondary">
                        {text(
                          "Không có container ở bước này.",
                          "No containers at this stage.",
                        )}
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
        </div>
      )}
    </div>
  );
}
