import { useRef, useState, type FormEvent } from "react";
import Decimal from "decimal.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowsClockwise,
  CaretDown,
  CaretLeft,
  CaretRight,
  CheckCircle,
  ClockCounterClockwise,
  Factory,
  LockSimple,
  MagnifyingGlass,
  Package,
  Scales,
  ShieldCheck,
  Truck,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  ledgerEndpoints,
  type ReceivingQuery,
  type ReceivingReviewAction,
  type ReceivingStatus,
  type ReceivingTask,
  type ReceivingUnit,
  type SetupApiResponse,
} from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { StatusBadge, type StatusType } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import {
  CorrectionEvidence,
  CorrectionEvidenceDownload,
} from "../components/CorrectionEvidence";
import { millPaths } from "../paths";

const scope = ["ledger-receiving"];
const statuses: Record<ReceivingStatus, [string, string]> = {
  PENDING_ARRIVAL: ["Chờ tiếp nhận", "Pending arrival"],
  AWAITING_MANAGER_REVIEW: ["Chờ quản lý đối soát", "Awaiting manager review"],
  REMEASUREMENT_REQUESTED: ["Yêu cầu cân lại", "Remeasurement requested"],
  BLOCKED_UNRESOLVED: ["Đang chặn nhập kho", "Blocked — unresolved"],
  RECEIVED_MATCHED: ["Đã nhận đúng khối lượng", "Received — exact match"],
  RECEIVED_WITHIN_TOLERANCE: [
    "Đã nhận trong ngưỡng",
    "Received — within tolerance",
  ],
  RECEIVED_SHORTAGE_APPROVED: [
    "Đã duyệt nhập thiếu",
    "Received — shortage approved",
  ],
};
const decisions: Record<ReceivingReviewAction, [string, string]> = {
  APPROVE_SHORTAGE: [
    "Duyệt nhập theo khối lượng thiếu",
    "Approve measured shortage",
  ],
  REQUEST_REMEASUREMENT: ["Yêu cầu cân lại", "Request remeasurement"],
  KEEP_BLOCKED: ["Tiếp tục chặn nhập kho", "Keep blocked"],
};
const units: ReceivingUnit[] = ["KG", "G", "T"];
const Exact = Decimal.clone({ precision: 40 });

const evidenceWrapperClass =
  "rounded-xl border border-ink-tertiary/20 bg-surface-raised/50 p-4 dark:bg-surface-overlay/30 [&_button]:mt-1 [&_button]:inline-flex [&_button]:min-h-10 [&_button]:items-center [&_button]:justify-center [&_button]:gap-2 [&_button]:rounded-full [&_button]:border [&_button]:border-ink-tertiary/20 [&_button]:bg-surface-base [&_button]:px-4 [&_button]:py-2 [&_button]:text-xs [&_button]:font-semibold [&_button]:text-ink-primary [&_button]:transition-colors [&_button]:hover:bg-surface-raised [&_button]:disabled:cursor-not-allowed [&_button]:disabled:opacity-50 dark:[&_button]:bg-surface-overlay dark:[&_button]:hover:bg-surface-raised [&_input[type=file]]:p-2 [&_input[type=file]]:text-sm [&_input[type=file]::file-selector-button]:mr-3 [&_input[type=file]::file-selector-button]:rounded-full [&_input[type=file]::file-selector-button]:border-0 [&_input[type=file]::file-selector-button]:bg-accent-primary/10 [&_input[type=file]::file-selector-button]:px-3 [&_input[type=file]::file-selector-button]:py-1.5 [&_input[type=file]::file-selector-button]:text-xs [&_input[type=file]::file-selector-button]:font-semibold [&_input[type=file]::file-selector-button]:text-accent-primary [&_legend]:font-display [&_legend]:text-sm [&_legend]:font-bold [&_legend]:text-ink-primary [&_p[role=status]]:mt-1 [&_p[role=status]]:inline-flex [&_p[role=status]]:items-center [&_p[role=status]]:gap-1.5 [&_p[role=status]]:rounded-lg [&_p[role=status]]:bg-functional-balanced-bg [&_p[role=status]]:px-3 [&_p[role=status]]:py-2 [&_p[role=status]]:text-xs [&_p[role=status]]:font-semibold [&_p[role=status]]:text-accent-primary";

function mapReceivingBadge(status: ReceivingStatus): StatusType {
  switch (status) {
    case "RECEIVED_MATCHED":
    case "RECEIVED_WITHIN_TOLERANCE":
    case "RECEIVED_SHORTAGE_APPROVED":
      return "COMPLIANT";
    case "BLOCKED_UNRESOLVED":
      return "HOLD";
    case "AWAITING_MANAGER_REVIEW":
      return "IN_PROGRESS";
    case "PENDING_ARRIVAL":
    case "REMEASUREMENT_REQUESTED":
    default:
      return "PENDING";
  }
}

function mapReviewBadge(action: ReceivingReviewAction): StatusType {
  switch (action) {
    case "APPROVE_SHORTAGE":
      return "COMPLIANT";
    case "KEEP_BLOCKED":
      return "HOLD";
    case "REQUEST_REMEASUREMENT":
    default:
      return "PENDING";
  }
}

function actualKg(value: string, unit: ReceivingUnit) {
  if (!/^\d{1,12}(\.\d{1,12})?$/.test(value)) return null;
  const kg = new Exact(value).times(
    unit === "G" ? "0.001" : unit === "T" ? "1000" : "1",
  );
  return kg.gt(0) && kg.lt("100000000000000") && kg.decimalPlaces() <= 6
    ? kg
    : null;
}

export function ReceivingTasksPage() {
  const text = useWorkflowText();
  const user = useAuthStore((s) => s.user);
  const measure =
    user?.role === "MILL_OPERATOR" && user.permissions.includes("lots.receive");
  const review =
    user?.role === "MILL_MANAGER" &&
    user.permissions.includes("receiving.reconcile");
  const canReadStock = Boolean(
    user?.permissions.some((p) =>
      ["lots.read.all", "lots.read.facility", "lots.read.tenant"].includes(p),
    ),
  );
  const [filters, setFilters] = useState<ReceivingQuery>({
    facilityId: "",
    page: 1,
    pageSize: 20,
    sortBy: "receivedAt",
    sortDirection: "desc",
  });
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("");
  const client = useQueryClient();
  const lookups = useQuery({
    queryKey: [...scope, "lookups"],
    queryFn: async () =>
      (await ledgerEndpoints.getLookups()) as SetupApiResponse,
    enabled: Boolean(measure || review),
  });
  const facilities = lookups.data?.facilities ?? [];
  const facilityId =
    filters.facilityId || (facilities.length === 1 ? facilities[0].id : "");
  const queue = useQuery({
    queryKey: [...scope, "queue", { ...filters, facilityId }],
    queryFn: () =>
      ledgerEndpoints.getReceivingTasks({ ...filters, facilityId }),
    enabled: Boolean(facilityId && (measure || review)),
  });
  const detailKey = [...scope, "detail", selected];
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: () => ledgerEndpoints.getReceiving(selected),
    enabled: Boolean(selected),
  });
  const owners = new Map<string, string>();
  for (const owner of (lookups.data?.owners ?? []) as {
    id: string;
    name: string;
  }[])
    owners.set(owner.id, owner.name);
  for (const row of queue.data?.items ?? [])
    owners.set(row.ownerCompanyId, row.ownerCompanyName);

  function filter(patch: Partial<ReceivingQuery>) {
    setSelected("");
    setFilters((current) => ({ ...current, page: 1, ...patch }));
  }

  const refreshing =
    lookups.isFetching || queue.isFetching || detail.isFetching;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-ink-tertiary/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {text(
              "TIẾP NHẬN NGUYÊN LIỆU & ĐỐI SOÁT CÂN",
              "MILL RECEIVING & WEIGHT RECONCILIATION",
            )}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">
            {text("Tiếp nhận tại nhà máy", "Mill receiving")}
          </h1>
          <p
            data-ui-detail="secondary"
            className="mt-0.5 text-xs text-ink-secondary"
          >
            {text(
              "Ghi nhận số cân thực tế theo từng dòng thu mua và đối soát sai lệch so với ngưỡng hao hụt vận chuyển.",
              "Record actual arrival weights by procurement line and reconcile variances against transport thresholds.",
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {user?.role === "MILL_OPERATOR" &&
            user.permissions.includes("conversions.write") && (
              <Link
                to={millPaths.operation}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-accent-primary transition-colors hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-overlay"
              >
                <Factory size={15} aria-hidden="true" />
                <span>{text("Ghi bước chế biến", "Record operation")}</span>
              </Link>
            )}
          {user?.role === "MILL_MANAGER" && (
            <Link
              to={millPaths.reconciliations}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-accent-primary transition-colors hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-overlay"
            >
              <Scales size={15} aria-hidden="true" />
              <span>{text("Đối soát & Xác nhận", "Reconciliations")}</span>
            </Link>
          )}
          {canReadStock && (
            <Link
              to={millPaths.stock}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary dark:bg-surface-raised dark:hover:bg-surface-overlay"
            >
              <Package size={15} aria-hidden="true" />
              <span>{text("Tồn kho định danh", "Ledger stock")}</span>
            </Link>
          )}
          {(measure || review) && (
            <button
              type="button"
              disabled={refreshing}
              aria-label={text("Tải lại", "Refresh")}
              title={text("Tải lại", "Refresh")}
              onClick={() => void client.invalidateQueries({ queryKey: scope })}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-ink-tertiary/20 bg-surface-base text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:opacity-50 dark:bg-surface-raised dark:hover:bg-surface-overlay"
            >
              <ArrowsClockwise
                size={16}
                aria-hidden="true"
                className={
                  refreshing ? "motion-safe:animate-spin text-accent-primary" : undefined
                }
              />
            </button>
          )}
        </div>
      </header>

      {!measure && !review ? (
        <section className="record-card p-6">
          <div className="flex items-start gap-3">
            <span className="record-icon-tile" aria-hidden="true">
              <LockSimple size={20} weight="bold" />
            </span>
            <div className="space-y-1">
              <h2 className="font-display text-base font-bold text-ink-primary">
                {text("Giới hạn quyền tiếp nhận", "Receiving access restricted")}
              </h2>
              <p role="alert" className="text-sm text-ink-secondary">
                {text(
                  "Cần quyền cân hoặc đối soát tiếp nhận tại cơ sở được phân công.",
                  "Receiving requires measurement or review permission at an assigned facility.",
                )}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          {status && (
            <div
              role="status"
              className="flex items-center gap-2.5 rounded-2xl border border-functional-balanced-border bg-functional-balanced-bg px-4 py-3 text-xs font-semibold text-accent-primary"
            >
              <CheckCircle size={18} weight="fill" aria-hidden="true" />
              <span>{status}</span>
            </div>
          )}

          {/* Receiving Queue Card */}
          <section className="record-card">
            <div className="record-card-header">
              <div className="flex min-w-0 items-center gap-3">
                <span className="record-icon-tile" aria-hidden="true">
                  <Truck size={20} weight="bold" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-base font-bold text-ink-primary">
                    {text("Hàng đợi tiếp nhận", "Receiving queue")}
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    {text(
                      "Lọc theo cơ sở được phân công, chủ hàng hoặc trạng thái để chọn phiếu cần xử lý.",
                      "Filter by assigned facility, stock owner, or status to select a receiving task.",
                    )}
                  </p>
                </div>
              </div>
              {queue.data && (
                <StatusBadge
                  status="ACTIVE"
                  size="sm"
                  label={`${queue.data.totalCount} ${text("phiếu", "tasks")}`}
                />
              )}
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {lookups.error && (
                <div className="text-xs">
                  <Feedback error={lookups.error} />
                </div>
              )}

              <search className="record-filter grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label>
                  <span>
                    {text("Cơ sở được phân công", "Assigned facility")}
                  </span>
                  <select
                    value={facilityId}
                    onChange={(e) =>
                      filter({
                        facilityId: e.target.value,
                        ownerId: undefined,
                      })
                    }
                  >
                    <option value="">{text("Chọn cơ sở", "Choose a facility")}</option>
                    {facilities.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>

                <form
                  className="flex flex-col justify-end gap-2 sm:flex-row sm:items-end"
                  onSubmit={(e) => {
                    e.preventDefault();
                    filter({
                      search: String(
                        new FormData(e.currentTarget).get("search") ?? "",
                      ).trim(),
                    });
                  }}
                >
                  <label className="min-w-0 flex-1">
                    <span>
                      {text("Tìm phiếu tiếp nhận", "Search receiving tasks")}
                    </span>
                    <div className="relative">
                      <MagnifyingGlass
                        size={15}
                        aria-hidden="true"
                        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
                      />
                      <input
                        type="search"
                        name="search"
                        defaultValue={filters.search}
                        placeholder={text("Nhập mã phiếu...", "Enter code...")}
                        className="ps-9"
                      />
                    </div>
                  </label>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-accent-primary px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-accent-primary/90"
                  >
                    <MagnifyingGlass size={14} weight="bold" aria-hidden="true" />
                    <span>{text("Tìm kiếm", "Search")}</span>
                  </button>
                </form>

                <label>
                  <span>{text("Chủ hàng", "Stock owner")}</span>
                  <select
                    value={filters.ownerId ?? ""}
                    onChange={(e) =>
                      filter({ ownerId: e.target.value || undefined })
                    }
                  >
                    <option value="">{text("Tất cả", "All")}</option>
                    {[...owners].map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>{text("Trạng thái", "Status")}</span>
                  <select
                    value={filters.status ?? ""}
                    onChange={(e) =>
                      filter({
                        status: (e.target.value || undefined) as
                          | ReceivingStatus
                          | undefined,
                      })
                    }
                  >
                    <option value="">{text("Tất cả", "All")}</option>
                    {Object.entries(statuses).map(([value, label]) => (
                      <option key={value} value={value}>
                        {text(...label)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>{text("Sắp xếp theo", "Sort by")}</span>
                  <select
                    value={filters.sortBy}
                    onChange={(e) =>
                      filter({
                        sortBy: e.target.value as ReceivingQuery["sortBy"],
                      })
                    }
                  >
                    <option value="receivedAt">
                      {text("Ngày thu mua", "Procurement date")}
                    </option>
                    <option value="status">
                      {text("Trạng thái", "Status")}
                    </option>
                    <option value="owner">
                      {text("Chủ hàng", "Stock owner")}
                    </option>
                  </select>
                </label>

                <label>
                  <span>{text("Thứ tự", "Direction")}</span>
                  <select
                    value={filters.sortDirection}
                    onChange={(e) =>
                      filter({
                        sortDirection: e.target
                          .value as ReceivingQuery["sortDirection"],
                      })
                    }
                  >
                    <option value="desc">
                      {text("Giảm dần", "Descending")}
                    </option>
                    <option value="asc">
                      {text("Tăng dần", "Ascending")}
                    </option>
                  </select>
                </label>
              </search>

              {!facilityId && !lookups.isPending && (
                <div className="rounded-xl border border-dashed border-ink-tertiary/25 bg-surface-raised/40 px-4 py-8 text-center text-xs text-ink-secondary dark:bg-surface-overlay/20">
                  {text(
                    "Chọn cơ sở để xem phiếu tiếp nhận.",
                    "Choose a facility to see its receiving tasks.",
                  )}
                </div>
              )}

              {queue.error && (
                <div className="text-xs">
                  <Feedback error={queue.error} />
                </div>
              )}

              {(lookups.isPending || (Boolean(facilityId) && queue.isPending)) && (
                <div className="flex justify-center py-6">
                  <GrainLoader
                    size="sm"
                    label={text(
                      "Đang tải hàng đợi tiếp nhận...",
                      "Loading receiving queue...",
                    )}
                  />
                </div>
              )}

              {queue.data && (
                <>
                  {queue.data.items.length ? (
                    <div className="overflow-x-auto rounded-xl border border-ink-tertiary/15">
                      <table className="min-w-full divide-y divide-ink-tertiary/15 text-xs">
                        <thead className="bg-surface-raised/80 text-[11px] font-semibold uppercase tracking-wider text-ink-secondary dark:bg-surface-overlay/60">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left">
                              {text("Phiếu thu mua", "Procurement")}
                            </th>
                            <th scope="col" className="px-4 py-3 text-left">
                              {text("Chủ hàng", "Stock owner")}
                            </th>
                            <th scope="col" className="px-4 py-3 text-right">
                              {text("Dự kiến (kg)", "Expected (kg)")}
                            </th>
                            <th scope="col" className="px-4 py-3 text-right">
                              {text("Thực tế (kg)", "Actual (kg)")}
                            </th>
                            <th scope="col" className="px-4 py-3 text-left">
                              {text("Trạng thái", "Status")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-tertiary/10 bg-surface-base dark:bg-surface-raised">
                          {queue.data.items.map((row) => {
                            const isSelected = selected === row.id;
                            return (
                              <tr
                                key={row.id}
                                className={`transition-colors hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 ${
                                  isSelected ? "bg-accent-primary/5 dark:bg-accent-primary/10" : ""
                                }`}
                              >
                                <th
                                  scope="row"
                                  className="px-4 py-3 text-left font-mono font-bold"
                                >
                                  <button
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => setSelected(row.id)}
                                    className="text-accent-primary hover:underline"
                                  >
                                    {row.code}
                                  </button>
                                </th>
                                <td className="px-4 py-3 text-ink-primary">
                                  {row.ownerCompanyName}
                                </td>
                                <td className="px-4 py-3 text-right font-mono tabular-nums text-ink-secondary">
                                  {row.expectedTotalKg}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-ink-primary">
                                  {row.actualTotalKg ?? "—"}
                                </td>
                                <td className="px-4 py-3">
                                  <StatusBadge
                                    status={mapReceivingBadge(row.status)}
                                    size="sm"
                                    label={text(...statuses[row.status])}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-ink-tertiary/25 bg-surface-raised/40 px-4 py-8 text-center text-xs text-ink-secondary dark:bg-surface-overlay/20">
                      {text(
                        "Không có phiếu trong phạm vi đã chọn.",
                        "No tasks match this scope.",
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1 text-xs text-ink-secondary">
                    <button
                      type="button"
                      disabled={queue.data.page === 1}
                      onClick={() => filter({ page: queue.data!.page - 1 })}
                      className="inline-flex min-h-9 items-center gap-1 rounded-full border border-ink-tertiary/20 bg-surface-base px-3 py-1 font-semibold text-ink-primary transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-overlay"
                    >
                      <CaretLeft size={13} aria-hidden="true" />
                      <span>{text("Trang trước", "Previous")}</span>
                    </button>
                    <span className="px-2 font-mono font-semibold text-ink-primary">
                      {queue.data.page} · {queue.data.totalCount}{" "}
                      {text("phiếu", "tasks")}
                    </span>
                    <button
                      type="button"
                      disabled={!queue.data.hasMore}
                      onClick={() => filter({ page: queue.data!.page + 1 })}
                      className="inline-flex min-h-9 items-center gap-1 rounded-full border border-ink-tertiary/20 bg-surface-base px-3 py-1 font-semibold text-ink-primary transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-overlay"
                    >
                      <span>{text("Trang sau", "Next")}</span>
                      <CaretRight size={13} aria-hidden="true" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Detail Panel */}
          {selected && (
            <section className="record-card">
              <div className="record-card-header">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="record-icon-tile" aria-hidden="true">
                    <Scales size={20} weight="bold" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-base font-bold text-ink-primary">
                      {detail.data?.code ??
                        text("Chi tiết tiếp nhận", "Receiving detail")}
                    </h2>
                    {detail.data && (
                      <p className="mt-0.5 text-xs text-ink-secondary">
                        {detail.data.facilityName} ·{" "}
                        {detail.data.receivingLocationName} ·{" "}
                        {detail.data.ownerCompanyName}
                      </p>
                    )}
                  </div>
                </div>
                {detail.data && (
                  <StatusBadge
                    status={mapReceivingBadge(detail.data.status)}
                    size="sm"
                    label={text(...statuses[detail.data.status])}
                  />
                )}
              </div>

              <div className="space-y-5 p-4 sm:p-5">
                {detail.error && (
                  <div className="text-xs">
                    <Feedback error={detail.error} />
                  </div>
                )}

                {detail.isPending && (
                  <div className="flex justify-center py-6">
                    <GrainLoader
                      size="sm"
                      label={text(
                        "Đang tải chi tiết tiếp nhận...",
                        "Loading receiving details...",
                      )}
                    />
                  </div>
                )}

                {detail.data && (
                  <ReceivingDetail
                    key={`${selected}:${detail.data.receivingVersion}`}
                    task={detail.data}
                    measure={measure}
                    review={review}
                    onSaved={(saved) => {
                      setStatus(
                        `${saved.code} · ${text(...statuses[saved.status])}`,
                      );
                      client.setQueryData(detailKey, saved);
                      void client.invalidateQueries({
                        queryKey: [...scope, "queue"],
                      });
                    }}
                  />
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ReceivingDetail({
  task,
  measure,
  review,
  onSaved,
}: {
  task: ReceivingTask;
  measure: boolean | undefined;
  review: boolean | undefined;
  onSaved: (task: ReceivingTask) => void;
}) {
  const text = useWorkflowText();
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectedUnits, setUnits] = useState<Record<string, ReceivingUnit>>(
    {},
  );
  const [observations, setObservations] = useState("");
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<ReceivingReviewAction | "">("");
  const [evidenceId, setEvidenceId] = useState("");
  const request = useRef<{
    key: string;
    operationId: string;
    capturedAt: string;
  } | null>(null);
  const mutation = useMutation({
    mutationFn: (command: () => Promise<ReceivingTask>) => command(),
    onSuccess: onSaved,
  });
  const latest = task.measurementSets.find(
    (row) => row.id === task.latestMeasurementSetId,
  );
  const shortage = task.items.some(
    (row) => row.actualKg !== null && new Exact(row.actualKg).lt(row.expectedKg),
  );
  const surplus = task.items.some(
    (row) => row.actualKg !== null && new Exact(row.actualKg).gt(row.expectedKg),
  );
  const threshold = task.effectiveThreshold;
  const thresholdLabel = (value: ReceivingTask["effectiveThreshold"]) =>
    value
      ? `${value.percentage}% · ${
          value.source === "COMPANY_OVERRIDE"
            ? text("Ngưỡng theo doanh nghiệp", "Company override")
            : text("Ngưỡng hệ thống", "System default")
        } · ${value.revision}`
      : text("Chưa ghi nhận", "Unavailable");

  function operation(payload: object) {
    const key = JSON.stringify(payload);
    if (request.current?.key !== key)
      request.current = {
        key,
        operationId: crypto.randomUUID(),
        capturedAt: new Date().toISOString(),
      };
    return request.current;
  }

  function submitMeasurements(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const items = task.items.map((row) => ({
      procurementItemId: row.id,
      measuredValue: values[row.id] ?? "",
      measuredUnit: selectedUnits[row.id] ?? ("KG" as const),
    }));
    const payload = {
      items,
      observations: observations.trim(),
      expectedReceivingVersion: task.receivingVersion,
    };
    const { operationId, capturedAt } = operation(payload);
    mutation.mutate(async () => {
      if (
        !items.length ||
        items.some((row) => !actualKg(row.measuredValue, row.measuredUnit))
      ) {
        throw new Error(
          text(
            "Mỗi dòng cần khối lượng dương, với tối đa 6 chữ số thập phân sau khi quy đổi sang kg.",
            "Each line needs a positive quantity with at most six fractional digits after conversion to kg.",
          ),
        );
      }
      return ledgerEndpoints.recordReceivingMeasurement(task.id, {
        ...payload,
        operationId,
        capturedAt,
      });
    });
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      mutation.isPending ||
      !latest ||
      !action ||
      !reason.trim() ||
      !evidenceId
    )
      return;
    const payload = {
      action,
      reason: reason.trim(),
      evidenceId,
      measurementSetId: latest.id,
      expectedReceivingVersion: task.receivingVersion,
    };
    mutation.mutate(() =>
      ledgerEndpoints.reviewReceiving(task.id, {
        ...payload,
        operationId: operation(payload).operationId,
      }),
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-3 dark:bg-surface-overlay/30">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">
            {text("Cơ sở & Điểm cân", "Facility & Location")}
          </span>
          <span className="mt-1 block text-xs font-semibold text-ink-primary">
            {task.facilityName} · {task.receivingLocationName}
          </span>
        </div>

        <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-3 dark:bg-surface-overlay/30">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">
            {text("Chủ hàng", "Stock owner")}
          </span>
          <span className="mt-1 block text-xs font-semibold text-ink-primary">
            {task.ownerCompanyName}
          </span>
        </div>

        <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-3 dark:bg-surface-overlay/30">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">
            {text("Dự kiến / Thực tế (kg)", "Expected / Actual (kg)")}
          </span>
          <span className="mt-1 block font-mono text-xs font-bold text-ink-primary">
            {task.expectedTotalKg} / {task.actualTotalKg ?? "—"} kg
          </span>
        </div>

        <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-3 dark:bg-surface-overlay/30">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">
            {text(
              "Ngưỡng hiệu lực cho lần cân mới",
              "Effective threshold for a new measurement",
            )}
          </span>
          <span className="mt-1 block font-mono text-xs font-semibold text-accent-primary">
            {thresholdLabel(threshold)}
          </span>
        </div>
      </div>

      {/* Procurement Items Table */}
      <div className="overflow-x-auto rounded-xl border border-ink-tertiary/15">
        <table className="min-w-full divide-y divide-ink-tertiary/15 text-xs">
          <thead className="bg-surface-raised/80 text-[11px] font-semibold uppercase tracking-wider text-ink-secondary dark:bg-surface-overlay/60">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">
                {text("Dòng và lô", "Line and lot")}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {text("Dự kiến (kg)", "Expected (kg)")}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {text("Thực tế (kg)", "Actual (kg)")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-tertiary/10 bg-surface-base dark:bg-surface-raised">
            {task.items.map((row) => (
              <tr key={row.id}>
                <th
                  scope="row"
                  className="px-4 py-3 text-left font-mono font-semibold text-ink-primary"
                >
                  {row.lineNo} · {row.lotCode}
                </th>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-ink-secondary">
                  {row.expectedKg}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-ink-primary">
                  {row.actualKg ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Measurement History */}
      {task.measurementSets.length > 0 && (
        <section className="space-y-2.5 rounded-xl border border-ink-tertiary/20 bg-surface-raised/35 p-4 dark:bg-surface-overlay/25">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClockCounterClockwise
                size={16}
                weight="bold"
                className="text-accent-primary"
                aria-hidden="true"
              />
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-ink-secondary">
                {text("Lịch sử cân", "Measurement history")}
              </h3>
            </div>
            <StatusBadge
              status="ACTIVE"
              size="sm"
              label={`${task.measurementSets.length}`}
            />
          </div>

          <div className="space-y-2">
            {task.measurementSets.map((set) => (
              <details
                key={set.id}
                className="group rounded-xl border border-ink-tertiary/20 bg-surface-base p-3.5 text-xs dark:bg-surface-overlay"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-ink-primary">
                      {new Date(set.recordedAt).toLocaleString()}
                    </span>
                    {set.id === latest?.id ? (
                      <StatusBadge
                        status="ACTIVE"
                        size="sm"
                        label={text("Bộ số cân gần nhất", "Latest measurement set")}
                      />
                    ) : (
                      <span className="font-mono text-[11px] text-ink-tertiary">
                        {set.id}
                      </span>
                    )}
                  </div>
                  <CaretDown
                    size={14}
                    aria-hidden="true"
                    className="text-ink-tertiary transition-transform group-open:rotate-180"
                  />
                </summary>

                <div className="mt-3 space-y-2 border-t border-ink-tertiary/15 pt-2.5 text-[11px] text-ink-secondary">
                  <p className="font-mono">
                    {text("Ngưỡng lúc ghi nhận", "Recorded threshold")} ·{" "}
                    {thresholdLabel(set.threshold)}
                  </p>
                  {set.observations && (
                    <p className="text-ink-primary">{set.observations}</p>
                  )}
                  <ul className="list-disc space-y-0.5 ps-5 font-mono">
                    {set.items.map((item) => {
                      const source = task.items.find(
                        (row) => row.id === item.procurementItemId,
                      );
                      return (
                        <li key={item.procurementItemId}>
                          {source?.lotCode ?? item.procurementItemId} ·{" "}
                          {item.measuredValue} {item.measuredUnit} ·{" "}
                          {item.actualKg} kg
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Review History */}
      {task.reviews.length > 0 && (
        <section className="space-y-2.5 rounded-xl border border-ink-tertiary/20 bg-surface-raised/35 p-4 dark:bg-surface-overlay/25">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={16}
                weight="bold"
                className="text-accent-primary"
                aria-hidden="true"
              />
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-ink-secondary">
                {text("Lịch sử đối soát", "Review history")}
              </h3>
            </div>
            <StatusBadge
              status="ACTIVE"
              size="sm"
              label={`${task.reviews.length}`}
            />
          </div>

          <ul className="space-y-2 text-xs">
            {task.reviews.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-tertiary/15 bg-surface-base p-3.5 dark:bg-surface-overlay"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={mapReviewBadge(entry.action)}
                      size="sm"
                      label={text(...decisions[entry.action])}
                    />
                    <span className="font-mono text-[11px] text-ink-secondary">
                      {new Date(entry.recordedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-ink-primary">{entry.reason}</p>
                </div>
                {entry.evidenceId && (
                  <div className={evidenceWrapperClass}>
                    <CorrectionEvidenceDownload id={entry.evidenceId} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(mutation.error || mutation.isPending) && (
        <div className="space-y-2">
          {mutation.error && (
            <div className="text-xs">
              <Feedback error={mutation.error} />
            </div>
          )}
          {mutation.isPending && (
            <div className="flex justify-center py-2">
              <GrainLoader
                size="sm"
                label={text("Đang xử lý...", "Processing...")}
              />
            </div>
          )}
        </div>
      )}

      {/* Operator Measure Form */}
      {measure &&
        ["PENDING_ARRIVAL", "REMEASUREMENT_REQUESTED"].includes(task.status) && (
          <form
            method="post"
            onSubmit={submitMeasurements}
            className="record-form space-y-4 rounded-xl border border-ink-tertiary/20 bg-surface-raised/35 p-4 dark:bg-surface-overlay/25 sm:p-5"
          >
            <fieldset disabled={mutation.isPending} className="space-y-4">
              <legend className="font-display text-sm font-bold text-ink-primary">
                {text("Cân từng dòng thu mua", "Measure each procurement line")}
              </legend>

              <div className="space-y-3">
                {task.items.map((row) => {
                  const kg = actualKg(
                    values[row.id] ?? "",
                    selectedUnits[row.id] ?? "KG",
                  );
                  const lost = kg && new Exact(row.expectedKg).minus(kg);
                  const outside =
                    lost &&
                    (lost.lt(0) ||
                      (threshold &&
                        lost
                          .times(100)
                          .gt(
                            new Exact(row.expectedKg).times(
                              threshold.percentage,
                            ),
                          )));
                  return (
                    <fieldset
                      key={row.id}
                      className="space-y-3 rounded-xl border border-ink-tertiary/20 bg-surface-base p-4 dark:bg-surface-overlay"
                    >
                      <legend className="px-1 font-mono text-xs font-bold text-accent-primary">
                        {row.lineNo} · {row.lotCode} · {row.expectedKg} kg
                      </legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label>
                          <span>
                            {text("Khối lượng cân thực tế", "Measured quantity")}{" "}
                            *
                          </span>
                          <input
                            name={`mass-${row.lineNo}`}
                            required
                            inputMode="decimal"
                            pattern="[0-9]{1,12}([.][0-9]{1,12})?"
                            value={values[row.id] ?? ""}
                            onChange={(e) =>
                              setValues({ ...values, [row.id]: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          <span>{text("Đơn vị", "Unit")}</span>
                          <select
                            name={`unit-${row.lineNo}`}
                            value={selectedUnits[row.id] ?? "KG"}
                            onChange={(e) =>
                              setUnits({
                                ...selectedUnits,
                                [row.id]: e.target.value as ReceivingUnit,
                              })
                            }
                          >
                            {units.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      {kg && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-semibold text-ink-primary">
                            {kg.toFixed()} kg
                          </span>
                          {outside && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-functional-stale-border bg-functional-stale-bg px-2.5 py-0.5 text-[11px] font-semibold text-accent-warning">
                              <WarningCircle size={13} aria-hidden="true" />
                              <span>
                                {text(
                                  "Dự kiến cần đối soát",
                                  "Expected to require review",
                                )}
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </fieldset>
                  );
                })}
              </div>

              <label>
                <span>
                  {text("Ghi chú lần cân", "Measurement observations")}
                </span>
                <textarea
                  name="observations"
                  rows={2}
                  maxLength={4000}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                />
              </label>

              <label className="!flex-row items-center gap-2 text-xs font-semibold text-ink-primary">
                <input name="confirmed" type="checkbox" required />
                {text(
                  "Tôi xác nhận số cân của từng dòng.",
                  "I confirm the measurement for each line.",
                )}
              </label>
            </fieldset>

            <div className="record-form-footer">
              <button
                type="submit"
                disabled={mutation.isPending || !threshold || !task.items.length}
                className="record-button record-primary rounded-full px-5"
              >
                <CheckCircle size={15} weight="bold" aria-hidden="true" />
                <span>{text("Ghi nhận số cân", "Save measurements")}</span>
              </button>
            </div>
          </form>
        )}

      {/* Manager Review Form */}
      {review &&
        latest &&
        ["AWAITING_MANAGER_REVIEW", "BLOCKED_UNRESOLVED"].includes(
          task.status,
        ) && (
          <form
            method="post"
            onSubmit={submitReview}
            className="record-form space-y-4 rounded-xl border border-ink-tertiary/20 bg-surface-raised/35 p-4 dark:bg-surface-overlay/25 sm:p-5"
          >
            <fieldset disabled={mutation.isPending} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <legend className="font-display text-sm font-bold text-ink-primary">
                  {text(
                    "Đối soát bộ số cân gần nhất",
                    "Review latest measurement set",
                  )}
                </legend>
                <span className="rounded-full border border-ink-tertiary/20 bg-surface-base px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary dark:bg-surface-overlay">
                  {thresholdLabel(latest.threshold)}
                </span>
              </div>

              <label>
                <span>{text("Quyết định", "Decision")} *</span>
                <select
                  name="decision"
                  required
                  value={action}
                  onChange={(e) =>
                    setAction(e.target.value as ReceivingReviewAction)
                  }
                >
                  <option value="" disabled>
                    {text("Chọn quyết định", "Choose a decision")}
                  </option>
                  {Object.entries(decisions).map(([value, label]) => (
                    <option
                      key={value}
                      value={value}
                      disabled={
                        value === "APPROVE_SHORTAGE" && (surplus || !shortage)
                      }
                    >
                      {text(...label)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{text("Lý do", "Reason")} *</span>
                <textarea
                  name="reason"
                  rows={3}
                  required
                  maxLength={4000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>

              <div className={evidenceWrapperClass}>
                <CorrectionEvidence
                  original={{
                    ownerId: task.ownerCompanyId,
                    facilityId: task.facilityId,
                  }}
                  value={evidenceId}
                  onChange={setEvidenceId}
                />
              </div>
            </fieldset>

            <div className="record-form-footer">
              <button
                type="submit"
                disabled={mutation.isPending || !evidenceId}
                className="record-button record-primary rounded-full px-5"
              >
                <ShieldCheck size={15} weight="bold" aria-hidden="true" />
                <span>{text("Lưu quyết định", "Record decision")}</span>
              </button>
            </div>
          </form>
        )}
    </div>
  );
}
