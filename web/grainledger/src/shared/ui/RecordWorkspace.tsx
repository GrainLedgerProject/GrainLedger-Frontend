import { useId, type ReactNode } from "react";
import { ArrowsClockwise, CaretLeft, CaretRight, CheckCircle, X } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { GrainLoader } from "./GrainLoader";
import { Modal } from "./Modal";
import { Feedback } from "./Workflow";
import { useWorkflowText } from "./useWorkflowText";

export function RecordWorkspace({ section, title, description, actions, children }: {
  section: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return <div className="min-w-0 space-y-6 pb-8">
    <header className="flex flex-col gap-4 border-b border-ink-tertiary/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 break-words">
        <span data-ui-detail="secondary" className="text-xs font-semibold uppercase tracking-wider text-accent-primary">{section}</span>
        <h1 className="font-display text-2xl font-bold text-ink-primary">{title}</h1>
        <p data-ui-detail="secondary" className="mt-0.5 text-xs text-ink-secondary">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:max-w-[50%] sm:justify-end">{actions}</div>}
    </header>
    {children}
  </div>;
}

export function RecordRefresh({ pending, onRefresh }: {
  pending: boolean;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const label = t("workflows.reload");
  return <button type="button" aria-label={label} title={label} disabled={pending} onClick={onRefresh} className="record-icon-button">
    <ArrowsClockwise aria-hidden="true" size={16} className={pending ? "motion-safe:animate-spin" : undefined} />
  </button>;
}

export function RecordTable({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  return <div tabIndex={0} role="region" aria-labelledby={labelledBy} className="record-table-region">
    <table>{children}</table>
  </div>;
}

export function RecordFeedback({ error, pending, label }: { error?: unknown; pending: boolean; label: string }) {
  if (error) return <div className="p-4 text-sm"><Feedback error={error} /></div>;
  return pending ? <GrainLoader label={label} className="px-4 py-10 text-ink-secondary sm:py-16" /> : null;
}

export function RecordEmpty({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <div className="record-empty">
    <span aria-hidden="true" className="text-ink-tertiary opacity-60">{icon}</span>
    <p className="font-semibold text-ink-primary">{children}</p>
  </div>;
}

export function RecordSuccess({ message, className = "" }: { message: string; className?: string }) {
  return <div role="status" className={message ? `record-success ${className}` : "sr-only"}>
    {message && <CheckCircle size={18} weight="fill" className="shrink-0" aria-hidden="true" />}
    {message}
  </div>;
}

export function RecordPagination({ label, page, count, hasMore, onPage }: {
  label: string;
  page: number;
  count?: number;
  hasMore: boolean;
  onPage: (page: number) => void;
}) {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const id = useId();
  const canNavigate = page > 1 || hasMore;
  if (count === undefined && !canNavigate) return null;

  return <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-tertiary/15 bg-surface-raised/60 px-4 py-2 dark:bg-surface-overlay/30">
    <p id={id} className="text-xs text-ink-secondary">
      {count === undefined ? text(`Trang ${page}`, `Page ${page}`) : t("field.seasons.pageStatus", { page, count })}
    </p>
    {canNavigate && <div className="flex gap-2">
      <button type="button" aria-label={t("field.seasons.prev")} aria-describedby={id} disabled={page === 1} onClick={() => onPage(page - 1)} className="record-icon-button rounded-lg"><CaretLeft aria-hidden="true" size={16} /></button>
      <button type="button" aria-label={t("field.seasons.next")} aria-describedby={id} disabled={!hasMore} onClick={() => onPage(page + 1)} className="record-icon-button rounded-lg"><CaretRight aria-hidden="true" size={16} /></button>
    </div>}
  </nav>;
}

export function RecordDialog({ title, titleId, subtitle, icon, onClose, busy, wide, dismissOnBackdrop = false, children }: {
  title: string;
  titleId?: string;
  subtitle?: string;
  icon: ReactNode;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
  dismissOnBackdrop?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const id = useId();
  const headingId = titleId ?? id;
  return <Modal isOpen onClose={() => { if (!busy) onClose(); }} ariaLabelledBy={headingId}
    closeOnBackdrop={dismissOnBackdrop} className={`rounded-2xl shadow-xl ${wide ? "w-[42rem]" : "w-[34rem]"}`}>
    <div className="record-form rounded-2xl border border-ink-tertiary/20 bg-surface-base text-ink-primary dark:bg-surface-raised">
      <header className="flex items-center gap-3 rounded-t-2xl border-b border-ink-tertiary/15 bg-surface-raised p-4 sm:p-5">
        <span aria-hidden="true" className="record-icon-tile">{icon}</span>
        <div className="min-w-0 flex-1 self-center">
          <h2 id={headingId} className="font-display text-lg font-bold [overflow-wrap:anywhere] sm:text-xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-secondary [overflow-wrap:anywhere]">{subtitle}</p>}
        </div>
        <button type="button" aria-label={t("field.seasons.close")} onClick={onClose} disabled={busy} className="record-icon-button">
          <X aria-hidden="true" size={18} />
        </button>
      </header>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </div>
  </Modal>;
}
