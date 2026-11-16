import {
  ArrowRight,
  ArrowUpRight,
  Buildings,
  Clock,
  Export,
  Factory,
  Flask,
  Leaf,
  MapPin,
  Package,
  Receipt,
  Scales,
  ShieldCheck,
  Truck,
  Users,
  ArrowsClockwise,
  ChartBar,
  CheckCircle,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { Decimal, formatMass } from "@/shared/utils/decimalMass";
import type {
  ChartBar as Bar,
  DashboardItem,
  Metric,
  Tone,
} from "../model/dashboardData";
import { statusLabel } from "../model/dashboardData";
import {
  text,
  type Copy,
  type IconName,
  type Locale,
  type Shortcut,
} from "../model/dashboardConfig";
import { dashboardPanel as panel } from "../model/dashboardStyles";

const tones: Record<Tone, { icon: string; bar: string; text: string }> = {
  primary: {
    icon: "bg-accent-primary/10 text-accent-primary",
    bar: "bg-accent-primary",
    text: "text-accent-primary",
  },
  warning: {
    icon: "bg-accent-warning/10 text-accent-warning",
    bar: "bg-accent-warning",
    text: "text-accent-warning",
  },
  danger: {
    icon: "bg-accent-danger/10 text-accent-danger",
    bar: "bg-accent-danger",
    text: "text-accent-danger",
  },
  info: {
    icon: "bg-accent-info/10 text-accent-info",
    bar: "bg-accent-info",
    text: "text-accent-info",
  },
};
const icons: Record<IconName, Icon> = {
  users: Users,
  buildings: Buildings,
  factory: Factory,
  truck: Truck,
  scales: Scales,
  package: Package,
  shield: ShieldCheck,
  flask: Flask,
  map: MapPin,
  receipt: Receipt,
  export: Export,
  clock: Clock,
  sync: ArrowsClockwise,
  leaf: Leaf,
};
export function FeatureIcon({
  name,
  tone = "primary",
  small = false,
}: {
  name: IconName;
  tone?: Tone;
  small?: boolean;
}) {
  const Glyph = icons[name];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ${small ? "h-9 w-9" : "h-11 w-11"} ${tones[tone].icon}`}
    >
      <Glyph size={small ? 18 : 22} weight="duotone" aria-hidden="true" />
    </span>
  );
}
export function MetricCard({
  metric,
  locale,
  loading,
  unavailable,
}: {
  metric: Metric;
  locale: Locale;
  loading: boolean;
  unavailable?: string;
}) {
  return (
    <article className={`${panel} relative overflow-hidden p-5`}>
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-44 text-sm font-medium leading-5 text-ink-secondary">
          {text(metric.label, locale)}
        </p>
        <FeatureIcon name={metric.icon} tone={metric.tone} small />
      </div>
      {loading ? (
        <div
          role="status"
          aria-label={text(["Đang tải số liệu", "Loading metric"], locale)}
          className="mt-5 h-9 w-28 animate-pulse rounded-lg bg-surface-overlay/60 motion-reduce:animate-none"
        />
      ) : (
        <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5 text-2xl font-bold tracking-tight text-ink-primary tabular-nums sm:text-3xl xl:text-2xl 2xl:text-3xl">
          <span className="break-all">{metric.value ?? "—"}</span>
          {metric.value !== null && metric.unit && (
            <span className="text-sm font-medium tracking-normal text-ink-tertiary">
              {metric.unit}
            </span>
          )}
        </p>
      )}
      <p className="mt-3 text-xs leading-5 text-ink-tertiary">
        {unavailable ?? metric.detail}
      </p>
      <div
        aria-hidden="true"
        className={`absolute bottom-0 left-0 right-0 h-2 w-full rounded-full opacity-30 ${tones[metric.tone].bar}`}
      />
    </article>
  );
}

export function SectionHeading({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-tertiary">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-lg font-bold text-ink-primary">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  title,
  detail,
  loading = false,
}: {
  title: string;
  detail: string;
  loading?: boolean;
}) {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center"
      role={loading ? "status" : undefined}
    >
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-overlay/45 text-ink-tertiary">
        {loading ? (
          <ArrowsClockwise
            size={22}
            className="motion-safe:animate-spin"
            aria-hidden="true"
          />
        ) : (
          <ChartBar size={22} aria-hidden="true" />
        )}
      </span>
      <p className="text-sm font-semibold text-ink-primary">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-ink-tertiary">
        {detail}
      </p>
    </div>
  );
}

export function DistributionChart({
  bars,
  locale,
}: {
  bars: Bar[];
  locale: Locale;
}) {
  const max = bars.reduce(
    (value, bar) => Decimal.max(value, new Decimal(bar.value)),
    new Decimal(0),
  );
  return (
    <div
      className="space-y-4 py-2"
      role="img"
      aria-label={bars
        .map(
          (bar) =>
            `${bar.label}: ${bar.mass ? formatMass(bar.value, 3, locale) + " kg" : bar.value}`,
        )
        .join("; ")}
    >
      {bars.map((bar, index) => {
        const value = new Decimal(bar.value);
        // Only the visual ratio is converted to number. Mass arithmetic stays Decimal.
        const width = max.gt(0) ? value.div(max).times(100).toNumber() : 0;
        return (
          <div key={`${bar.label}-${index}`} aria-hidden="true">
            <div className="mb-2 flex items-baseline justify-between gap-3 text-xs">
              <span className="font-medium text-ink-secondary">
                {bar.label}
              </span>
              <span className="shrink-0 font-mono font-semibold tabular-nums text-ink-primary">
                {bar.mass
                  ? `${formatMass(bar.value, 3, locale)} kg`
                  : new Intl.NumberFormat(locale).format(Number(bar.value))}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-overlay/40">
              <div
                className={`h-full rounded-full ${tones[bar.tone].bar}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PriorityList({
  items,
  locale,
  uncertain,
}: {
  items: DashboardItem[];
  locale: Locale;
  uncertain: boolean;
}) {
  if (!items.length)
    return (
      <div className="flex min-h-52 flex-col items-center justify-center py-8 text-center">
        <span
          className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${uncertain ? tones.info.icon : tones.primary.icon}`}
        >
          {uncertain ? (
            <Clock size={24} aria-hidden="true" />
          ) : (
            <CheckCircle size={24} weight="duotone" aria-hidden="true" />
          )}
        </span>
        <p className="text-sm font-semibold text-ink-primary">
          {text(
            uncertain
              ? ["Chưa đủ dữ liệu để tổng hợp", "More data is needed"]
              : ["Chưa có mục cần ưu tiên", "No priority items found"],
            locale,
          )}
        </p>
        <p className="mt-1 max-w-xs text-xs leading-5 text-ink-tertiary">
          {text(
            uncertain
              ? [
                  "Kiểm tra quyền truy cập, cơ sở hoặc tải lại dữ liệu.",
                  "Check access, select a facility or refresh the data.",
                ]
              : [
                  "Trong các bản ghi đã tải. Có thể xem thêm tại từng khu vực nghiệp vụ.",
                  "Based on loaded records. Visit each workspace for the full picture.",
                ],
            locale,
          )}
        </p>
      </div>
    );
  return (
    <ul className="divide-y divide-ink-tertiary/10">
      {items.map((item, index) => (
        <li key={item.id}>
          <Link
            to={item.path}
            className="group flex min-h-20 items-center gap-3 rounded-lg py-4 transition-colors hover:bg-surface-raised dark:hover:bg-surface-overlay/25"
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tones[item.tone].icon}`}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-semibold text-ink-primary"
                title={item.title}
              >
                {item.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-ink-secondary">
                {item.detail}
              </p>
            </div>
            <ArrowUpRight
              size={18}
              className="shrink-0 text-ink-tertiary group-hover:text-accent-primary"
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function RecentList({
  items,
  locale,
  sourceLabel,
}: {
  items: DashboardItem[];
  locale: Locale;
  sourceLabel: string;
}) {
  const extra: Record<string, Copy> = {
    INACTIVE: ["Đã vô hiệu hóa", "Inactive"],
    RESTRICTED: ["Có hạn chế", "Restricted"],
    AVAILABLE: ["Không có hạn chế", "No restrictions"],
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{sourceLabel}</caption>
        <thead>
          <tr className="border-y border-ink-tertiary/10 text-xs text-ink-tertiary">
            <th className="px-5 py-3 font-medium">
              {text(["Thông tin", "Record"], locale)}
            </th>
            <th className="px-4 py-3 font-medium">
              {text(["Chi tiết", "Details"], locale)}
            </th>
            <th className="px-5 py-3 text-right font-medium">
              {text(["Trạng thái / thời điểm", "Status / date"], locale)}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-tertiary/10">
          {items.map((item) => (
            <tr
              key={item.id}
              className="hover:bg-surface-raised/70 dark:hover:bg-surface-overlay/25"
            >
              <td className="max-w-60 px-5 py-4">
                <Link
                  to={item.path}
                  className="inline-flex min-h-8 items-center gap-2 font-semibold text-ink-primary hover:text-accent-primary"
                >
                  <span className="truncate" title={item.title}>
                    {item.title}
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="shrink-0 text-ink-tertiary"
                    aria-hidden="true"
                  />
                </Link>
                <p
                  className="mt-0.5 truncate text-xs text-ink-tertiary"
                  title={item.detail}
                >
                  {item.detail || "—"}
                </p>
              </td>
              <td className="px-4 py-4 text-xs font-medium tabular-nums text-ink-secondary">
                {item.value || "—"}
              </td>
              <td className="px-5 py-4 text-right">
                {item.status && (
                  <span
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${tones[item.tone].icon}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${tones[item.tone].bar}`}
                    />
                    {extra[item.status]
                      ? text(extra[item.status], locale)
                      : statusLabel(item.status, locale)}
                  </span>
                )}
                {item.date && (
                  <p className="mt-1 whitespace-nowrap text-xs text-ink-tertiary">
                    {formatDate(item.date, locale)}
                  </p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function formatDate(value: string, locale: Locale) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date)
    : "—";
}
export function ShortcutList({
  items,
  locale,
}: {
  items: Shortcut[];
  locale: Locale;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-raised dark:hover:bg-surface-overlay/25"
        >
          <FeatureIcon name={item.icon} small />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-primary">
              {text(item.label, locale)}
            </p>
            <p className="mt-1 text-xs leading-5 text-ink-tertiary">
              {text(item.description, locale)}
            </p>
          </div>
          <ArrowRight
            size={16}
            className="shrink-0 text-ink-tertiary group-hover:text-accent-primary"
            aria-hidden="true"
          />
        </Link>
      ))}
    </div>
  );
}
export function DataWarning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-accent-warning/20 bg-accent-warning/5 p-3 text-xs leading-5 text-accent-warning">
      <WarningCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
      {children}
    </div>
  );
}
