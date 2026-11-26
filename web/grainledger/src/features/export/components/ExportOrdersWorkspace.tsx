import { useAuthStore } from "@/app/store/authStore";
import { useExportAction } from "../model/exportActions";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExportActionLink as Link } from "./ExportActionLink";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  Export,
  FileText,
  Plus,
  Scales,
  ShieldCheck,
  Truck,
  SortAscendingIcon,
} from "@phosphor-icons/react";
import { exportEndpoints, type ExportOrderSummary } from "@/api/exports";
import { Feedback } from "@/shared/ui/Workflow";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { Decimal } from "@/shared/utils/decimalMass";
import { useExportCommand } from "../hooks/useExportCommand";
import { useExportWorkspaceData } from "../hooks/useExportWorkspaceData";
import { ContainerCommandFeedback } from "./ContainerCommandFeedback";
import { ExportOrderHistory, ExportOrderMaintenance, type OrderMaintenance } from "./ExportOrderMaintenance";
import {
  allocationPercent,
  containerStatus,
  massLabel,
  shippingDate,
  sumMass,
} from "../model/exportPresentation";
import { blendPlanRequestPath, containerPath, exportPaths } from "../paths";
import {
  ExportEmpty,
  ExportIconField,
  ExportSearch,
  ExportSection,
  ExportTable,
} from "./ExportWorkspaceUI";

type WorkspaceData = ReturnType<typeof useExportWorkspaceData>;

export function ExportOrdersWorkspace({
  data,
}: {
  data: WorkspaceData;
  canWrite: boolean;
}) {
  const text = useWorkflowText();
  const locale = text("vi", "en");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("shippingFrom");
  const id = useId();
  const open = useExportAction();
  const orders = data.orders.data ?? [];
  const rows = orders
    .filter((o) => o.code.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) =>
      sort === "code"
        ? a.code.localeCompare(b.code)
        : a.shippingFrom.localeCompare(b.shippingFrom),
    );
  return (
    <div className="space-y-5">
      <div className="min-w-0 space-y-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4 [&>div]:min-w-0 [&>div]:rounded-2xl [&>div]:border [&>div]:border-ink-tertiary/20 [&>div]:bg-surface-base [&>div]:px-5 [&>div]:py-4">
          <div className="flex items-center gap-3">
            <Export
              size={24}
              className="text-accent-primary"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs text-ink-secondary">
                {text("Đơn hàng đang quản lý", "Managed orders")}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold">
                {orders.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Scales
              size={24}
              className="text-accent-primary"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs text-ink-secondary">
                {text("Tổng khối lượng hợp đồng", "Total contract mass")}
              </p>
              <p className="mt-1 break-words font-mono text-xl font-semibold">
                <span>
                  {massLabel(
                    sumMass(orders.map((o) => o.requiredMassKg)),
                    locale,
                  )}
                </span>{" "}
                <span className="text-xs font-normal">kg</span>
              </p>
            </div>
          </div>
        </div>
        <ExportSection
          title={text("Danh sách đơn hàng", "Export order list")}
          description={text(
            "Chọn một hợp đồng để xem quy cách và quản lý phân bổ container.",
            "Select a contract to inspect its specifications and container allocations.",
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <ExportSearch
              label={text("Tìm mã đơn hàng", "Search order code")}
              value={search}
              onChange={setSearch}
            />
            <div className="w-full sm:w-52">
              <label htmlFor={id} className="sr-only">
                {text("Sắp xếp đơn hàng", "Sort orders")}
              </label>
              <ExportIconField icon={SortAscendingIcon}>
                <select
                className="filter-control border-ink-tertiary/20 bg-surface-raised ps-10 font-semibold dark:bg-surface-base"
                id={id}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="shippingFrom">
                  {text("Ngày bắt đầu giao hàng", "Shipping start date")}
                </option>
                <option value="code">
                  {text("Mã đơn hàng", "Order code")}
                </option>
              </select>
              </ExportIconField>
              
            </div>
            <p className="ml-auto text-xs text-ink-secondary">
              {rows.length} / {orders.length} {text("đơn hàng", "orders")}
            </p>
          </div>
          {rows.length ? (
            <ExportTable
              caption={text("Danh sách hợp đồng xuất khẩu", "Export contracts")}
              columns={[
                text("Đơn hàng", "Order"),
                text("Lịch giao hàng", "Shipping window"),
                text("Khối lượng hợp đồng", "Contract mass"),
                text("Chi tiết", "Details"),
              ]}
            >
              {rows.map((o) => (
                <tr
                  key={o.id}
                  className="cursor-pointer hover:bg-surface-raised/40 transition-colors"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button, a")) return;
                    if (open) open({ kind: "order", orderId: o.id });
                    else data.selectOrder(o.id);
                  }}
                >
                  <th scope="row">
                    <span className="font-mono font-bold">{o.code}</span>
                  </th>
                  <td>
                    <div className="flex items-center gap-2 whitespace-nowrap text-ink-secondary">
                      <Calendar size={14} aria-hidden="true" />
                      {shippingDate(o.shippingFrom, locale)} –{" "}
                      {shippingDate(o.shippingTo, locale)}
                    </div>
                  </td>
                  <td className="whitespace-nowrap font-mono">
                    {massLabel(o.requiredMassKg, locale)} kg
                  </td>
                  <td>
                    <button
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => {
                        if (open) open({ kind: "order", orderId: o.id });
                        else data.selectOrder(o.id);
                      }}
                    >
                      {text("Xem đơn", "View order")}
                      <span className="sr-only"> · {o.code}</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </ExportTable>
          ) : (
            <ExportEmpty
              title={text(
                "Không tìm thấy đơn hàng phù hợp.",
                "No matching orders.",
              )}
              description={text(
                "Thử một mã đơn hàng khác.",
                "Try a different order code.",
              )}
            />
          )}
        </ExportSection>
      </div>
    </div>
  );
}

export function ExportOrderDetails({ orderId }: { orderId: string }) {
  const data = useExportWorkspaceData("orders", orderId);
  const canWrite = useAuthStore(
    (state) => state.user?.permissions.includes("export-orders.write") ?? false,
  );
  return <OrderAllocation data={data} canWrite={canWrite} />;
}

function OrderAllocation({
  data,
  canWrite,
}: {
  data: WorkspaceData;
  canWrite: boolean;
}) {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const locale = text("vi", "en");
  const cache = useQueryClient();
  const [mass, setMass] = useState("");
  const [maintenance, setMaintenance] = useState<OrderMaintenance | null>(null);
  const [maintenanceSaved, setMaintenanceSaved] = useState(false);
  const id = useId();
  const order = data.detail.data?.data;
  const etag = data.detail.data?.etag;
  const add = useExportCommand(
    (operationId, input: { mass: string; etag: string }) =>
      exportEndpoints.addContainers(
        data.orderId,
        { operationId, containers: [{ targetMass: input.mass, unit: "KG" }] },
        input.etag,
      ),
    async () => {
      setMass("");
      await Promise.all([
        data.containers.refetch(),
        data.detail.refetch(),
        cache.invalidateQueries({ queryKey: ["export-workspace-orders"] }),
      ]);
    },
    { persistKey: `export-order:${data.orderId}:add-container` },
  );
  const percent = order
    ? allocationPercent(order.allocatedMassKg, order.requiredMassKg)
    : 0;
  const orderContainers = data.containers.data ?? [];
  const closedContainers = orderContainers.filter(
    (c) => c.status === "CLOSED",
  );
  const completedMassKg = order?.completedMassKg ?? "0";
  const closedPercent = order
    ? allocationPercent(completedMassKg, order.requiredMassKg)
    : 0;
  const orderCompleted = order?.fulfillmentStatus === "COMPLETE";
  const completionStatus: {
    type: "COMPLIANT" | "PENDING" | "HOLD";
    label: [string, string];
  } = orderCompleted
    ? { type: "COMPLIANT", label: ["Đã hoàn thành", "Completed"] }
    : new Decimal(completedMassKg).gt(0)
      ? { type: "PENDING", label: ["Đang đóng niêm", "Closing in progress"] }
      : { type: "HOLD", label: ["Chưa hoàn thành", "Not completed"] };
  return (
    <ExportSection
      title={order?.code ?? text("Chi tiết đơn hàng", "Order details")}
      description={text(
        "Quy cách hợp đồng và kế hoạch phân bổ theo container.",
        "Contract specifications and planned container allocations.",
      )}
      actions={
        order && (
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
            to={`${exportPaths.containers}?order=${encodeURIComponent(order.id)}`}
          >
            {text("Quản lý container", "Manage containers")}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )
      }
    >
      <Feedback
        error={data.detail.error ?? data.containers.error}
        pending={data.detail.isPending || data.containers.isPending}
      />
      {order && (
        <div className="space-y-6">
          <SelectedOrderSummary order={order} />
          {maintenanceSaved && <p className="text-sm text-accent-primary" role="status">{t("workflows.export.saved")}</p>}
          {canWrite && order.canEdit && etag && <div className="gl-workflow flex flex-wrap gap-2">
            <button type="button" disabled={data.detail.isFetching || add.isPending} onClick={() => setMaintenance({ type: "order", order, etag })}>{t("workflows.export.order")}</button>
            <button type="button" disabled={data.detail.isFetching || add.isPending} onClick={() => setMaintenance({ type: "spec", order, etag })}>{t("workflows.export.spec")}</button>
          </div>}
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-4">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold">
                    {text(
                      "Phân bổ mục tiêu container",
                      "Container target allocation",
                    )}
                  </span>
                  <span className="font-mono text-accent-primary">
                    {percent}%
                  </span>
                </div>
                <progress
                  className="mt-3 h-2 w-full accent-accent-primary"
                  max={100}
                  value={percent}
                  aria-label={text(
                    "Tiến độ phân bổ container",
                    "Container allocation progress",
                  )}
                />
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-ink-secondary">
                  <span>
                    {massLabel(order.allocatedMassKg, locale)} /{" "}
                    {massLabel(order.requiredMassKg, locale)} kg
                  </span>
                  <span>
                    {text("Còn lại chưa chia", "Unallocated")}:{" "}
                    {massLabel(order.remainingMassKg, locale)} kg
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold">
                    {text(
                      "Hoàn thành đóng niêm (CLOSED)",
                      "Closed container completion",
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={completionStatus.type}
                      label={text(...completionStatus.label)}
                      size="sm"
                    />
                    <span className="font-mono text-accent-primary">
                      {closedPercent}%
                    </span>
                  </div>
                </div>
                <progress
                  className="mt-3 h-2 w-full accent-accent-primary"
                  max={100}
                  value={closedPercent}
                  aria-label={text(
                    "Tiến độ hoàn thành đơn theo container đã đóng niêm",
                    "Order completion progress by closed containers",
                  )}
                />
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-ink-secondary">
                  <span>
                    {massLabel(completedMassKg, locale)} /{" "}
                    {massLabel(order.requiredMassKg, locale)} kg{" "}
                    {text("đã CLOSED (manifest)", "CLOSED (manifest)")}
                  </span>
                  <span>
                    {closedContainers.length} / {orderContainers.length}{" "}
                    {text("container đã đóng niêm", "closed containers")}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink-secondary">
                <ShieldCheck
                  size={16}
                  className="text-accent-primary"
                  aria-hidden="true"
                />
                {text("Chỉ tiêu chất lượng", "Quality specifications")} · v
                {order.specificationVersion}
              </h3>
              {order.limits.length ? (
                <ul className="space-y-2">
                  {order.limits.map((l) => (
                    <li
                      key={l.attributeId}
                      className="flex flex-wrap justify-between gap-2 rounded-lg border border-ink-tertiary/15 px-3 py-2 text-xs"
                    >
                      <span>
                        {l.attributeName ?? l.attributeCode ?? l.attributeId}
                      </span>
                      <span className="font-mono">
                        {l.minValue ?? "—"} … {l.maxValue ?? "—"} {l.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-ink-secondary">
                  {text(
                    "Chưa có chỉ tiêu được ghi nhận.",
                    "No recorded specifications.",
                  )}
                </p>
              )}
            </div>
            {canWrite &&
              order.canEdit &&
              new Decimal(order.remainingMassKg).gt(0) &&
              data.detail.data?.etag && (
                <form
                  aria-label={text(
                    "Thêm container cho đơn hàng",
                    "Add an order container",
                  )}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem(
                      "targetMass",
                    ) as HTMLInputElement;
                    if (
                      !e.currentTarget.reportValidity() ||
                      !data.detail.data?.etag
                    )
                      return;
                    const valid =
                      new Decimal(mass).gt(0) &&
                      new Decimal(mass).lte(order.remainingMassKg);
                    input.setCustomValidity(
                      valid
                        ? ""
                        : text(
                            "Nhập khối lượng dương không vượt phần còn phân bổ.",
                            "Enter a positive mass within the unallocated amount.",
                          ),
                    );
                    if (e.currentTarget.reportValidity())
                      add.submit({ mass, etag: data.detail.data.etag });
                  }}
                  className="space-y-3 border-t border-ink-tertiary/15 pt-4"
                >
                  <fieldset
                    disabled={add.isPending || add.uncertain}
                    className="space-y-3"
                  >
                    <legend className="mb-2 text-xs font-semibold">
                      {text("Thêm container", "Add container")}
                    </legend>
                    <label htmlFor={id} className="mb-1 block">
                      {text(
                        "Khối lượng mục tiêu của container mới (kg)",
                        "New container target (kg)",
                      )}
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        id={id}
                        name="targetMass"
                        required
                        inputMode="decimal"
                        pattern="[0-9]+([.][0-9]{1,6})?"
                        value={mass}
                        onChange={(e) => {
                          setMass(e.target.value);
                          e.target.setCustomValidity("");
                        }}
                        className="w-full pl-9 pr-3 py-3 text-sm rounded-lg bg-surface-raised dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg font-mono"
                      />
                      <button
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-accent-primary bg-accent-primary px-4 text-ink-inverse hover:bg-accent-primary-dim shrink-0"
                        type="submit"
                      >
                        <Plus size={15} aria-hidden="true" />
                        {text("Thêm container", "Add container")}
                      </button>
                    </div>
                    {/* Quick suggestion buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="text-[11px] text-ink-secondary">
                        {text("Gợi ý nhanh:", "Quick suggestions:")}
                      </span>
                      {new Decimal(order.remainingMassKg).gte(25000) && (
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg bg-surface-base border border-ink-tertiary/20 text-xs font-mono font-medium hover:bg-surface-raised text-ink-primary transition-colors"
                          onClick={() => setMass("25000")}
                        >
                          25,000 kg (20ft)
                        </button>
                      )}
                      {new Decimal(order.remainingMassKg).gte(28000) && (
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg bg-surface-base border border-ink-tertiary/20 text-xs font-mono font-medium hover:bg-surface-raised text-ink-primary transition-colors"
                          onClick={() => setMass("28000")}
                        >
                          28,000 kg (40ft)
                        </button>
                      )}
                      {new Decimal(order.remainingMassKg).gt(0) && (
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg bg-surface-base border border-ink-tertiary/20 text-xs font-mono font-medium hover:bg-surface-raised text-accent-primary transition-colors"
                          onClick={() => setMass(order.remainingMassKg)}
                        >
                          {text("Toàn bộ còn lại", "All remaining")} (
                          {massLabel(order.remainingMassKg, locale)} kg)
                        </button>
                      )}
                    </div>
                  </fieldset>
                  <ContainerCommandFeedback
                    error={add.error}
                    uncertain={add.uncertain}
                    retry={add.retry}
                    success={add.isSuccess}
                    isPending={add.isPending}
                    restoredPending={add.restoredPending}
                    discardPending={add.discardPending}
                  />
                  {add.isError && (
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
                      onClick={() => void data.detail.refetch()}
                    >
                      {text("Tải lại phiên bản", "Reload version")}
                    </button>
                  )}
                </form>
              )}
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-ink-secondary">
              {text("Container đã phân bổ", "Allocated containers")}
            </h3>
            {data.containers.data?.length ? (
              <ul className="space-y-2">
                {data.containers.data.map((c) => {
                  const badge = containerStatus(c.status);
                  return (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-tertiary/15 p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs font-bold">
                            {c.internalCode}
                          </p>
                          <StatusBadge
                            status={badge.type}
                            label={text(...badge.label)}
                            size="sm"
                          />
                        </div>
                        <p className="mt-1 font-mono text-xs text-ink-secondary">
                          {massLabel(c.targetMassKg, locale)} kg
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {canWrite && order.canEdit && c.status === "PLANNED" && <button type="button" className="min-h-11 rounded-full border border-ink-tertiary/25 px-3 text-xs font-semibold text-accent-primary" onClick={() => setMaintenance({ type: "target", container: c })}>{t("workflows.export.target")}</button>}
                        {c.status === "CLOSED" ? (
                          <Link
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
                            to={containerPath(exportPaths.dossier, c.id)}
                          >
                            <FileText size={14} aria-hidden="true" />
                            {text("Hồ sơ", "Dossier")}
                          </Link>
                        ) : (
                          <Link
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
                            to={containerPath(exportPaths.loading, c.id)}
                          >
                            <Truck size={14} aria-hidden="true" />
                            {text("Xếp hàng", "Loading")}
                          </Link>
                        )}
                        <Link
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
                          to={blendPlanRequestPath(order.id, c.id)}
                        >
                          {text("Phối trộn", "Blend plans")}
                          <span className="sr-only"> · {c.internalCode}</span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              !data.containers.isPending &&
              !data.containers.error && (
                <ExportEmpty
                  title={text("Chưa có container.", "No containers yet.")}
                  description={text(
                    "Phân bổ khối lượng để bắt đầu lập phương án.",
                    "Allocate container targets to start planning.",
                  )}
                />
              )
            )}
          </div>
          <ExportOrderHistory key={order.id} orderId={order.id} />
          {maintenance && <ExportOrderMaintenance action={maintenance} onClose={() => { setMaintenance(null); void data.refresh(); void cache.invalidateQueries({ queryKey: ["export-order-history", order.id] }); }} onSaved={async () => {
            setMaintenance(null);
            setMaintenanceSaved(true);
            await Promise.all([data.refresh(), cache.invalidateQueries({ queryKey: ["export-order-history", order.id] }), cache.invalidateQueries({ queryKey: ["export-target-edit"] })]);
          }} />}
        </div>
      )}
    </ExportSection>
  );
}

export function SelectedOrderSummary({ order }: { order: ExportOrderSummary }) {
  const text = useWorkflowText();
  return (
    <p className="text-xs text-ink-secondary">
      {order.code} · {text("Lịch giao hàng", "Shipping window")}:{" "}
      {shippingDate(order.shippingFrom, text("vi", "en"))} –{" "}
      {shippingDate(order.shippingTo, text("vi", "en"))}
    </p>
  );
}
