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
} from "@phosphor-icons/react";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { exportPaths } from "../paths";
import type { ExportView } from "../model/exportPresentation";
import "./export-workspace.css";

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
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent-primary">
          {eyebrow}
        </p>
        <h1 className="font-display text-2xl font-bold text-ink-primary">
          {title}
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
          {subtitle}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {refresh && (
          <button
            type="button"
            className="export-button export-button-icon"
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
      className="export-workspace-nav"
    >
      {links.map(({ id, path, label, icon: Icon }) => (
        <Link
          key={id}
          to={path + (context.size ? `?${context}` : "")}
          aria-current={view === id ? "page" : undefined}
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
    <div className="export-stat rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised sm:p-5">
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
      <div className="relative">
        <MagnifyingGlass
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
        />
        <input
          id={id}
          type="search"
          className="!pl-9"
          value={value}
          placeholder={placeholder ?? label}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
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
      className="export-table-scroll"
      role="region"
      aria-labelledby={id}
      tabIndex={0}
    >
      <table className="export-data-table">
        <caption id={id} className="sr-only">
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((column, i) => (
              <th key={i} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
