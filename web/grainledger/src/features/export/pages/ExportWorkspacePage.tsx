import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { exportEndpoints } from "@/api/exports";
import { collectPages } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { Feedback, Panel, Workflow, useWorkflowText } from "@/shared/ui/Workflow";
import { ExportOrderForm } from "../components/ExportOrderForm";
import { useExportCommand } from "../hooks/useExportCommand";
import { blendPlanRequestPath, containerPath, exportPaths } from "../paths";

export function ExportWorkspacePage({ view = "orders" }: { view?: "orders" | "containers" | "dossiers" }) {
  const t = useWorkflowText();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const orders = useQuery({ queryKey: ["export-workspace-orders"], queryFn: () => collectPages(exportEndpoints.getOrders) });
  const requested = params.get("order");
  const orderId = requested ?? orders.data?.[0]?.id ?? "";
  const canWrite = useAuthStore(s => s.user?.permissions.includes("export-orders.write") ?? false);
  const title = view === "orders" ? t("Đơn hàng xuất khẩu", "Export orders") : view === "containers" ? t("Container xuất khẩu", "Export containers") : t("Hồ sơ theo container", "Container records");
  return <Workflow title={title}>
    {view === "orders" && canWrite && <button onClick={() => setCreating(!creating)}>{creating ? t("Đóng biểu mẫu", "Close form") : t("Thêm đơn hàng", "Add order")}</button>}
    {view === "orders" && creating && canWrite && <ExportOrderForm saved={async () => { await orders.refetch(); setCreating(false); }}/>}
    <Feedback error={orders.error} pending={orders.isPending}/>
    {orders.data && <Panel title={t("Chọn đơn hàng", "Select order")}>
      {orders.data.length ? <label>{t("Đơn hàng", "Order")}<select value={orderId} onChange={e => setParams({ order: e.target.value })}>
        {orders.data.map(o => <option key={o.id} value={o.id}>{o.code} · {o.requiredMassKg} kg · {o.shippingFrom} – {o.shippingTo}</option>)}
      </select></label> : <p>{t("Chưa có đơn hàng.", "No orders available.")}</p>}
    </Panel>}
    {orderId && <OrderContainers key={orderId} orderId={orderId} view={view} canWrite={canWrite}/>}
  </Workflow>;
}

function OrderContainers({ orderId, view, canWrite }: { orderId: string; view: string; canWrite: boolean }) {
  const t = useWorkflowText();
  const cache = useQueryClient();
  const detail = useQuery({ queryKey: ["export-order-detail", orderId], queryFn: () => exportEndpoints.getOrderResource(orderId) });
  const list = useQuery({ queryKey: ["export-container-list", orderId], queryFn: () => collectPages(q => exportEndpoints.getContainers(orderId, q)) });
  const [mass, setMass] = useState("");
  const add = useExportCommand((operationId, input: { mass: string; etag: string }) =>
    exportEndpoints.addContainers(orderId, { operationId, containers: [{ targetMass: input.mass, unit: "KG" }] }, input.etag),
    async () => { setMass(""); await Promise.all([list.refetch(), detail.refetch(), cache.invalidateQueries({ queryKey: ["export-workspace-orders"] })]); });
  const order = detail.data?.data;
  return <Panel title={order?.code ?? t("Chi tiết đơn hàng", "Order details")}>
    <Feedback error={detail.error ?? list.error} pending={detail.isPending || list.isPending}/>
    {order && <><p>{order.shippingFrom} – {order.shippingTo} · {t("Khối lượng hợp đồng", "Contract mass")} {order.requiredMassKg} kg · {t("Còn phân bổ", "Unallocated")} {order.remainingMassKg} kg</p>
      {view === "orders" && <ul>{order.limits?.map(l => <li key={l.attributeId}>{l.attributeName ?? l.attributeId} · {l.minValue ?? "—"} … {l.maxValue ?? "—"} {l.unit}</li>)}</ul>}</>}
    {list.data && (list.data.length ? <div className="overflow-x-auto"><table><thead><tr><th>Container</th><th>kg</th><th>{t("Trạng thái", "Status")}</th><th>{t("Tác vụ", "Actions")}</th></tr></thead><tbody>{list.data.map(c =>
      <tr key={c.id}><td>{c.internalCode}</td><td>{c.targetMassKg}</td><td>{c.status}</td><td><div className="flex flex-wrap gap-3">
        {view !== "dossiers" && <><Link to={blendPlanRequestPath(orderId, c.id)}>{t("Phối trộn", "Blend plans")}</Link>
        <Link to={containerPath(exportPaths.loading, c.id)}>{t("Xếp hàng", "Loading")}</Link>
        <Link to={containerPath(exportPaths.closure, c.id)}>{t("Niêm phong", "Closure")}</Link></>}
        <Link to={containerPath(exportPaths.dossier, c.id)}>{t("Hồ sơ", "Records")}</Link>
      </div></td></tr>)}</tbody></table></div> : <p>{t("Chưa có container.", "No containers yet.")}</p>)}
    {view !== "dossiers" && canWrite && order?.canEdit && detail.data?.etag && <form className="space-y-2" onSubmit={e => { e.preventDefault(); if (detail.data?.etag) add.submit({ mass, etag: detail.data.etag }); }}>
      <label>{t("Khối lượng mục tiêu của container mới (kg)", "New container target (kg)")}<input required inputMode="decimal" value={mass} onChange={e => setMass(e.target.value)}/></label>
      <button type="submit" disabled={add.isPending}>{t("Thêm container", "Add container")}</button><Feedback error={add.error}/>
      {add.isError && <button type="button" onClick={() => void detail.refetch()}>{t("Tải lại phiên bản", "Reload version")}</button>}
    </form>}
  </Panel>;
}
