import type { ReactNode } from "react";
import { ApiError } from "@/api/client";
import { useWorkflowText } from "./useWorkflowText";

export function Workflow({ title, description, actions, children }: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const heading = <h1 className="font-display text-2xl font-bold text-ink-primary">{title}</h1>;
  return (
    <div className="gl-workflow space-y-5 pb-8">
      {description || actions ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-tertiary/15 pb-4">
          <div>
            {heading}
            {description && <p data-ui-detail="secondary" className="mt-1 text-xs text-ink-secondary">{description}</p>}
          </div>
          {actions}
        </header>
      ) : heading}
      {children}
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised sm:p-6">
    <h2 className="font-display text-lg font-semibold">{title}</h2>{children}
  </section>;
}

export function Feedback({ error, pending }: { error?: unknown; pending?: boolean }) {
  const text = useWorkflowText();
  if (error) {
    const details = error instanceof ApiError ? Object.values(error.problem?.errors ?? {}).flat() : [];
    return <div role="alert" className="rounded-xl bg-functional-rejected-bg p-3 text-accent-danger">
      {error instanceof Error ? error.message : text("Không thể hoàn thành thao tác.", "The operation failed.")}
      {details.length > 0 && <ul>{details.map((detail, index) => <li key={index}>{detail}</li>)}</ul>}
    </div>;
  }
  return pending ? <p role="status">{text("Đang tải…", "Loading…")}</p> : null;
}
