import { configureApiSession } from "@/api/session";
import { useAuthStore } from "@/app/store/authStore";
import { selectSessionOwner } from "@/app/store/sessionOwner";
import { useUiStore } from "@/app/store/uiStore";
import { toUserProfile } from "@/features/auth/api/sessionUser";
import { COOKIE_KEYS, getCookie } from "@/shared/utils/cookies";

export function configureApplicationApi() {
  configureApiSession({
    read() {
      const state = useAuthStore.getState();
      return {
        version: state.sessionVersion,
        ownerKey: selectSessionOwner(state),
        accessToken: state.accessToken || getCookie(COOKIE_KEYS.ACCESS_TOKEN),
        refreshToken: state.refreshToken || getCookie(COOKIE_KEYS.REFRESH_TOKEN),
        cookieSession: state.cookieSession,
      };
    },
    apply(tokens) {
      const { setTokens, setUser } = useAuthStore.getState();
      setTokens(tokens.accessToken, tokens.refreshToken);
      if (tokens.user) setUser(toUserProfile(tokens.user));
    },
    expire: () => useAuthStore.getState().logout(),
    setConnected(connected) {
      const ui = useUiStore.getState();
      if (ui.isBackendConnected !== connected || (!connected && ui.isOnline)) {
        ui.setBackendConnected(connected);
      }
    },
  });
}
