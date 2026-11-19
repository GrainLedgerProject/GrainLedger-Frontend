import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { catalogsEndpoints } from "@/api/catalogs";
import { exportEndpoints, type CreateExportOrderRequest, type ExportLimitInput } from "@/api/exports";
import { collectPages } from "@/api/query";
import { Feedback, Panel, useWorkflowText } from "@/shared/ui/Workflow";
import { useExportCommand } from "../hooks/useExportCommand";

const newLimit = (): ExportLimitInput => ({ attributeId: "", minValue: null, maxValue: null });
export function ExportOrderForm({ saved }: { saved: () => void | Promise<void> }) {
  const t = useWorkflowText();
  const [limits, setLimits] = useState([newLimit()]);
  const catalogs = useQuery({ queryKey: ["export-order-catalogs"], queryFn: async () => {
    const [markets, commodities, attributes, units] = await Promise.all([
      collectPages(catalogsEndpoints.getMarkets), collectPages(catalogsEndpoints.getCommodities),
      collectPages(catalogsEndpoints.getQualityAttributes), collectPages(catalogsEndpoints.getMeasurementUnits),
    ]);
    return { markets, commodities: commodities.filter(x => !x.isArchived), attributes,
      units: units.filter(x => !x.isDeleted && ["KG", "G", "T"].includes(x.code.toUpperCase())) };
  } });
  const create = useExportCommand((operationId, body: Omit<CreateExportOrderRequest, "operationId">) =>
    exportEndpoints.createOrder({ ...body, operationId }), saved);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    create.submit({ marketId: value("market"), commodityId: value("commodity"), requiredMass: value("requiredMass"),
      unit: value("unit"), shippingFrom: value("from"), shippingTo: value("to"), limits,
      containers: [{ targetMass: value("target"), unit: value("unit") }] });
  }
  function updateLimit(index: number, patch: Partial<ExportLimitInput>) {
    setLimits(rows => rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  }
  return <Panel title={t("Tạo đơn xuất khẩu", "Create export order")}>
    <Feedback pending={catalogs.isPending} error={catalogs.error}/>
    {catalogs.data && <form onSubmit={submit}><fieldset disabled={create.isPending} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label>{t("Thị trường", "Market")}<select required name="market" defaultValue=""><option value=""/>{catalogs.data.markets.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>{t("Hàng hóa", "Commodity")}<select required name="commodity" defaultValue=""><option value=""/>{catalogs.data.commodities.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>{t("Khối lượng hợp đồng", "Required mass")}<input required name="requiredMass" inputMode="decimal"/></label>
        <label>{t("Đơn vị khối lượng", "Mass unit")}<select required name="unit">{catalogs.data.units.map(x => <option key={x.id} value={x.code}>{x.code}</option>)}</select></label>
        <label>{t("Giao hàng từ ngày", "Shipping from")}<input required name="from" type="date"/></label>
        <label>{t("Giao hàng đến ngày", "Shipping to")}<input required name="to" type="date"/></label>
        <label>{t("Khối lượng mục tiêu của container đầu tiên", "First container target mass")}<input required name="target" inputMode="decimal"/></label>
      </div>
      {limits.map((row, i) => <fieldset key={i} className="grid gap-3 sm:grid-cols-3">
        <legend>{t("Chỉ tiêu chất lượng", "Quality limit")} {i + 1}</legend>
        <label>{t("Thuộc tính", "Attribute")}<select required value={row.attributeId} onChange={e => updateLimit(i, { attributeId: e.target.value })}>
          <option value=""/>{catalogs.data.attributes.map(x => <option key={x.id} value={x.id}>{x.name} ({x.unit})</option>)}
        </select></label>
        <label>{t("Giới hạn dưới", "Minimum")}<input inputMode="decimal" required={!row.maxValue} value={row.minValue ?? ""} onChange={e => updateLimit(i, { minValue: e.target.value || null })}/></label>
        <label>{t("Giới hạn trên", "Maximum")}<input inputMode="decimal" required={!row.minValue} value={row.maxValue ?? ""} onChange={e => updateLimit(i, { maxValue: e.target.value || null })}/></label>
        {limits.length > 1 && <button type="button" onClick={() => setLimits(limits.filter((_, n) => n !== i))}>{t("Xóa chỉ tiêu", "Remove limit")}</button>}
      </fieldset>)}
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setLimits([...limits, newLimit()])}>{t("Thêm chỉ tiêu", "Add limit")}</button>
      <button type="submit">{t("Tạo đơn", "Create order")}</button></div><Feedback error={create.error}/>
    </fieldset></form>}
  </Panel>;
}
