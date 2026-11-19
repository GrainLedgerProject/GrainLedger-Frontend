import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { X } from "@phosphor-icons/react";
import { Modal } from "@/shared/ui/Modal";
import { panel, iconButton } from "./mrlStyles";

export function MrlDialog({
  open,
  title,
  subtitle,
  icon,
  onClose,
  busy,
  children,
  footer,
  className = "w-[48rem]",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  onClose: () => void;
  busy: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      ariaLabel={title}
      className={className}
      closeOnBackdrop={!busy}
    >
      <div className={`${panel} overflow-hidden`}>
        <header className="flex items-center justify-between gap-3 border-b border-ink-tertiary/15 bg-surface-raised p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
              {icon}
            </div>
            <div className="min-w-0">
              {subtitle && (
                <p className="text-xs text-ink-secondary">{subtitle}</p>
              )}
              <h3 className="break-words font-display text-lg font-bold text-ink-primary">
                {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            className={iconButton}
            aria-label={t("apiAudit.close")}
            disabled={busy}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="space-y-5 p-4 sm:p-6">{children}</div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-ink-tertiary/15 p-4 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </Modal>
  );
}
