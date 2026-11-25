import type { UserProfile } from '@/shared/types/session';
export type { UserProfile } from '@/shared/types/session';
import {
  clearAuthCookies,
  COOKIE_KEYS,
  deleteCookie,
  getCookie,
  setCookie,
} from '@/shared/utils/cookies';
import { extractUserProfileFromJwt, isJwtValidFormat } from '@/shared/utils/jwt';
import { configurePendingCommandScope } from '@/shared/hooks/pendingCommandStore';
import { create } from 'zustand';

interface AuthState {
  sessionVersion: number;
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  cookieSession: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasUnsavedDrafts: boolean;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setTokens: (access: string | null, refresh: string | null, rememberMe?: boolean) => void;
  setHasUnsavedDrafts: (hasDrafts: boolean) => void;
  loginSuccess: (user: UserProfile, tokens: { access: string; refresh: string }, rememberMe?: boolean) => void;
  restoreBrowserSession: (user: UserProfile) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

// Immediate cleanup of any legacy auth data from localStorage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('grainledger_user');
    localStorage.removeItem('grainledger_access_token');
    localStorage.removeItem('grainledger_refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth');
  } catch {
    // Ignore restricted local storage environments
  }
}

// Initial state: load user and tokens exclusively from cookies
const parseUserFromCookie = (): UserProfile | null => {
  const cookieStr = getCookie(COOKIE_KEYS.USER);
  if (!cookieStr) return null;
  try {
    return JSON.parse(cookieStr) as UserProfile;
  } catch {
    return null;
  }
};

const initialAccessCookie = getCookie(COOKIE_KEYS.ACCESS_TOKEN);
const initialRefreshCookie = getCookie(COOKIE_KEYS.REFRESH_TOKEN);

let initialUser = parseUserFromCookie();

// If user cookie is absent but we have a valid JWT access token, extract user from JWT claims
if (!initialUser && initialAccessCookie && isJwtValidFormat(initialAccessCookie)) {
  const jwtUser = extractUserProfileFromJwt(initialAccessCookie);
  if (jwtUser) {
    initialUser = jwtUser;
    setCookie(COOKIE_KEYS.USER, JSON.stringify(jwtUser), 30);
  }
}

const resolvedAccess = initialAccessCookie || null;
const resolvedRefresh = initialRefreshCookie || null;
const restoreOnLoad = Boolean(getCookie(COOKIE_KEYS.USER_SESSION)) ||
  (typeof window !== "undefined" && window.location.pathname === "/sign-in" &&
    new URLSearchParams(window.location.search).get("google") === "complete");

// Only authenticate if user profile exists AND a valid accessToken value is present
const isSessionAuthenticated = Boolean(
  initialUser &&
  resolvedAccess &&
  isJwtValidFormat(resolvedAccess)
);

export const useAuthStore = create<AuthState>((set) => ({
  sessionVersion: 0,
  user: initialUser,
  accessToken: resolvedAccess,
  refreshToken: resolvedRefresh,
  cookieSession: false,
  isAuthenticated: isSessionAuthenticated,
  isLoading: restoreOnLoad,
  hasUnsavedDrafts: false,

  setUser: (user) => {
    if (user) {
      setCookie(COOKIE_KEYS.USER, JSON.stringify(user), 30);
    } else {
      deleteCookie(COOKIE_KEYS.USER);
    }
    set((state) => ({
      user,
      isAuthenticated: Boolean(user && (state.cookieSession || (state.accessToken && isJwtValidFormat(state.accessToken)))),
    }));
  },

  setTokens: (access, refresh, rememberMe = true) => {
    const accessDays = rememberMe ? 30 : 7;
    const refreshDays = 30;

    if (access) {
      setCookie(COOKIE_KEYS.ACCESS_TOKEN, access, accessDays);
    } else {
      deleteCookie(COOKIE_KEYS.ACCESS_TOKEN);
    }

    if (refresh) {
      setCookie(COOKIE_KEYS.REFRESH_TOKEN, refresh, refreshDays);
    } else {
      deleteCookie(COOKIE_KEYS.REFRESH_TOKEN);
    }

    set((state) => ({
      accessToken: access,
      refreshToken: refresh,
      isAuthenticated: Boolean(state.user && access && isJwtValidFormat(access)),
    }));
  },

  setHasUnsavedDrafts: (hasDrafts) => set({ hasUnsavedDrafts: hasDrafts }),

  loginSuccess: (user, tokens, rememberMe = true) => {
    const access = tokens.access;
    const refresh = tokens.refresh;

    const accessDays = rememberMe ? 30 : 7;
    const refreshDays = 30;

    // Store exclusively in Cookies
    deleteCookie(COOKIE_KEYS.USER_SESSION);
    setCookie(COOKIE_KEYS.USER, JSON.stringify(user), accessDays);
    setCookie(COOKIE_KEYS.ACCESS_TOKEN, access, accessDays);
    setCookie(COOKIE_KEYS.REFRESH_TOKEN, refresh, refreshDays);

    set((state) => ({
      sessionVersion: state.sessionVersion + 1,
      user,
      isAuthenticated: Boolean(user && access && isJwtValidFormat(access)),
      accessToken: access,
      refreshToken: refresh,
      cookieSession: false,
      isLoading: false,
    }));
  },

  restoreBrowserSession: (user) => {
    clearAuthCookies();
    setCookie(COOKIE_KEYS.USER_SESSION, "1", 1);
    set(state => ({
      sessionVersion: state.sessionVersion + 1,
      user,
      accessToken: null,
      refreshToken: null,
      cookieSession: true,
      isAuthenticated: true,
      isLoading: false,
    }));
  },

  logout: () => {
    // Clear cookies
    clearAuthCookies();

    // Complete cleanup of any lingering localStorage tokens
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('grainledger_user');
        localStorage.removeItem('grainledger_access_token');
        localStorage.removeItem('grainledger_refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth');
      } catch {
        // ignore
      }
    }

    set((state) => ({
      sessionVersion: state.sessionVersion + 1,
      user: null,
      accessToken: null,
      refreshToken: null,
      cookieSession: false,
      isAuthenticated: false,
      isLoading: false,
      hasUnsavedDrafts: false,
    }));
  },

  updateProfile: (updates) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...updates };
      setCookie(COOKIE_KEYS.USER, JSON.stringify(updatedUser), 30);
      return { user: updatedUser };
    });
  },
}));

configurePendingCommandScope(
  () => {
    const user = useAuthStore.getState().user;
    return user ? `${user.organizationId ?? 'none'}:${user.id}` : null;
  },
  (onChange) => useAuthStore.subscribe(onChange),
);
