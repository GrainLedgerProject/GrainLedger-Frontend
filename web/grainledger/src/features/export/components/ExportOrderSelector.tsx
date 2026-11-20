import { useId } from "react";
import type { ExportOrderSummary } from "@/api/exports";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { shippingDate } from "../model/exportPresentation";

export function ExportOrderSelector({
  orders,
  value,
  onChange,
}: {
  orders: ExportOrderSummary[];
  value: string;
  onChange: (id: string) => void;
}) {
  const text = useWorkflowText();
  const id = useId();
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold text-ink-secondary"
      >
        {text("Đơn hàng", "Order")}
      </label>

      <select
        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg"
        id={id}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          {text("Chọn đơn hàng", "Select order")}
        </option>

        {orders.map((o) => (
          <option key={o.id} value={o.id}>
            {o.code} · {shippingDate(o.shippingFrom, text("vi", "en"))} –{" "}
            {shippingDate(o.shippingTo, text("vi", "en"))}
          </option>
        ))}
      </select>
    </div>
  );
}
