import { create } from 'zustand';
import { currentOfflineOwnerKey } from '@/pwa/owner';

interface DraftState {
  drafts: Record<string, unknown>;
  saveDraft: (formKey: string, data: unknown) => void;
  getDraft: <T>(formKey: string) => T | null;
  clearDraft: (formKey: string) => void;
  hasDraft: (formKey: string) => boolean;
}

const STORAGE_PREFIX = 'grainledger_draft_';
const draftKey = (formKey: string) => {
  const ownerKey = currentOfflineOwnerKey();
  return ownerKey ? `${STORAGE_PREFIX}${ownerKey}:${formKey}` : null;
};

export const useDraftStore = create<DraftState>(() => ({
  drafts: {},

  saveDraft: (formKey, data) => {
    const key = draftKey(formKey);
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // ignore storage quota issues
    }
  },

  getDraft: <T>(formKey: string): T | null => {
    const key = draftKey(formKey);
    if (!key) return null;
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      return null;
    }
  },

  clearDraft: (formKey: string) => {
    const key = draftKey(formKey);
    if (key) localStorage.removeItem(key);
  },

  hasDraft: (formKey: string) => {
    const key = draftKey(formKey);
    return key ? !!localStorage.getItem(key) : false;
  },
}));
