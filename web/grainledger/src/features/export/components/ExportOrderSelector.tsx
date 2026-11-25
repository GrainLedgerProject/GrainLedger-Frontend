import { useId } from "react";
import { ClipboardText } from "@phosphor-icons/react";
import type { ExportOrderSummary } from "@/api/exports";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { shippingDate } from "../model/exportPresentation";
import { ExportIconField } from "./ExportWorkspaceUI";

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

      <ExportIconField icon={ClipboardText}>
        <select
          className="filter-control border-ink-tertiary/20 bg-surface-raised ps-10 font-semibold dark:bg-surface-base"
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
      </ExportIconField>
    </div>
  );
}
