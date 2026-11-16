import { checkBackendHealth } from '@/api/health';
import i18n, { normalizeLanguage } from '@/app/i18n';
import { create } from 'zustand';

interface UiState {
  theme: 'light' | 'dark';
  language: 'vi' | 'en';
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  isSearchOpen: boolean;
  isNotificationsOpen: boolean;
  isOnline: boolean;
  isBackendConnected: boolean;
  isCheckingConnection: boolean;
  hasInitialChecked: boolean;
  pendingOfflineCount: number;
  procurementSyncMode: 'auto' | 'manual';
  isMinimalMode: boolean;

  // Actions
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: 'vi' | 'en') => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  setOnline: (online: boolean) => void;
  setBackendConnected: (connected: boolean) => void;
  setPendingOfflineCount: (count: number) => void;
  setProcurementSyncMode: (mode: 'auto' | 'manual') => void;
  setMinimalMode: (enabled: boolean) => void;
  checkConnection: (isInitial?: boolean) => Promise<boolean>;
}

// Read initial stored values
const savedTheme = localStorage.getItem('grainledger_theme');
const storedTheme: 'light' | 'dark' = savedTheme === 'light' || savedTheme === 'dark'
  ? savedTheme : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

function applyTheme(theme: 'light' | 'dark', override: boolean) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', override ? theme : 'light dark');
}

const storedCollapsed = localStorage.getItem('grainledger_sidebar_collapsed') === 'true';
const storedLang = normalizeLanguage(localStorage.getItem('grainledger_lang'));
const storedMinimalMode = localStorage.getItem('grainledger_minimal_mode') === 'true';

if (typeof document !== 'undefined') {
  document.documentElement.lang = storedLang;
  document.documentElement.dataset.minimalUi = String(storedMinimalMode);
}

// Apply initial theme class to HTML element
applyTheme(storedTheme, savedTheme === 'light' || savedTheme === 'dark');

export const useUiStore = create<UiState>((set, get) => ({
  theme: storedTheme,
  language: storedLang,
  isSidebarCollapsed: storedCollapsed,
  isMobileSidebarOpen: false,
  isSearchOpen: false,
  isNotificationsOpen: false,
  isOnline: navigator.onLine,
  isBackendConnected: false,
  isCheckingConnection: true,
  hasInitialChecked: false,
  pendingOfflineCount: 0,
  procurementSyncMode: localStorage.getItem('grainledger_procurement_sync_mode') === 'manual' ? 'manual' : 'auto',
  isMinimalMode: storedMinimalMode,
  setMinimalMode: (enabled) => {
    localStorage.setItem('grainledger_minimal_mode', String(enabled));
    document.documentElement.dataset.minimalUi = String(enabled);
    set({ isMinimalMode: enabled });
  },

  toggleTheme: () => {
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light';
      const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      if (next === system) localStorage.removeItem('grainledger_theme');
      else localStorage.setItem('grainledger_theme', next);
      applyTheme(next, next !== system);
      return { theme: next };
    });
  },

  setTheme: (theme) => {
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (theme === system) localStorage.removeItem('grainledger_theme');
    else localStorage.setItem('grainledger_theme', theme);
    applyTheme(theme, theme !== system);
    set({ theme });
  },

  setLanguage: (lang) => {
    localStorage.setItem('grainledger_lang', lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    void i18n.changeLanguage(lang);
    set({ language: lang });
  },

  toggleSidebar: () => {
    set((state) => {
      const next = !state.isSidebarCollapsed;
      localStorage.setItem('grainledger_sidebar_collapsed', String(next));
      return { isSidebarCollapsed: next };
    });
  },

  setSidebarCollapsed: (collapsed) => {
    localStorage.setItem('grainledger_sidebar_collapsed', String(collapsed));
    set({ isSidebarCollapsed: collapsed });
  },

  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  setNotificationsOpen: (open) => set({ isNotificationsOpen: open }),
  setOnline: (online) => set({ isOnline: online }),
  setBackendConnected: (connected) =>
    set({
      isBackendConnected: connected,
      isOnline: (typeof navigator !== 'undefined' ? navigator.onLine : true) && connected,
    }),
  setPendingOfflineCount: (count) => set({ pendingOfflineCount: count }),
  setProcurementSyncMode: (mode) => {
    localStorage.setItem('grainledger_procurement_sync_mode', mode);
    set({ procurementSyncMode: mode });
  },
  checkConnection: async (isInitial?: boolean): Promise<boolean> => {
    const isFirstCheck = isInitial || !get().hasInitialChecked;
    if (isFirstCheck && !get().isCheckingConnection) {
      set({ isCheckingConnection: true });
    }
    try {
      const connected = await checkBackendHealth();
      const online = (typeof navigator !== 'undefined' ? navigator.onLine : true) && connected;
      const current = get();
      if (
        isFirstCheck ||
        current.isBackendConnected !== connected ||
        current.isOnline !== online ||
        current.isCheckingConnection
      ) {
        set({
          isBackendConnected: connected,
          isOnline: online,
          hasInitialChecked: true,
          isCheckingConnection: false,
        });
      }
      return connected;
    } catch {
      const current = get();
      if (
        isFirstCheck ||
        current.isBackendConnected ||
        current.isOnline ||
        current.isCheckingConnection
      ) {
        set({
          isBackendConnected: false,
          isOnline: false,
          hasInitialChecked: true,
          isCheckingConnection: false,
        });
      }
      return false;
    }
  },
}));

// Listen to network online/offline events
window.addEventListener('online', () => void useUiStore.getState().checkConnection());
window.addEventListener('offline', () => {
  useUiStore.getState().setOnline(false);
  useUiStore.getState().setBackendConnected(false);
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  if (localStorage.getItem('grainledger_theme')) return;
  const theme = event.matches ? 'dark' : 'light';
  applyTheme(theme, false);
  useUiStore.setState({ theme });
});
window.addEventListener('storage', (event) => {
  if (event.key === 'grainledger_lang' || event.key === null) {
    void i18n.changeLanguage(normalizeLanguage(localStorage.getItem('grainledger_lang')));
  }
  if (event.key === 'grainledger_minimal_mode' || event.key === null) {
    const enabled = localStorage.getItem('grainledger_minimal_mode') === 'true';
    document.documentElement.dataset.minimalUi = String(enabled);
    useUiStore.setState({ isMinimalMode: enabled });
  }
  if (event.key !== 'grainledger_theme' && event.key !== null) return;
  const theme = event.newValue === 'light' || event.newValue === 'dark'
    ? event.newValue : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(theme, event.newValue === 'light' || event.newValue === 'dark');
  useUiStore.setState({ theme });
});

// Initial startup backend connectivity check
if (typeof window !== 'undefined') {
  void useUiStore.getState().checkConnection(true);
}

// Bidirectional synchronization when i18n changes language externally
i18n.on('languageChanged', (lng) => {
  const normalized = normalizeLanguage(lng);
  if (localStorage.getItem('grainledger_lang') !== normalized) {
    localStorage.setItem('grainledger_lang', normalized);
  }
  if (useUiStore.getState().language !== normalized) {
    useUiStore.setState({ language: normalized });
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized;
  }
});
