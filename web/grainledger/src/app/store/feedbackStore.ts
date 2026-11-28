import i18n from '@/app/i18n';
import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  durationMs: number;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  warningNote?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

interface ActiveConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

interface FeedbackState {
  toasts: ToastItem[];
  confirmDialog: ActiveConfirm | null;
  pushToast: (toast: Omit<ToastItem, 'id' | 'durationMs'> & { durationMs?: number }) => string;
  dismissToast: (id: string) => void;
  openConfirm: (options: ConfirmOptions) => Promise<boolean>;
  resolveConfirm: (confirmed: boolean) => void;
}

let toastCounter = 0;

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  toasts: [],
  confirmDialog: null,

  pushToast: ({ variant, title, message, durationMs = 4200 }) => {
    const id = `toast-${Date.now()}-${++toastCounter}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-4), { id, variant, title, message, durationMs }],
    }));

    if (typeof window !== 'undefined' && durationMs > 0) {
      window.setTimeout(() => {
        get().dismissToast(id);
      }, durationMs);
    }

    return id;
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  openConfirm: (options) => {
    const current = get().confirmDialog;
    if (current) {
      current.resolve(false);
    }
    return new Promise<boolean>((resolve) => {
      set({
        confirmDialog: {
          ...options,
          resolve,
        },
      });
    });
  },

  resolveConfirm: (confirmed) => {
    const current = get().confirmDialog;
    if (current) {
      current.resolve(confirmed);
    }
    set({ confirmDialog: null });
  },
}));

/** Imperative toast helpers usable in both React components and non-React modules */
export const toast = {
  success: (message: string, title?: string, durationMs?: number) =>
    useFeedbackStore.getState().pushToast({ variant: 'success', title, message, durationMs }),
  error: (message: string, title?: string, durationMs?: number) =>
    useFeedbackStore.getState().pushToast({ variant: 'error', title, message, durationMs: durationMs ?? 5500 }),
  warning: (message: string, title?: string, durationMs?: number) =>
    useFeedbackStore.getState().pushToast({ variant: 'warning', title, message, durationMs }),
  info: (message: string, title?: string, durationMs?: number) =>
    useFeedbackStore.getState().pushToast({ variant: 'info', title, message, durationMs }),
};

/** Imperative async confirm dialog replacing window.confirm() */
export function confirmAction(options: ConfirmOptions | string): Promise<boolean> {
  if (typeof options === 'string') {
    return useFeedbackStore.getState().openConfirm({
      title: i18n.t('common.confirmTitle', 'Xác nhận thao tác'),
      description: options,
      variant: 'warning',
    });
  }
  return useFeedbackStore.getState().openConfirm(options);
}
