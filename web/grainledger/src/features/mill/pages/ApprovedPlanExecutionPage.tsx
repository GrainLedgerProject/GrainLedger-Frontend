import { useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowsClockwise,
  CheckCircle,
  Factory,
  GitBranch,
  LockSimple,
  Package,
  Scales,
  Stack,
  Truck,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  containerExecutionEndpoints,
  type ContainerProduction,
  type ContainerProductionDraft,
  type ContainerWorkItem,
} from "@/api/containerExecution";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { confirmAction } from "@/app/store/feedbackStore";
import { useAuthStore } from "@/app/store/authStore";
import { ContainerCommandFeedback } from "@/features/export/components/ContainerCommandFeedback";
import { ContainerControls } from "@/features/export/components/ContainerControls";
import { useContainerCommand } from "@/features/export/hooks/useContainerCommand";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { StatusBadge, type StatusType } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { millPaths } from "../paths";

type ProductionCommand =
  | { action: "draft"; version: number; draft: ContainerProductionDraft }
  | { action: "commit" | "next"; version: number };

function massUnits(value: string): bigint {
  if (!/^\d{1,14}(\.\d{1,6})?$/.test(value)) throw new Error("Invalid kg");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}

function massText(value: bigint): string {
  return `${value / 1_000_000n}.${(value % 1_000_000n).toString().padStart(6, "0")}`;
}

function localDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function workStateBadge(state: string): StatusType {
  switch (state) {
    case "APPROVED":
    case "HANDOFF_AVAILABLE":
      return "COMPLIANT";
    case "REJECTED":
      return "REJECTED";
    case "DRAFT":
    case "APPROVAL_CHANGED":
      return "PENDING";
    case "PRODUCED":
    case "REQUESTED":
      return "IN_PROGRESS";
    default:
      return "ACTIVE";
  }
}

export function ApprovedPlanExecutionPage() {
  const text = useWorkflowText();
  const user = useAuthStore((state) => state.user);
  const { planId } = useParams();
  const [params, setParams] = useSearchParams();
  const operator =
    user?.role === "MILL_OPERATOR" &&
    user.permissions.includes("containers.operate");
  const manager =
    user?.role === "MILL_MANAGER" && user.permissions.includes("holds.process");
  const allowed = operator || manager;
  const workItems = useQuery({
    queryKey: ["container-work-items", user?.id],
    queryFn: containerExecutionEndpoints.getWorkItems,
    enabled: allowed,
  });
  const production = useQuery({
    queryKey: ["container-production-list", user?.id],
    queryFn: containerExecutionEndpoints.listProduction,
    enabled: operator,
  });
  const requestedContainerId = params.get("container") ?? "";
  const selected = workItems.data?.items.find(
    (item) => item.containerId === requestedContainerId,
  );
  const needsDirectFallback = Boolean(
    allowed &&
    requestedContainerId &&
    !selected &&
    !workItems.isPending &&
    !workItems.error,
  );
  const canReadExecutionDetail = Boolean(
    user?.permissions.includes("export-orders.read"),
  );
  const directWorkflow = useQuery({
    queryKey: ["container-workflow", requestedContainerId],
    queryFn: () =>
      containerExecutionEndpoints.getWorkflow(requestedContainerId),
    enabled: needsDirectFallback,
    retry: false,
  });
  const directDetail = useQuery({
    queryKey: ["container-execution-direct", requestedContainerId],
    queryFn: () => containerExecutionEndpoints.getDetail(requestedContainerId),
    enabled: needsDirectFallback && canReadExecutionDetail,
    retry: false,
  });
  const directLookups = useQuery({
    queryKey: ["container-direct-lookups"],
    queryFn: async () =>
      (await ledgerEndpoints.getLookups()) as SetupApiResponse,
    enabled: needsDirectFallback && Boolean(manager),
  });
  const productionStates = new Map(
    production.data?.items.map((item) => [item.containerId, item.state]),
  );
  const canWrite = Boolean(
    operator && user?.permissions.includes("conversions.write"),
  );

  const items = workItems.data?.items ?? [];
  const blendCount = items.filter(
    (item) => item.mode === "BLEND_INPUT_STOCK",
  ).length;
  const directCount = items.filter(
    (item) => item.mode !== "BLEND_INPUT_STOCK",
  ).length;
  const directError =
    directWorkflow.error ?? (directWorkflow.data ? null : directDetail.error);

  function selectContainer(nextId: string) {
    const next = new URLSearchParams(params);
    if (nextId) next.set("container", nextId);
    else next.delete("container");
    setParams(next);
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-ink-tertiary/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {text(
              "THỰC THI KẾ HOẠCH NHÀ MÁY & CONTAINER",
              "MILL EXECUTION & CONTAINER HANDOFF",
            )}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">
            {text("Thực thi kế hoạch container", "Container work queue")}
          </h1>
          <p
            data-ui-detail="secondary"
            className="mt-0.5 text-xs text-ink-secondary"
          >
            {text(
              "Theo dõi hàng đợi công việc container tại cơ sở được phân công, ghi nhận mẻ phối trộn và xử lý bàn giao hoặc lệnh HOLD.",
              "Track open container work at assigned facilities, record blend batches, and manage handoffs or HOLD responses.",
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            to={millPaths.stock}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-accent-primary transition-colors hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <Package size={15} aria-hidden="true" />
            <span>{text("Kiểm tra tồn kho", "Check stock")}</span>
          </Link>
          {allowed && (
            <button
              type="button"
              disabled={workItems.isFetching}
              onClick={() => {
                void workItems.refetch();
                if (operator) void production.refetch();
              }}
              aria-label={text("Tải lại công việc", "Reload work")}
              title={text("Tải lại công việc", "Reload work")}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:opacity-50 dark:bg-surface-raised dark:hover:bg-surface-overlay"
            >
              <ArrowsClockwise
                size={15}
                aria-hidden="true"
                className={
                  workItems.isFetching || production.isFetching
                    ? "motion-safe:animate-spin text-accent-primary"
                    : undefined
                }
              />
              <span>{text("Tải lại công việc", "Reload work")}</span>
            </button>
          )}
        </div>
      </header>

      {allowed ? (
        <>
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
              <div className="flex items-center justify-between text-ink-secondary">
                <span className="text-xs font-medium">
                  {text("Công việc đang mở", "Open container jobs")}
                </span>
                <Truck
                  size={16}
                  className="text-accent-primary"
                  aria-hidden="true"
                />
              </div>
              <div className="font-display text-2xl font-bold text-ink-primary">
                {items.length}
              </div>
              <p className="text-[11px] text-ink-tertiary">
                {text(
                  "Container trong hàng đợi cơ sở được phân công",
                  "Containers queued at assigned facilities",
                )}
              </p>
            </div>

            <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
              <div className="flex items-center justify-between text-ink-secondary">
                <span className="text-xs font-medium">
                  {text("Cần sản xuất phối trộn", "Blend production jobs")}
                </span>
                <Factory
                  size={16}
                  className="text-accent-primary"
                  aria-hidden="true"
                />
              </div>
              <div className="font-display text-2xl font-bold text-ink-primary">
                {blendCount}
              </div>
              <p className="text-[11px] text-ink-tertiary">
                {text(
                  "Yêu cầu ghi nhận mẻ phối trộn thực tế",
                  "Requires recording actual blend batches",
                )}
              </p>
            </div>

            <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
              <div className="flex items-center justify-between text-ink-secondary">
                <span className="text-xs font-medium">
                  {text("Xuất thẳng / Bàn giao", "Direct stock / Handoff")}
                </span>
                <CheckCircle
                  size={16}
                  className="text-accent-primary"
                  aria-hidden="true"
                />
              </div>
              <div className="font-display text-2xl font-bold text-ink-primary">
                {directCount}
              </div>
              <p className="text-[11px] text-ink-tertiary">
                {text(
                  "Duyệt phạm vi, bàn giao hoặc xử lý HOLD",
                  "Scope review, handoff or HOLD handling",
                )}
              </p>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-2">
            {/* Left Half: Container Selector Card */}
            <section className="record-card min-w-0">
              <div className="record-card-header">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="record-icon-tile" aria-hidden="true">
                    <Package size={20} weight="bold" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-base font-bold text-ink-primary">
                        {text(
                          "Công việc tại cơ sở được phân công",
                          "Work at assigned facilities",
                        )}
                      </h2>
                      <StatusBadge
                        status="ACTIVE"
                        size="sm"
                        label={`${items.length}`}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-ink-secondary">
                      {text(
                        "Chọn container từ danh sách hoặc thẻ bên dưới để thao tác chi tiết.",
                        "Select a container from the dropdown or cards below to execute work.",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-6">
                {(workItems.error ?? production.error) && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
                  >
                    <WarningCircle
                      size={18}
                      weight="fill"
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
                      <Feedback error={workItems.error ?? production.error} />
                    </div>
                  </div>
                )}

                {workItems.isPending ? (
                  <div className="flex justify-center py-8">
                    <GrainLoader
                      label={text(
                        "Đang tải công việc container...",
                        "Loading container work items...",
                      )}
                    />
                  </div>
                ) : items.length === 0 ? (
                  <div className="record-empty py-8">
                    <span
                      aria-hidden="true"
                      className="text-ink-tertiary opacity-60"
                    >
                      <Truck size={32} />
                    </span>
                    <p className="font-semibold text-ink-primary">
                      {text(
                        "Chưa có công việc đang mở.",
                        "There is no open container work.",
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="record-form">
                      <label>
                        <span>{text("Container", "Container")}</span>
                        <select
                          value={selected?.containerId ?? ""}
                          onChange={(event) =>
                            selectContainer(event.target.value)
                          }
                        >
                          <option value="">
                            {text("Chọn container", "Select a container")}
                          </option>
                          {items.map((item) => (
                            <option
                              key={item.containerId}
                              value={item.containerId}
                            >
                              {item.code} ·{" "}
                              {productionStates.get(item.containerId) ??
                                item.state}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {items.map((item) => {
                        const active = selected?.containerId === item.containerId;
                        const currentState =
                          productionStates.get(item.containerId) ?? item.state;
                        return (
                          <button
                            key={item.containerId}
                            type="button"
                            aria-pressed={active}
                            onClick={() => selectContainer(item.containerId)}
                            className={`flex min-w-0 flex-col justify-between gap-2 rounded-xl border p-3.5 text-start transition-all ${
                              active
                                ? "border-accent-primary bg-accent-primary/5 ring-2 ring-accent-primary/15 dark:bg-accent-primary/10"
                                : "border-ink-tertiary/20 bg-surface-raised/40 hover:border-accent-primary/40 hover:bg-surface-raised dark:bg-surface-overlay/25 dark:hover:bg-surface-overlay"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-mono text-sm font-bold text-ink-primary">
                                {item.code}
                              </span>
                              <StatusBadge
                                status={workStateBadge(currentState)}
                                size="sm"
                                label={currentState}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[11px] text-ink-secondary">
                              <span className="truncate">
                                {item.mode === "BLEND_INPUT_STOCK"
                                  ? text("Phối trộn đầu vào", "Blend input stock")
                                  : text("Xuất thẳng tồn kho", "Direct stock")}
                              </span>
                              <span className="truncate font-mono text-ink-tertiary">
                                {item.mode}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {planId && !selected && !workItems.isPending && (
                  <div className="rounded-xl border border-functional-stale-border bg-functional-stale-bg/50 p-3.5 text-xs text-ink-primary">
                    {text(
                      "Chọn container để đối chiếu phương án trong liên kết.",
                      "Choose a container to match the plan in this link.",
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Right Half: Execution, Handoffs, Scope Reviews & HOLD */}
            <div className="min-w-0 space-y-6">
              {!selected && !needsDirectFallback && (
                <section className="record-card">
                  <div className="record-card-header">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="record-icon-tile" aria-hidden="true">
                        <Truck size={20} weight="bold" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="font-display text-base font-bold text-ink-primary">
                          {text(
                            "Thực thi, bàn giao & xử lý HOLD",
                            "Execution, handoffs & HOLD",
                          )}
                        </h2>
                        <p className="mt-0.5 text-xs text-ink-secondary">
                          {text(
                            "Ghi nhận mẻ phối trộn, duyệt phạm vi, bàn giao tồn kho và phản hồi HOLD cho container được chọn.",
                            "Manage blend batches, handoffs, scope reviews, and HOLD responses for the selected container.",
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="record-empty py-10">
                    <span
                      aria-hidden="true"
                      className="text-ink-tertiary opacity-60"
                    >
                      <GitBranch size={34} />
                    </span>
                    <p className="font-semibold text-ink-primary">
                      {items.length > 0
                        ? text(
                            "Chưa chọn container để thực thi",
                            "No container selected",
                          )
                        : text(
                            "Chưa có container để bàn giao hoặc xử lý",
                            "No container queued for handoff",
                          )}
                    </p>
                    <p className="max-w-md text-xs text-ink-secondary">
                      {items.length > 0
                        ? text(
                            "Chọn một container ở cột bên trái để xem mẻ phối trộn cần ghi nhận, duyệt phạm vi, bàn giao hoặc phản hồi HOLD.",
                            "Select a container on the left to record blend batches, review scope, manage handoffs, or respond to HOLD orders.",
                          )
                        : text(
                            "Khi có công việc đang mở ở cột bên trái, các thao tác bàn giao và xử lý HOLD sẽ hiển thị tại đây.",
                            "Once work is queued on the left, handoff and HOLD actions will appear here.",
                          )}
                    </p>
                  </div>
                </section>
              )}

              {selected && (
                <WorkItem
                  key={selected.containerId}
                  item={selected}
                  planId={planId}
                  canWrite={canWrite}
                  canRespond={Boolean(manager)}
                />
              )}

              {!selected && needsDirectFallback && (
                <div className="space-y-4">
                  {directError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
                    >
                      <WarningCircle
                        size={18}
                        weight="fill"
                        className="mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
                        <Feedback error={directError} />
                      </div>
                    </div>
                  )}

                  {directWorkflow.isPending && (
                    <section className="record-card p-6">
                      <GrainLoader
                        label={text(
                          "Đang mở thông tin container trực tiếp...",
                          "Opening direct container workflow...",
                        )}
                      />
                    </section>
                  )}

                  {directWorkflow.data && (
                    <>
                      <div className="rounded-2xl border border-functional-stale-border bg-functional-stale-bg/50 p-4 text-xs text-ink-primary shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">
                            {text(
                              "Đang mở trực tiếp container ngoài hàng đợi mở (ví dụ container đã CLOSED có cảnh báo HOLD).",
                              "Viewing container opened directly outside the open work queue (such as a CLOSED container with a HOLD alert).",
                            )}
                          </p>
                          <StatusBadge
                            status="CLOSED"
                            size="sm"
                            label={
                              directWorkflow.data.status ??
                              directDetail.data?.container.status ??
                              "CLOSED"
                            }
                          />
                        </div>
                        <p className="mt-1 font-mono text-ink-secondary">
                          {directDetail.data?.container.code ??
                            requestedContainerId}{" "}
                          ·{" "}
                          {directWorkflow.data.status ??
                            directDetail.data?.container.status ??
                            "CLOSED"}
                        </p>
                      </div>
                      <ContainerControls
                        workflow={directWorkflow.data}
                        facilityId={
                          directDetail.data?.container.facilityId ??
                          directWorkflow.data.proposals?.[0]?.context.facilityId ??
                          user?.assignedFacilities?.[0] ??
                          directLookups.data?.facilities?.[0]?.id
                        }
                        canOperate={false}
                        canRespond={Boolean(manager)}
                        refresh={async () => {
                          await Promise.all([
                            directWorkflow.refetch(),
                            canReadExecutionDetail
                              ? directDetail.refetch()
                              : Promise.resolve(),
                            workItems.refetch(),
                          ]);
                        }}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <section className="record-card p-6">
          <div className="flex items-start gap-3">
            <span className="record-icon-tile" aria-hidden="true">
              <LockSimple size={20} weight="bold" />
            </span>
            <div className="space-y-1">
              <h2 className="font-display text-base font-bold text-ink-primary">
                {text(
                  "Giới hạn quyền thực thi",
                  "Container execution restricted",
                )}
              </h2>
              <p role="status" className="text-sm text-ink-secondary">
                {text(
                  "Cần quyền vận hành container hoặc xử lý HOLD tại cơ sở được phân công.",
                  "This screen requires container operations or HOLD processing access at an assigned facility.",
                )}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function WorkItem({
  item,
  planId,
  canWrite,
  canRespond,
}: {
  item: ContainerWorkItem;
  planId?: string;
  canWrite: boolean;
  canRespond: boolean;
}) {
  const text = useWorkflowText();
  const cache = useQueryClient();
  const workflow = useQuery({
    queryKey: ["container-workflow", item.containerId],
    queryFn: () => containerExecutionEndpoints.getWorkflow(item.containerId),
  });
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["container-work-items"] }),
      cache.invalidateQueries({ queryKey: ["container-production-list"] }),
      cache.invalidateQueries({
        queryKey: ["container-production", item.containerId],
      }),
      cache.invalidateQueries({
        queryKey: ["container-workflow", item.containerId],
      }),
    ]);
  };
  const matchesPlan =
    !planId ||
    workflow.data?.proposals?.some((proposal) => proposal.planId === planId);

  return (
    <div className="space-y-6">
      {workflow.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
        >
          <WarningCircle
            size={18}
            weight="fill"
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
            <Feedback error={workflow.error} />
          </div>
        </div>
      )}

      {workflow.isPending && (
        <section className="record-card p-6">
          <GrainLoader
            label={text(
              "Đang tải quy trình container...",
              "Loading container workflow...",
            )}
          />
        </section>
      )}

      {workflow.data && !matchesPlan && (
        <div
          role="status"
          className="rounded-xl border border-functional-stale-border bg-functional-stale-bg/50 p-4 text-xs text-ink-primary"
        >
          {text(
            "Container này không có phương án trong liên kết.",
            "This container does not contain the linked plan.",
          )}
        </div>
      )}

      {workflow.data && matchesPlan && (
        <>
          {canWrite &&
            item.mode === "BLEND_INPUT_STOCK" &&
            item.state !== "HANDOFF_AVAILABLE" && (
              <ProductionWork id={item.containerId} refresh={refresh} />
            )}
          <ContainerControls
            workflow={workflow.data}
            facilityId={item.facilityId}
            canOperate={canWrite}
            canRespond={canRespond}
            refresh={refresh}
          />
        </>
      )}
    </div>
  );
}

function ProductionWork({
  id,
  refresh,
}: {
  id: string;
  refresh: () => Promise<void>;
}) {
  const text = useWorkflowText();
  const [error, setError] = useState<Error | null>(null);
  const task = useQuery({
    queryKey: ["container-production", id],
    queryFn: () => containerExecutionEndpoints.getProduction(id),
  });
  const lookups = useQuery({
    queryKey: ["production-lookups"],
    queryFn: async () =>
      (await ledgerEndpoints.getLookups()) as SetupApiResponse,
  });
  const command = useContainerCommand<ProductionCommand>(
    (operationId, input) => {
      const body = { operationId, version: input.version };
      if (input.action === "draft") {
        return containerExecutionEndpoints.saveProductionDraft(id, {
          ...body,
          draft: input.draft,
        });
      }
      return input.action === "commit"
        ? containerExecutionEndpoints.commitProduction(id, body)
        : containerExecutionEndpoints.prepareNextProduction(id, body);
    },
    refresh,
    { persistKey: `container:${id}:production` },
  );
  const current = task.data;
  const blocked = command.isPending || command.uncertain || task.isFetching;

  async function commit(version: number) {
    if (
      await confirmAction({
        title: text("Chốt bản nháp đã lưu", "Commit the saved draft"),
        description: text(
          "Xác nhận số liệu đã lưu phản ánh mẻ sản xuất thực tế.",
          "Confirm that the saved draft records the actual batch.",
        ),
        confirmLabel: text("Chốt sản xuất", "Commit production"),
      })
    ) {
      command.submit({ action: "commit", version });
    }
  }

  return (
    <section className="record-card">
      <div className="record-card-header">
        <div className="flex min-w-0 items-center gap-3">
          <span className="record-icon-tile" aria-hidden="true">
            <Factory size={20} weight="bold" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-ink-primary">
              {text("Ghi nhận mẻ phối trộn", "Record a blend batch")}
            </h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {text(
                "Lưu nháp khối lượng thực tế theo tỷ lệ đã duyệt, sau đó chốt sản xuất để bàn giao.",
                "Save draft masses matching the approved recipe proportions, then commit production.",
              )}
            </p>
          </div>
        </div>
        {current && (
          <StatusBadge
            status={workStateBadge(current.state)}
            size="sm"
            label={`${current.state}${current.outputCode ? ` · ${current.outputCode}` : ""}`}
          />
        )}
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        {(task.error || lookups.error || error) && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
          >
            <WarningCircle
              size={18}
              weight="fill"
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
              <Feedback error={task.error || lookups.error || error} />
            </div>
          </div>
        )}

        {(task.isPending || lookups.isPending) && !current && (
          <div className="flex justify-center py-8">
            <GrainLoader
              label={text(
                "Đang tải thông tin mẻ sản xuất...",
                "Loading production batch...",
              )}
            />
          </div>
        )}

        {current && (
          <>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-3.5 dark:bg-surface-overlay/30">
                <dt className="text-xs font-medium text-ink-secondary">
                  {text("Trạng thái mẻ", "Batch state")}
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold text-ink-primary">
                  {current.state}
                  {current.outputCode ? ` · ${current.outputCode}` : ""}
                </dd>
              </div>
              <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-3.5 dark:bg-surface-overlay/30">
                <dt className="text-xs font-medium text-ink-secondary">
                  {text("Mục tiêu / Tổng kế hoạch", "Target / Total planned")}
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold text-ink-primary">
                  {current.targetKg ?? "—"} / {current.plannedKg ?? "—"} kg
                </dd>
              </div>
              <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-3.5 dark:bg-surface-overlay/30">
                <dt className="text-xs font-medium text-ink-secondary">
                  {text("Khối lượng còn phải sản xuất", "Remaining production")}
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold text-accent-primary">
                  {current.remainingProductionKg ?? "0"} kg
                </dd>
              </div>
            </dl>

            {current.inputs?.length ? (
              <div className="space-y-2 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-ink-secondary">
                    <Stack
                      size={14}
                      className="text-accent-primary"
                      aria-hidden="true"
                    />
                    <span>
                      {text(
                        "Thành phần nguyên liệu đã phân bổ",
                        "Allocated input ingredients",
                      )}
                    </span>
                  </span>
                  <span className="rounded-full bg-surface-base px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary dark:bg-surface-raised">
                    {current.inputs.length}
                  </span>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {current.inputs.map((line) => (
                    <li
                      key={`${line.lotId}:${line.locationId}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-ink-tertiary/15 bg-surface-base px-3 py-2 text-xs dark:bg-surface-raised"
                    >
                      <span className="font-mono font-bold text-ink-primary">
                        {line.lotCode}
                      </span>
                      <span className="font-mono text-ink-secondary">
                        {line.quantityKg} kg
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {lookups.data && ["REQUESTED", "DRAFT"].includes(current.state) && (
              <ProductionDraftForm
                key={current.version}
                task={current}
                lookups={lookups.data}
                disabled={blocked}
                submit={(draft) => {
                  setError(null);
                  command.submit({
                    action: "draft",
                    version: current.version,
                    draft,
                  });
                }}
                onError={setError}
              />
            )}

            {current.state === "DRAFT" && current.operation && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-functional-balanced-border/40 bg-functional-balanced-bg p-4 text-xs">
                <div className="space-y-0.5">
                  <span className="block text-ink-secondary">
                    {text("Khối lượng đầu ra đã lưu", "Saved output")}
                  </span>
                  <span className="font-mono text-sm font-bold text-accent-primary">
                    {current.operation.outputs[0]?.quantityKg} kg
                  </span>
                </div>
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => void commit(current.version)}
                  className="record-button record-primary rounded-full px-5"
                >
                  <CheckCircle size={15} weight="bold" aria-hidden="true" />
                  <span>
                    {text("Chốt bản nháp đã lưu", "Commit saved draft")}
                  </span>
                </button>
              </div>
            )}

            {["PRODUCED", "APPROVED", "REJECTED"].includes(current.state) &&
              /[1-9]/.test(current.remainingProductionKg ?? "") && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() =>
                      command.submit({
                        action: "next",
                        version: current.version,
                      })
                    }
                    className="record-button rounded-full px-5"
                  >
                    <Scales size={15} aria-hidden="true" />
                    <span>
                      {text("Chuẩn bị mẻ tiếp theo", "Prepare next batch")}
                    </span>
                  </button>
                </div>
              )}
          </>
        )}

        <ContainerCommandFeedback
          error={command.error}
          uncertain={command.uncertain}
          retry={command.retry}
          success={command.isSuccess}
          isPending={command.isPending}
          restoredPending={command.restoredPending}
          discardPending={command.discardPending}
        />
      </div>
    </section>
  );
}

function ProductionDraftForm({
  task,
  lookups,
  disabled,
  submit,
  onError,
}: {
  task: ContainerProduction;
  lookups: SetupApiResponse;
  disabled: boolean;
  submit: (draft: ContainerProductionDraft) => void;
  onError: (error: Error) => void;
}) {
  const text = useWorkflowText();
  const existing = task.operation;
  const [equipment, setEquipment] = useState(existing?.equipmentId ?? "");
  const [location, setLocation] = useState(
    existing?.outputs[0]?.locationId ?? "",
  );
  const [when, setWhen] = useState(() =>
    localDateTime(existing ? new Date(existing.occurredAt) : new Date()),
  );
  const [output, setOutput] = useState(
    existing?.outputs[0]?.quantityKg ?? task.targetKg ?? "",
  );
  const [loss, setLoss] = useState(existing?.declaredLossKg ?? "0");

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const total = massUnits(task.plannedKg ?? "");
      const actual = massUnits(output);
      massUnits(loss);
      if (
        !task.inputs?.length ||
        !task.ownerId ||
        !task.facilityId ||
        !task.outputCommodityId ||
        !actual ||
        !total
      ) {
        throw new Error("Incomplete production scope");
      }
      const inputs = task.inputs.map((line) => {
        const scaled = massUnits(line.approvedKg) * actual;
        const quantity = scaled / total;
        if (
          scaled % total ||
          quantity <= 0n ||
          quantity > massUnits(line.quantityKg)
        ) {
          throw new Error("Outside approved recipe");
        }
        return {
          lotId: line.lotId,
          locationId: line.locationId,
          quantityKg: massText(quantity),
          ...(line.poolRevision != null && { poolRevision: line.poolRevision }),
        };
      });
      submit({
        id: existing?.id ?? crypto.randomUUID(),
        ownerId: task.ownerId,
        facilityId: task.facilityId,
        kind: "BLENDING",
        occurredAt: new Date(when).toISOString(),
        equipmentId: equipment,
        inputs,
        outputs: [
          {
            id: existing?.outputs[0]?.id ?? crypto.randomUUID(),
            code: existing?.outputs[0]?.code ?? "",
            commodityId: task.outputCommodityId,
            stage: "BLENDED_RICE",
            productIdentity: "BLENDED_RICE",
            locationId: location,
            quantityKg: output,
          },
        ],
        declaredLossKg: loss,
        ...(existing?.version && { version: existing.version }),
      });
    } catch {
      onError(
        new Error(
          text(
            "Kiểm tra lại dữ liệu mẻ. Khối lượng phải giữ đúng tỷ lệ phê duyệt và giới hạn tồn kho, với tối đa sáu chữ số thập phân.",
            "Check the batch values. Mass must preserve the approved recipe and stock limits, with up to six decimal places.",
          ),
        ),
      );
    }
  }

  return (
    <form
      onSubmit={save}
      className="record-form space-y-4 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25"
    >
      <fieldset className="grid gap-4 sm:grid-cols-2" disabled={disabled}>
        <label>
          {text("Thiết bị", "Equipment")}
          <select
            value={equipment}
            required
            onChange={(event) => setEquipment(event.target.value)}
          >
            <option value="">
              {text("Chọn thiết bị", "Select equipment")}
            </option>
            {lookups.equipment
              ?.filter((item) => item.facilityId === task.facilityId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          {text("Vị trí đầu ra", "Output location")}
          <select
            value={location}
            required
            onChange={(event) => setLocation(event.target.value)}
          >
            <option value="">{text("Chọn vị trí", "Select location")}</option>
            {lookups.locations
              ?.filter(
                (item) =>
                  item.facilityId === task.facilityId &&
                  item.kind !== "ISOLATION" &&
                  !item.mixedBulk &&
                  (!item.ownerId || item.ownerId === task.ownerId),
              )
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          {text("Thời điểm sản xuất", "Production time")}
          <input
            type="datetime-local"
            required
            value={when}
            onChange={(event) => setWhen(event.target.value)}
          />
        </label>
        <label>
          {text("Đầu ra thực tế (kg)", "Actual output (kg)")}
          <input
            inputMode="decimal"
            required
            value={output}
            onChange={(event) => setOutput(event.target.value)}
            className="font-mono font-semibold"
          />
        </label>
        <label>
          {text("Hao hụt khai báo (kg)", "Declared loss (kg)")}
          <input
            inputMode="decimal"
            required
            value={loss}
            onChange={(event) => setLoss(event.target.value)}
            className="font-mono font-semibold"
          />
        </label>
      </fieldset>

      <div className="record-form-footer">
        <button
          type="submit"
          disabled={disabled}
          className="record-button record-primary rounded-full px-5"
        >
          {text("Lưu bản nháp", "Save draft")}
        </button>
      </div>
    </form>
  );
}
