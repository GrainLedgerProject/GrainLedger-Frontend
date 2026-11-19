import { Decimal } from "@/shared/utils/decimalMass";
import type { StatusType } from "@/shared/ui/StatusBadge";
import type { BlendPlanDraftDto } from "@/api/planning";

export type ExportView = "orders" | "plans" | "containers" | "dossiers";

export function massLabel(value: string | undefined, locale = "vi") {
  if (value === undefined) return "—";
  const [whole, fraction] = new Decimal(value).toFixed().split(".");
  return (
    whole.replace(/\B(?=(\d{3})+(?!\d))/g, locale === "vi" ? "." : ",") +
    (fraction ? (locale === "vi" ? "," : ".") + fraction : "")
  );
}
export function sumMass(values: string[]) {
  return values
    .reduce((sum, value) => sum.plus(value), new Decimal(0))
    .toFixed();
}
export function allocationPercent(allocated: string, required: string) {
  if (new Decimal(required).lte(0)) return 0;
  return Decimal.min(
    100,
    Decimal.max(0, new Decimal(allocated).div(required).times(100)),
  )
    .toDecimalPlaces(1)
    .toNumber();
}
/** API shipping dates are calendar dates; do not convert them through a UTC timestamp. */
export function shippingDate(value: string, locale = "vi") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match && locale === "vi"
    ? `${match[3]}/${match[2]}/${match[1]}`
    : value;
}
export function containerStatus(status: string): {
  type: StatusType;
  label: [string, string];
} {
  switch (status) {
    case "CLOSED":
      return { type: "CLOSED", label: ["Đã niêm phong", "Closed"] };
    case "LOADING":
      return { type: "IN_PROGRESS", label: ["Đang xếp hàng", "Loading"] };
    case "PLANNED":
      return { type: "PENDING", label: ["Đã lên kế hoạch", "Planned"] };
    case "HOLD":
      return { type: "HOLD", label: ["Đang HOLD", "On HOLD"] };
    default:
      return { type: "ACTIVE", label: [status, status] };
  }
}
export function planStatus(plan: BlendPlanDraftDto): {
  type: StatusType;
  label: [string, string];
} {
  if (plan.status === "CANCELLED")
    return { type: "CLOSED", label: ["Đã hủy", "Cancelled"] };
  if (!plan.demandCurrent)
    return { type: "STALE", label: ["Nhu cầu đã thay đổi", "Demand changed"] };
  return plan.hasProposal
    ? { type: "PENDING", label: ["Đã gửi đề xuất", "Proposal submitted"] }
    : { type: "ACTIVE", label: ["Bản nháp", "Draft"] };
}
