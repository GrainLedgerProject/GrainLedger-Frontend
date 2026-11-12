import { useFeedbackStore, type ToastVariant } from '@/app/store/feedbackStore';
import { ConfirmPopover } from '@/components/ConfirmPopover/ConfirmPopover';
import { CheckCircle, Info, WarningCircle, X, XCircle } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

const TOAST_STYLES: Record<
  ToastVariant,
  { container: string; icon: React.ReactNode }
> = {
  success: {
    container:
      'bg-surface-base/95 dark:bg-surface-raised/95 border-accent-success/40 text-ink-primary',
    icon: <CheckCircle size={20} weight="fill" className="text-accent-success shrink-0" />,
  },
  error: {
    container:
      'bg-surface-base/95 dark:bg-surface-raised/95 border-accent-danger/40 text-ink-primary',
    icon: <XCircle size={20} weight="fill" className="text-accent-danger shrink-0" />,
  },
  warning: {
    container:
      'bg-surface-base/95 dark:bg-surface-raised/95 border-accent-warning/50 text-ink-primary',
    icon: <WarningCircle size={20} weight="fill" className="text-accent-warning shrink-0" />,
  },
  info: {
    container:
      'bg-surface-base/95 dark:bg-surface-raised/95 border-accent-info/40 text-ink-primary',
    icon: <Info size={20} weight="fill" className="text-accent-info shrink-0" />,
  },
};

export const FeedbackHost: React.FC = () => {
  const toasts = useFeedbackStore((s) => s.toasts);
  const dismissToast = useFeedbackStore((s) => s.dismissToast);
  const confirmDialog = useFeedbackStore((s) => s.confirmDialog);
  const resolveConfirm = useFeedbackStore((s) => s.resolveConfirm);

  return (
    <>
      {/* Toast Stack */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-[120] flex flex-col gap-2.5 w-[min(24rem,calc(100vw-2rem))] pointer-events-none"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => {
            const style = TOAST_STYLES[item.variant];
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                role="status"
                className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-xl shadow-lg ${style.container}`}
              >
                <div className="mt-0.5">{style.icon}</div>
                <div className="flex-1 min-w-0 text-xs leading-relaxed">
                  {item.title && (
                    <p className="font-bold text-ink-primary mb-0.5">{item.title}</p>
                  )}
                  <p className="text-ink-secondary break-words">{item.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(item.id)}
                  className="p-1 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                  aria-label="Đóng thông báo"
                >
                  <X size={14} weight="bold" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Global Confirm Dialog */}
      <ConfirmPopover
        isOpen={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ''}
        description={confirmDialog?.description}
        warningNote={confirmDialog?.warningNote}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={confirmDialog?.cancelLabel}
        variant={confirmDialog?.variant ?? 'warning'}
        onConfirm={() => resolveConfirm(true)}
        onCancel={() => resolveConfirm(false)}
      />
    </>
  );
};
