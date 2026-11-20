import type { ReactNode, Ref, UIEventHandler } from "react";
import { X } from "@phosphor-icons/react";

interface ExportDialogFrameProps {
  kind?: string;
  title: string;
  icon: ReactNode;
  subtitle?: ReactNode;
  backAction?: ReactNode;
  notice?: ReactNode;
  closeLabel: string;
  closeDisabled?: boolean;
  onClose: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
  bodyRef?: Ref<HTMLDivElement>;
  onBodyScroll?: UIEventHandler<HTMLDivElement>;
  children: ReactNode;
}

export function ExportDialogFrame({
  kind, title, icon, subtitle, backAction, notice, closeLabel, closeDisabled,
  onClose, headingRef, bodyRef, onBodyScroll, children,
}: ExportDialogFrameProps) {
  return (
    <div className="text-ink-primary [container:workspace/inline-size] flex w-[calc(100dvw-2rem)] max-w-[76rem] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised data-[kind=allocate]:max-w-lg data-[kind=create-order]:max-w-3xl data-[kind=order]:max-w-[60rem] data-[kind=closure]:max-w-[60rem]" data-kind={kind}>
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-ink-tertiary/15 bg-surface-raised px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          {backAction}
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 ref={headingRef} tabIndex={headingRef ? -1 : undefined} className="break-words font-display text-base font-bold text-ink-primary">
              {title}
            </h2>
            {subtitle}
          </div>
        </div>
        <button
          type="button"
          autoFocus
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary w-11 px-2.5 shrink-0"
          disabled={closeDisabled}
          onClick={onClose}
          aria-label={closeLabel}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      {notice}
      <div ref={bodyRef} className="min-h-0 overflow-auto overscroll-contain p-4 sm:p-6" onScroll={onBodyScroll}>
        {children}
      </div>
    </div>
  );
}
