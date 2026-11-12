import { checkBackendHealth } from '@/api/health';
import i18n from '@/app/i18n';
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
  checkConnection: (isInitial?: boolean) => Promise<boolean>;
}

// Read initial stored values
const storedTheme = (localStorage.getItem('grainledger_theme') as 'light' | 'dark') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

const storedCollapsed = localStorage.getItem('grainledger_sidebar_collapsed') === 'true';
const storedLang = (localStorage.getItem('grainledger_lang') as 'vi' | 'en') || 'vi';

if (typeof document !== 'undefined') {
  document.documentElement.lang = storedLang;
}

// Apply initial theme class to HTML element
if (storedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

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

  toggleTheme: () => {
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('grainledger_theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: next };
    });
  },

  setTheme: (theme) => {
    localStorage.setItem('grainledger_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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

// Initial startup backend connectivity check
if (typeof window !== 'undefined') {
  void useUiStore.getState().checkConnection(true);
}

// Bidirectional synchronization when i18n changes language externally
i18n.on('languageChanged', (lng) => {
  const normalized = lng?.startsWith('en') ? 'en' : 'vi';
  if (useUiStore.getState().language !== normalized) {
    useUiStore.setState({ language: normalized });
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized;
  }
});
