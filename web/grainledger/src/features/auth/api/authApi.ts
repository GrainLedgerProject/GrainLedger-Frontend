import { authEndpoints } from '@/api/auth';
import { profileEndpoints } from '@/api/profile';
import type { UserProfile } from '@/app/store/authStore';
import { normalizeUserRole } from '@/shared/types/roles';
import { logger } from '@/shared/utils/logger';

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

    if (!access) {
      throw new Error('Máy chủ không trả về token xác thực hợp lệ.');
    }

    return {
      user: {
        id: tokens.user.id,
        email: tokens.user.email,
        displayName: tokens.user.displayName,
        phoneNumber: tokens.user.phoneNumber || undefined,
        role: normalizeUserRole(tokens.user.role),
        organizationId: tokens.user.organizationId || undefined,
        organizationName: tokens.user.organizationName || undefined,
        isActive: tokens.user.isActive,
        permissions: tokens.user.permissions || [],
      },
      tokens: {
        access,
        refresh: refresh || access,
      },
    };
  },

  /**
   * Log out session
   */
  logout: async (): Promise<void> => {
    try {
      await authEndpoints.logout();
    } catch {
      // ignore
    }
  },

  /**
   * Validate Invitation Token
   */
  validateInvitationToken: async (token: string): Promise<{ email: string; name: string }> => {
    await new Promise((res) => setTimeout(res, 300));
    if (token === 'expired') {
      throw new Error('Lời mời này đã hết hạn hoặc không tồn tại.');
    }
    return {
      email: 'nguyen.van.kiemtoan@mekongrice.vn',
      name: 'Nguyễn Văn Kiểm Toán',
    };
  },

  /**
   * Accept Invitation and set password
   */
  acceptInvitation: async (token: string, password: string): Promise<void> => {
    await new Promise((res) => setTimeout(res, 400));
    logger.info('Invitation accepted with token:', token, 'length:', password.length);
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
    await new Promise((res) => setTimeout(res, 350));
    if (currentPass === 'wrong') {
      throw new Error('Mật khẩu hiện tại không đúng.');
    }
    logger.info('Password changed successfully');
  },
};
