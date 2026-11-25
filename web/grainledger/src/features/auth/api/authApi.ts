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
    await (allDevices ? authEndpoints.logoutAll() : authEndpoints.logout());
    const current = useAuthStore.getState();
    if (current.sessionVersion === sessionVersion) current.logout();
  },

  /**
   * Validate Invitation Token
   */
  validateInvitationToken: async (token: string): Promise<{ email: string; name: string }> => {
    void token;
    throw new Error('Máy chủ chưa hỗ trợ xác nhận lời mời trên web. Vui lòng liên hệ quản trị viên.');
  },

  /**
   * Accept Invitation and set password
   */
  acceptInvitation: async (token: string, password: string): Promise<void> => {
    void token;
    void password;
    throw new Error('Máy chủ chưa hỗ trợ chấp nhận lời mời trên web.');
  },

  /**
   * Update Profile
   */
  updateProfile: async (payload: { displayName: string; phoneNumber?: string }): Promise<void> => {
    await profileEndpoints.updateProfile({
      displayName: payload.displayName,
      phoneNumber: payload.phoneNumber || null,
    });
  },

  /**
   * Change Password
   */
  changePassword: async (currentPass: string, newPass: string): Promise<void> => {
    void currentPass;
    void newPass;
    throw new Error('Máy chủ chưa hỗ trợ đổi mật khẩu khi đang đăng nhập. Hãy dùng chức năng quên mật khẩu.');
  },
};
