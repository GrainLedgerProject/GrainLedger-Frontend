import type { UserRole } from '@/shared/types/roles';
import {
  clearAuthCookies,
  COOKIE_KEYS,
  deleteCookie,
  getCookie,
  setCookie,
} from '@/shared/utils/cookies';
import { extractUserProfileFromJwt, isJwtValidFormat } from '@/shared/utils/jwt';
import { create } from 'zustand';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
  organizationColor?: string;
  assignedFacilities?: string[];
  isActive: boolean;
  permissions: string[];
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasUnsavedDrafts: boolean;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setTokens: (access: string | null, refresh: string | null, rememberMe?: boolean) => void;
  setHasUnsavedDrafts: (hasDrafts: boolean) => void;
  loginSuccess: (user: UserProfile, tokens: { access: string; refresh: string }, rememberMe?: boolean) => void;
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

// Only authenticate if user profile exists AND a valid accessToken value is present
const isSessionAuthenticated = Boolean(
  initialUser &&
  resolvedAccess &&
  isJwtValidFormat(resolvedAccess)
);

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  accessToken: resolvedAccess,
  refreshToken: resolvedRefresh,
  isAuthenticated: isSessionAuthenticated,
  isLoading: false,
  hasUnsavedDrafts: false,

  setUser: (user) => {
    if (user) {
      setCookie(COOKIE_KEYS.USER, JSON.stringify(user), 30);
    } else {
      deleteCookie(COOKIE_KEYS.USER);
    }
    set((state) => ({
      user,
      isAuthenticated: Boolean(user && state.accessToken && isJwtValidFormat(state.accessToken)),
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
    setCookie(COOKIE_KEYS.USER, JSON.stringify(user), accessDays);
    setCookie(COOKIE_KEYS.ACCESS_TOKEN, access, accessDays);
    setCookie(COOKIE_KEYS.REFRESH_TOKEN, refresh, refreshDays);

    set({
      user,
      isAuthenticated: Boolean(user && access && isJwtValidFormat(access)),
      accessToken: access,
      refreshToken: refresh,
      isLoading: false,
    });
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

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasUnsavedDrafts: false,
    });
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
