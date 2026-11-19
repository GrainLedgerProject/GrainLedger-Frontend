import { WarningCircle, X } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import React from 'react';
import { Modal } from '@/shared/ui/Modal';

export interface ConfirmPopoverProps {
  isOpen: boolean;
  title: string;
  description?: string;
  warningNote?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmPopover: React.FC<ConfirmPopoverProps> = ({
  isOpen,
  title,
  description,
  warningNote,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  const confirmBtnStyles = {
    danger: 'bg-accent-danger hover:opacity-90 text-white',
    warning: 'bg-accent-warning hover:opacity-90 text-ink-primary',
    primary: 'bg-accent-primary hover:bg-accent-primary-dim text-white',
  }[variant];

  return (
    <Modal isOpen={isOpen} onClose={onCancel} ariaLabel={title}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-[min(28rem,calc(100vw-2rem))] rounded-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 p-6 shadow-xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 text-ink-tertiary hover:text-ink-primary p-1 rounded-sm transition-colors"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4">
              <div
                className={`p-2.5 rounded-full shrink-0 ${
                  variant === 'danger'
                    ? 'bg-functional-hold-bg text-accent-danger'
                    : variant === 'warning'
                    ? 'bg-functional-stale-bg text-accent-warning'
                    : 'bg-functional-balanced-bg text-accent-primary'
                }`}
              >
                <WarningCircle size={24} weight="fill" />
              </div>

              <div className="flex-1 space-y-2">
                <h3 id="confirm-dialog-title" className="text-base font-semibold text-ink-primary">
                  {title}
                </h3>
                {description && (
                  <p className="text-sm text-ink-secondary leading-normal">
                    {description}
                  </p>
                )}
                {warningNote && (
                  <div className="p-2.5 rounded bg-functional-stale-bg border border-functional-stale-border/40 text-xs text-accent-warning">
                    <strong>Lưu ý:</strong> {warningNote}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-ink-secondary hover:text-ink-primary hover:bg-surface-raised dark:hover:bg-surface-overlay rounded-md transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`px-4 py-2 text-sm font-semibold rounded-md shadow-xs transition-colors ${confirmBtnStyles}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
    </Modal>
  );
};
