import { authEndpoints } from '@/api/auth';
import { useAuthStore } from '@/app/store/authStore';
import { profileEndpoints } from '@/api/profile';
import type { UserProfile } from '@/shared/types/session';
import { toUserProfile } from './sessionUser';

export const authApi = {
  /**
   * Performs authentication exclusively against the backend API (POST /api/auth/login).
   * All accounts and JWT tokens are real identity credentials.
   */
  login: async (
    email: string,
    password: string
  ): Promise<{ user: UserProfile; tokens: { access: string; refresh: string } }> => {
    const tokens = await authEndpoints.login({ email, password });
    if (!tokens || !tokens.user) {
      throw new Error('Đăng nhập không thành công. Phản hồi từ máy chủ không hợp lệ.');
    }

    const access = tokens.accessToken || (tokens as unknown as { AccessToken: string }).AccessToken;
    const refresh = tokens.refreshToken || (tokens as unknown as { RefreshToken: string }).RefreshToken;

    if (!access || !refresh) {
      throw new Error('Máy chủ không trả về đầy đủ token xác thực và làm mới.');
    }

    return {
      user: toUserProfile(tokens.user),
      tokens: {
        access,
        refresh,
      },
    };
  },

  /**
   * Log out session
   */
  logout: async (allDevices = false): Promise<void> => {
    const { sessionVersion } = useAuthStore.getState();
    try {
      await (allDevices ? authEndpoints.logoutAll() : authEndpoints.logout());
    } catch (error) {
      if (allDevices) {
        throw error;
      }
      // Single-device logout always clears local state so offline/expired sessions are never trapped on the shell
    } finally {
      const current = useAuthStore.getState();
      if (current.sessionVersion === sessionVersion) current.logout();
    }
  },

  /**
   * Update Profile
   */
  updateProfile: async (payload: { displayName: string; phoneNumber?: string }): Promise<UserProfile> => {
    const updated = await profileEndpoints.updateProfile({
      displayName: payload.displayName,
      phoneNumber: payload.phoneNumber || null,
    });
    return toUserProfile(updated);
  },
};
