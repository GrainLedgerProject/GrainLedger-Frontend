import { useId, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/client";
import { exportEndpoints, type ExportContainerDto, type ExportLimitInput, type ExportOrderDetail, type UpdateExportOrderRequest } from "@/api/exports";
import { Modal } from "@/shared/ui/Modal";
import { Feedback } from "@/shared/ui/Workflow";
import { useContainerCommand } from "../hooks/useContainerCommand";
import { useExportOrderCatalogs } from "../hooks/useExportOrderCatalogs";

export type OrderMaintenance = { type: "order" | "spec"; order: ExportOrderDetail; etag: string } | { type: "target"; container: ExportContainerDto };
type Change = { type: "order"; id: string; etag: string; body: Omit<UpdateExportOrderRequest, "operationId"> }
  | { type: "spec"; id: string; etag: string; limits: ExportLimitInput[] }
  | { type: "target"; id: string; etag: string; targetMass: string; unit: string };
const decimal = String.raw`[0-9]{1,17}(\.[0-9]{1,9})?`;

export function ExportOrderMaintenance({ action, onClose, onSaved }: { action: OrderMaintenance; onClose: () => void; onSaved: () => Promise<void> }) {
  const { t } = useTranslation();
  const title = t(`workflows.export.${action.type}`);
  const operation = useContainerCommand<Change>((operationId, input) => {
    switch (input.type) {
      case "order": return exportEndpoints.updateOrder(input.id, { operationId, ...input.body }, input.etag);
      case "spec": return exportEndpoints.addSpecifications(input.id, { operationId, limits: input.limits }, input.etag);
      case "target": return exportEndpoints.updateContainer(input.id, { operationId, targetMass: input.targetMass, unit: input.unit }, input.etag);
    }
  }, onSaved);
  const stale = operation.error instanceof ApiError && operation.error.status === 412;
  const close = () => { if (!operation.isPending) onClose(); };
  return <Modal isOpen ariaLabel={title} onClose={close} closeOnBackdrop={false}>
    <div className="gl-workflow w-[calc(100vw-2rem)] max-w-2xl space-y-4 rounded-2xl bg-surface-base p-4 text-ink-primary dark:bg-surface-raised sm:p-6">
      <header className="border-b border-ink-tertiary/20 pb-3"><h2 className="font-display text-xl font-bold">{title}</h2><p className="font-mono text-sm text-ink-secondary">{"order" in action ? action.order.code : action.container.internalCode}</p></header>
      <OrderEditorFields action={action} blocked={operation.isPending || operation.uncertain || stale} submit={operation.submit} />
      <Feedback error={operation.error} pending={operation.isPending} />
      {operation.uncertain && <button type="button" onClick={operation.retry}>{t("field.seasons.retry")}</button>}
      <button type="button" onClick={close} disabled={operation.isPending}>{t(stale || operation.uncertain ? "workflows.closeReload" : "field.seasons.cancel")}</button>
    </div>
  </Modal>;
}

function OrderEditorFields({ action, blocked, submit }: { action: OrderMaintenance; blocked: boolean; submit: (input: Change) => void }) {
  const { t } = useTranslation();
  const uid = useId();
  const catalogs = useExportOrderCatalogs();
  const targetId = action.type === "target" ? action.container.id : "";
  const target = useQuery({ queryKey: ["export-target-edit", targetId], queryFn: () => exportEndpoints.getContainerResource(targetId), enabled: Boolean(targetId), refetchOnWindowFocus: false, refetchOnReconnect: false, staleTime: 0 });
  const [limits, setLimits] = useState(() => action.type === "spec" ? action.order.limits.map(item => ({ ...item, key: crypto.randomUUID() })) : []);
  const [starts, setStarts] = useState(action.type === "order" ? action.order.shippingFrom : "");
  const [validation, setValidation] = useState("");
  const options = catalogs.data;
  const container = target.data?.data;
  const etag = target.data?.etag;
  const available = action.type !== "target" || Boolean(container?.status === "PLANNED" && etag && !target.isFetching);
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked || !available || !options) return;
    const fields = new FormData(event.currentTarget);
    const value = (name: string) => String(fields.get(name) ?? "").trim();
    setValidation("");
    if (action.type === "target" && etag) submit({ type: "target", id: action.container.id, etag, targetMass: value("mass"), unit: value("unit") });
    if (action.type === "order") submit({ type: "order", id: action.order.id, etag: action.etag, body: { marketId: value("market"), commodityId: value("commodity"), requiredMass: value("mass"), unit: value("unit"), shippingFrom: value("from"), shippingTo: value("to") } });
    if (action.type === "spec") {
      if (!limits.length || new Set(limits.map(line => line.attributeId)).size !== limits.length || limits.some(line => !line.attributeId || (!line.minValue?.trim() && !line.maxValue?.trim()))) { setValidation(t("workflows.export.invalidLimits")); return; }
      submit({ type: "spec", id: action.order.id, etag: action.etag, limits: limits.map(({ attributeId, minValue, maxValue }) => ({ attributeId, minValue: minValue?.trim() || null, maxValue: maxValue?.trim() || null })) });
    }
  }
  return <>
    <Feedback error={catalogs.error ?? target.error} pending={catalogs.isPending || target.isFetching} />
    {action.type === "target" && container && !available && !target.isFetching && <p role="alert">{t("workflows.export.targetUnavailable")}</p>}
    {options && available && <form method="post" onSubmit={save} className="space-y-3">
      <fieldset disabled={blocked} className="grid gap-3 sm:grid-cols-2"><legend className="sr-only">{t(`workflows.export.${action.type}`)}</legend>
        {action.type === "order" && <>
          <label htmlFor={`${uid}-market`}>{t("workflows.export.market")}<select id={`${uid}-market`} name="market" required defaultValue={options.markets.some(row => row.id === action.order.marketId) ? action.order.marketId : ""}><option value="">{t("workflows.choose")}</option>{options.markets.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label htmlFor={`${uid}-commodity`}>{t("workflows.export.commodity")}<select id={`${uid}-commodity`} name="commodity" required defaultValue={options.commodities.some(row => row.id === action.order.commodityId) ? action.order.commodityId : ""}><option value="">{t("workflows.choose")}</option>{options.commodities.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label htmlFor={`${uid}-from`}>{t("workflows.export.from")}<input id={`${uid}-from`} name="from" type="date" value={starts} onChange={event => setStarts(event.target.value)} required /></label>
          <label htmlFor={`${uid}-to`}>{t("workflows.export.to")}<input id={`${uid}-to`} name="to" type="date" min={starts} defaultValue={action.order.shippingTo} required /></label>
        </>}
        {action.type !== "spec" && <>
          <label htmlFor={`${uid}-mass`}>{t("workflows.export.mass")}<input id={`${uid}-mass`} name="mass" required inputMode="decimal" pattern={decimal} defaultValue={action.type === "order" ? action.order.originalMass ?? action.order.requiredMassKg : container?.originalMass} /></label>
          <label htmlFor={`${uid}-unit`}>{t("workflows.export.unit")}<select id={`${uid}-unit`} name="unit" required defaultValue={action.type === "order" ? action.order.originalUnit ?? "KG" : container?.originalUnit}><option value="">{t("workflows.choose")}</option>{options.units.map(row => <option key={row.id} value={row.code}>{row.name} ({row.code})</option>)}</select></label>
        </>}
        {action.type === "spec" && <div className="space-y-3 sm:col-span-2">
          {limits.map((line, index) => <fieldset key={line.key} className="grid gap-2 rounded-xl border border-ink-tertiary/20 p-3 sm:grid-cols-2"><legend>{t("workflows.export.limit", { number: index + 1 })}</legend>
            <label htmlFor={`${line.key}-attribute`} className="sm:col-span-2">{t("workflows.export.attribute")}<select id={`${line.key}-attribute`} value={line.attributeId} onChange={event => setLimits(limits.map(item => item.key === line.key ? { ...item, attributeId: event.target.value } : item))} required><option value="">{t("workflows.choose")}</option>{options.attributes.map(row => <option key={row.id} value={row.id}>{row.name} ({row.unit})</option>)}</select></label>
            {(["minValue", "maxValue"] as const).map(bound => <label key={bound} htmlFor={`${line.key}-${bound}`}>{t(`workflows.export.${bound}`)}<input id={`${line.key}-${bound}`} inputMode="decimal" value={line[bound] ?? ""} onChange={event => setLimits(limits.map(item => item.key === line.key ? { ...item, [bound]: event.target.value } : item))} /></label>)}
            <button type="button" onClick={() => setLimits(limits.filter(item => item.key !== line.key))}>{t("workflows.remove")}</button>
          </fieldset>)}
          <button type="button" onClick={() => setLimits([...limits, { key: crypto.randomUUID(), attributeId: "", minValue: null, maxValue: null }])}>{t("workflows.export.addLimit")}</button>
        </div>}
        <button type="submit">{t("field.seasons.save")}</button>
      </fieldset>
      {validation && <p role="alert" className="text-accent-danger">{validation}</p>}
    </form>}
  </>;
}

export function ExportOrderHistory({ orderId }: { orderId: string }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const history = useQuery({ queryKey: ["export-order-history", orderId, page], queryFn: () => exportEndpoints.getOrderHistory(orderId, { page, pageSize: 20 }), enabled: open });
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  return <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className="gl-workflow space-y-3 rounded-xl border border-ink-tertiary/20 p-4">
    <summary className="cursor-pointer font-semibold">{t("workflows.export.history")}</summary>
    {open && <>
      <Feedback error={history.error} pending={history.isPending} />
      {history.data?.items.length === 0 && <p>{t("workflows.empty")}</p>}
      <ol className="divide-y divide-ink-tertiary/15">{history.data?.items.map((event, index) => <li key={`${event.recordedAt}:${index}`} className="space-y-1 py-3">
        <p className="font-semibold">{t(`workflows.export.event.${event.action}`, { defaultValue: event.action })}</p>
        <p className="text-sm text-ink-secondary">{event.actorName} · <time dateTime={event.recordedAt}>{date.format(new Date(event.recordedAt))}</time></p>
      </li>)}</ol>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={page === 1 || history.isFetching} onClick={() => setPage(page - 1)}>{t("field.seasons.prev")}</button><button type="button" disabled={!history.data?.hasMore || history.isFetching} onClick={() => setPage(page + 1)}>{t("field.seasons.next")}</button></div>
    </>}
  </details>;
}
