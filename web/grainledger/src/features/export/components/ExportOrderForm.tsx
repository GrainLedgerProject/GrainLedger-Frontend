import { useEffect, useId, useState, type FormEvent } from "react";
import { Decimal } from "@/shared/utils/decimalMass";
import {
  exportEndpoints,
  type CreateExportOrderRequest,
  type ExportLimitInput,
} from "@/api/exports";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { useExportCommand } from "../hooks/useExportCommand";
import { useExportOrderCatalogs } from "../hooks/useExportOrderCatalogs";
import {
  Calendar,
  Export,
  Globe,
  Plus,
  ShieldCheck,
  Trash,
} from "@phosphor-icons/react";

const newLimit = (): ExportLimitInput => ({
  attributeId: "",
  minValue: null,
  maxValue: null,
});

const inputClass =
  "w-full px-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-overlay/50 border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none transition-colors";
const labelClass = "block text-xs font-semibold text-ink-secondary mb-1.5";

export function ExportOrderForm({
  saved,
  onBusyChange,
}: {
  saved: (id: string) => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const text = useWorkflowText();
  const uid = useId();
  const [shippingFrom, setShippingFrom] = useState("");
  const [limits, setLimits] = useState([newLimit()]);

  const catalogs = useExportOrderCatalogs();

  const create = useExportCommand(
    async (operationId, body: Omit<CreateExportOrderRequest, "operationId">) => {
      const result = await exportEndpoints.createOrder({
        ...body,
        operationId,
      });
      await saved(result.id);
    },
    () => {},
  );
  useEffect(() => { onBusyChange?.(create.isPending); }, [create.isPending, onBusyChange]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const required = new Decimal(value("requiredMass"));
    const target = new Decimal(value("target"));
    const factor =
      value("unit") === "T" ? "1000" : value("unit") === "G" ? "0.001" : "1";

    for (const name of ["requiredMass", "target"]) {
      const field = event.currentTarget.elements.namedItem(
        name,
      ) as HTMLInputElement;
      const kg = new Decimal(value(name)).times(factor);
      field.setCustomValidity(
        kg.lte(0) ||
          kg.gt("99999999999999.999999") ||
          kg.decimalPlaces() > 6
          ? text(
              "Nhập khối lượng dương, quy đổi ra kg với tối đa 6 chữ số thập phân.",
              "Enter a positive mass that converts exactly to kg with at most 6 decimal places.",
            )
          : "",
      );
    }
    if (!event.currentTarget.reportValidity()) return;
    const field = event.currentTarget.elements.namedItem(
      "target",
    ) as HTMLInputElement;
    field.setCustomValidity(
      target.gt(required)
        ? text(
            "Mục tiêu container không được vượt khối lượng hợp đồng.",
            "The container target cannot exceed the contract mass.",
          )
        : "",
    );
    if (!event.currentTarget.reportValidity()) return;

    create.submit({
      marketId: value("market"),
      commodityId: value("commodity"),
      requiredMass: value("requiredMass"),
      unit: value("unit"),
      shippingFrom: value("from"),
      shippingTo: value("to"),
      limits,
      containers: [{ targetMass: value("target"), unit: value("unit") }],
    });
  }

  function updateLimit(index: number, patch: Partial<ExportLimitInput>) {
    setLimits((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  return (
    <section
      aria-label={text("Tạo đơn xuất khẩu", "Create export order")}
      className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised p-6 shadow-sm space-y-6"
    >
      <div className="flex items-center gap-3 border-b border-ink-tertiary/15 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
          <Export size={22} weight="bold" />
        </div>
        <div>
          <h2 className="font-display text-base font-bold text-ink-primary">
            {text("Tạo đơn xuất khẩu", "Create export order")}
          </h2>
          <p className="text-xs text-ink-secondary">
            {text(
              "Khai báo thông tin hợp đồng xuất khẩu, lịch trình và các chỉ tiêu kỹ thuật cam kết.",
              "Define export contract specifications, delivery timeline and quality requirements.",
            )}
          </p>
        </div>
      </div>

      <Feedback pending={catalogs.isPending} error={catalogs.error} />

      {catalogs.data && (
        <form
          aria-label={text("Tạo đơn xuất khẩu", "Create export order")}
          onSubmit={submit}
          onInput={(e) =>
            e.currentTarget
              .querySelectorAll("input")
              .forEach((input) => input.setCustomValidity(""))
          }
        >
          <fieldset disabled={create.isPending} className="space-y-6">
            <legend className="sr-only">
              {text("Nhu cầu xuất khẩu", "Export demand")}
            </legend>

            {/* Contract & Commodity Group */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-primary flex items-center gap-2">
                <Globe size={16} />
                <span>{text("Hợp đồng & Hàng hóa", "Contract & Commodity")}</span>
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    {text("Thị trường", "Market")}
                    <select
                      required
                      name="market"
                      defaultValue=""
                      className={inputClass}
                    >
                      <option value="">
                        {text("— Chọn thị trường đích —", "— Select market —")}
                      </option>
                      {catalogs.data.markets.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div>
                  <label className={labelClass}>
                    {text("Hàng hóa", "Commodity")}
                    <select
                      required
                      name="commodity"
                      defaultValue=""
                      className={inputClass}
                    >
                      <option value="">
                        {text("— Chọn loại hàng hóa —", "— Select commodity —")}
                      </option>
                      {catalogs.data.commodities.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div>
                  <label htmlFor={`${uid}-mass`} className={labelClass}>
                    {text("Khối lượng hợp đồng", "Required mass")}
                  </label>
                  <input
                    id={`${uid}-mass`}
                    required
                    name="requiredMass"
                    inputMode="decimal"
                    pattern="[0-9]+([.][0-9]{1,6})?"
                    placeholder="24000"
                    className={`${inputClass} font-mono`}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {text("Đơn vị khối lượng", "Mass unit")}
                    <select required name="unit" className={inputClass}>
                      {catalogs.data.units.map((x) => (
                        <option key={x.id} value={x.code.toUpperCase()}>
                          {x.code.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            {/* Shipping & Initial Container */}
            <div className="space-y-4 pt-2 border-t border-ink-tertiary/10">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-primary flex items-center gap-2">
                <Calendar size={16} />
                <span>{text("Thời gian & Container đầu tiên", "Timeline & First Container")}</span>
              </h3>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor={`${uid}-from`} className={labelClass}>
                    {text("Giao hàng từ ngày", "Shipping from")}
                  </label>
                  <input
                    id={`${uid}-from`}
                    required
                    name="from"
                    type="date"
                    value={shippingFrom}
                    onChange={(e) => setShippingFrom(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor={`${uid}-to`} className={labelClass}>
                    {text("Giao hàng đến ngày", "Shipping to")}
                  </label>
                  <input
                    id={`${uid}-to`}
                    required
                    name="to"
                    type="date"
                    min={shippingFrom || undefined}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor={`${uid}-target`} className={labelClass}>
                    {text(
                      "Khối lượng mục tiêu của container đầu tiên",
                      "First container target mass",
                    )}
                  </label>
                  <input
                    id={`${uid}-target`}
                    required
                    name="target"
                    inputMode="decimal"
                    pattern="[0-9]+([.][0-9]{1,6})?"
                    placeholder="24000"
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>
            </div>

            {/* Quality Limits */}
            <div className="space-y-4 pt-2 border-t border-ink-tertiary/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-primary flex items-center gap-2">
                  <ShieldCheck size={16} />
                  <span>{text("Chỉ tiêu chất lượng", "Quality limits")}</span>
                </h3>

                <button
                  type="button"
                  onClick={() => setLimits([...limits, newLimit()])}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised dark:bg-surface-base hover:bg-accent-primary/10 text-accent-primary text-xs font-semibold border border-ink-tertiary/20 hover:border-accent-primary/30 transition-all"
                >
                  <Plus size={14} weight="bold" />
                  <span>{text("Thêm chỉ tiêu", "Add limit")}</span>
                </button>
              </div>

              <div className="space-y-3">
                {limits.map((row, i) => (
                  <fieldset
                    key={i}
                    className="p-4 rounded-xl bg-surface-raised/40 dark:bg-surface-overlay/20 border border-ink-tertiary/20 grid gap-3 sm:grid-cols-3 relative"
                  >
                    <legend className="text-xs font-semibold text-ink-primary px-1">
                      {text("Chỉ tiêu chất lượng", "Quality limit")} {i + 1}
                    </legend>

                    <div>
                      <label className={labelClass}>
                        {text("Thuộc tính", "Attribute")}
                        <select
                          required
                          value={row.attributeId}
                          onChange={(e) =>
                            updateLimit(i, { attributeId: e.target.value })
                          }
                          className={inputClass}
                        >
                          <option value="">
                            {text("— Chọn chỉ tiêu —", "— Select attribute —")}
                          </option>
                          {catalogs.data.attributes.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name} ({x.unit})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div>
                      <label className={labelClass}>
                        {text("Giới hạn dưới", "Minimum")}
                        <input
                          inputMode="decimal"
                          required={!row.maxValue}
                          value={row.minValue ?? ""}
                          onChange={(e) =>
                            updateLimit(i, { minValue: e.target.value || null })
                          }
                          placeholder="Min value"
                          className={`${inputClass} font-mono`}
                        />
                      </label>
                    </div>

                    <div>
                      <label className={labelClass}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span>{text("Giới hạn trên", "Maximum")}</span>
                          {limits.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setLimits(limits.filter((_, n) => n !== i));
                              }}
                              className="text-accent-danger hover:text-accent-danger/80 text-[11px] font-medium inline-flex items-center gap-1"
                            >
                              <Trash size={12} />
                              <span>{text("Xóa chỉ tiêu", "Remove limit")}</span>
                            </button>
                          )}
                        </div>
                        <input
                          inputMode="decimal"
                          required={!row.minValue}
                          value={row.maxValue ?? ""}
                          onChange={(e) =>
                            updateLimit(i, { maxValue: e.target.value || null })
                          }
                          placeholder="Max value"
                          className={`${inputClass} font-mono`}
                        />
                      </label>
                    </div>
                  </fieldset>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-ink-tertiary/15">
              <button
                type="submit"
                disabled={create.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white text-xs font-semibold shadow-md shadow-accent-primary/20 transition-all disabled:opacity-50"
              >
                <Plus size={16} weight="bold" />
                <span>
                  {create.isPending
                    ? text("Đang tạo...", "Creating...")
                    : text("Tạo đơn", "Create order")}
                </span>
              </button>
            </div>

            <Feedback error={create.error} />
          </fieldset>
        </form>
      )}
    </section>
  );
}
