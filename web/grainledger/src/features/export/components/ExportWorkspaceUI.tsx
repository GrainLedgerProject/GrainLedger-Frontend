import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowsClockwise,
  ChartPieSlice,
  Export,
  FileText,
  MagnifyingGlass,
  Package,
  Truck,
  type Icon,
} from "@phosphor-icons/react";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { exportPaths } from "../paths";
import type { ExportView } from "../model/exportPresentation";

export function ExportPageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  refreshing,
  refresh,
}: {
  title: string;
  subtitle: string;
  eyebrow: string;
  actions?: ReactNode;
  refreshing?: boolean;
  refresh?: () => void;
}) {
  const text = useWorkflowText();
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-ink-tertiary/15 pb-5 sm:flex-row sm:items-center">
      <div className="max-w-3xl">
        <p
          data-ui-detail="secondary"
          className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent-primary"
        >
          {eyebrow}
        </p>
        <h1 className="font-display text-2xl font-bold text-ink-primary">
          {title}
        </h1>
        <p
          data-ui-detail="secondary"
          className="mt-1 text-xs leading-relaxed text-ink-secondary"
        >
          {subtitle}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {refresh && (
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary w-11 px-2.5"
            disabled={refreshing}
            aria-label={text("Tải lại dữ liệu", "Reload data")}
            onClick={refresh}
          >
            <ArrowsClockwise
              size={18}
              aria-hidden="true"
              className={refreshing ? "motion-safe:animate-spin" : ""}
            />
          </button>
        )}
        {actions}
      </div>
    </header>
  );
}

export function ExportWorkspaceNav({
  view,
  params,
}: {
  view: ExportView;
  params: URLSearchParams;
}) {
  const text = useWorkflowText();
  const links = [
    {
      id: "orders",
      path: exportPaths.orders,
      label: text("Đơn hàng xuất khẩu", "Export orders"),
      icon: Export,
    },
    {
      id: "plans",
      path: exportPaths.plans,
      label: text("Phương án phối trộn", "Blend plans"),
      icon: ChartPieSlice,
    },
    {
      id: "containers",
      path: exportPaths.containers,
      label: text("Container xuất khẩu", "Export containers"),
      icon: Truck,
    },
    {
      id: "dossiers",
      path: exportPaths.dossiers,
      label: text("Hồ sơ theo container", "Container records"),
      icon: FileText,
    },
  ];
  const context = new URLSearchParams(params);
  context.delete("plan");
  return (
    <nav
      aria-label={text("Nghiệp vụ xuất khẩu", "Export workspaces")}
      className="flex flex-wrap gap-2 border-b border-ink-tertiary/15 pb-4"
    >
      {links.map(({ id, path, label, icon: Icon }) => (
        <Link
          key={id}
          to={path + (context.size ? `?${context}` : "")}
          aria-current={view === id ? "page" : undefined}
          className="flex min-h-11 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-ink-secondary hover:bg-surface-raised aria-[current=page]:bg-accent-primary aria-[current=page]:text-ink-inverse [@media(pointer:coarse)]:min-h-12"
        >
          <Icon
            size={16}
            aria-hidden="true"
            weight={view === id ? "bold" : "regular"}
          />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function ExportStat({
  label,
  value,
  detail,
  icon,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 [&>p]:[overflow-wrap:anywhere] rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
          {label}
        </p>
        <span className="text-accent-primary" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p
        className={`font-mono text-2xl font-bold ${accent ? "text-accent-primary" : "text-ink-primary"}`}
      >
        {value}
      </p>
      {detail && (
        <p className="mt-2 text-[11px] leading-relaxed text-ink-secondary">
          {detail}
        </p>
      )}
    </div>
  );
}

export function ExportSection({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-ink-tertiary/20 bg-surface-base shadow-xs dark:bg-surface-raised ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-tertiary/15 px-5 py-4">
        <div>
          <h2 className="font-display text-sm font-bold text-ink-primary">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
              {description}
            </p>
          )}
        </div>
        {actions}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function ExportEmpty({
  title,
  description,
  action,
  icon,
  pending,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  pending?: boolean;
}) {
  if (pending)
    return (
      <div className="flex justify-center py-12">
        <GrainLoader label={title} />
      </div>
    );
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink-tertiary/25 bg-surface-raised/40 px-5 py-10 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-base text-accent-primary dark:bg-surface-overlay"
        aria-hidden="true"
      >
        {icon ?? <Package size={24} />}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
        {description && (
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-ink-secondary">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function ExportIconField({
  icon: Icon,
  children,
}: {
  icon: Icon;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <Icon
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
      />
      {children}
    </div>
  );
}

export function ExportSearch({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="min-w-0 flex-1 sm:max-w-sm">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <ExportIconField icon={MagnifyingGlass}>
        <input
          id={id}
          type="search"
          className="w-full ps-10 pe-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg"
          value={value}
          placeholder={placeholder ?? label}
          onChange={(e) => onChange(e.target.value)}
        />
      </ExportIconField>
    </div>
  );
}

export function ExportTable({
  caption,
  columns,
  children,
}: {
  caption: string;
  columns: string[];
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div
      className="relative max-h-[36rem] max-w-full overflow-auto rounded-2xl border border-ink-tertiary/20 [container-type:inline-size]"
      role="region"
      aria-labelledby={id}
      tabIndex={0}
    >
      <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-start text-xs [&_:is(th,td)]:border-b [&_:is(th,td)]:border-ink-tertiary/15 [&_:is(th,td)]:px-4 [&_:is(th,td)]:py-3.5 [&_:is(th,td)]:align-middle [@container_(width<560px)]:[&_:is(th,td)]:!p-3 [&_tbody_tr:last-child>*]:border-b-0 [&_tbody_tr:hover>*]:bg-surface-raised [&_tbody_tr[data-selected=true]>*]:bg-surface-raised">
        <caption id={id} className="sr-only">
          {caption}
        </caption>
        <thead className="sticky top-0 z-20 whitespace-nowrap bg-surface-raised text-left text-[11px] font-semibold uppercase tracking-wider text-ink-secondary [&_th]:bg-surface-raised [&_th:first-child]:sticky [&_th:first-child]:start-0 [&_th:first-child]:z-10">
          <tr>
            {columns.map((column, i) => (
              <th key={i} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_th]:sticky [&_th]:start-0 [&_th]:z-10 [&_th]:bg-surface-base [&_th]:text-start">
          {children}
        </tbody>
      </table>
    </div>
  );
}
