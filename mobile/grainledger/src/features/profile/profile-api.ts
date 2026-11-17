import { parseUser, type AuthUser, type UserRole } from '../auth/contracts';
import { AuthError } from '../auth/contracts';
import type { ApiClient } from '../../services/api/http-client';

export interface UpdateProfilePayload {
  displayName: string;
  phoneNumber?: string | null;
}

export interface ProfileValidationErrors {
  displayName?: 'required' | 'too_short' | 'too_long';
  phoneNumber?: 'format' | 'too_long';
}

export const PHONE_REGEX = /^[0-9+() -]{9,15}$/;

export function validateProfile(values: { displayName: string; phoneNumber?: string | null }): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};
  const name = values.displayName.trim();
  if (!name) {
    errors.displayName = 'required';
  } else if (name.length < 2) {
    errors.displayName = 'too_short';
  } else if (name.length > 120) {
    errors.displayName = 'too_long';
  }

  if (values.phoneNumber) {
    const phone = values.phoneNumber.trim();
    if (phone) {
      if (phone.length > 32) {
        errors.phoneNumber = 'too_long';
      } else if (!PHONE_REGEX.test(phone)) {
        errors.phoneNumber = 'format';
      }
    }
  }
  return errors;
}

export interface RoleInfo {
  code: string;
  labelVi: string;
  labelEn: string;
  side: 'MILL' | 'CUSTOMER' | 'QUALIFIED_ACCESS';
  descriptionVi: string;
}

export const ROLE_DETAILS: Record<UserRole, RoleInfo> = {
  MILL_ADMIN: {
    code: 'MA',
    labelVi: 'Quản trị nhà máy',
    labelEn: 'Mill Administrator',
    side: 'MILL',
    descriptionVi: 'Quản lý khách hàng, tài khoản, silo, dây chuyền và bảng MRL',
  },
  MILL_MANAGER: {
    code: 'MM',
    labelVi: 'Quản lý nhà máy',
    labelEn: 'Mill Manager',
    side: 'MILL',
    descriptionVi: 'Xác minh đối soát, dung sai đo lường, cách ly và xử lý lệnh HOLD',
  },
  MILL_OPERATOR: {
    code: 'MO',
    labelVi: 'Nhân viên vận hành',
    labelEn: 'Mill Operator',
    side: 'MILL',
    descriptionVi: 'Ghi bước chế biến (sấy, xay, trộn, đóng bao, hao hụt)',
  },
  CUSTOMER_PROCUREMENT_OFFICER: {
    code: 'PO',
    labelVi: 'Nhân viên thu mua',
    labelEn: 'Procurement Officer',
    side: 'CUSTOMER',
    descriptionVi: 'Đăng ký nông hộ, thửa ruộng, khai báo thuốc và thu mua lúa',
  },
  CUSTOMER_MANAGER: {
    code: 'CM',
    labelVi: 'Quản lý khách hàng',
    labelEn: 'Customer Manager',
    side: 'CUSTOMER',
    descriptionVi: 'Duyệt phương án phối trộn, đăng ký kết quả lab, phát lệnh HOLD và truy vết',
  },
  CUSTOMER_EXPORT_OFFICER: {
    code: 'EO',
    labelVi: 'Nhân viên xuất khẩu',
    labelEn: 'Export Officer',
    side: 'CUSTOMER',
    descriptionVi: 'Tạo đơn xuất khẩu, yêu cầu phương án, giám sát xếp container và đóng niêm',
  },
  AUTHORIZED_STOCK_VIEWER: {
    code: 'SV',
    labelVi: 'Người xem tồn kho',
    labelEn: 'Stock Viewer',
    side: 'QUALIFIED_ACCESS',
    descriptionVi: 'Quyền xem tồn kho định danh theo vị trí và thành phần nguồn gốc',
  },
};

export function createProfileService(api: ApiClient) {
  return {
    async getProfile(signal?: AbortSignal): Promise<AuthUser> {
      const raw = await api.request('/api/profile', { signal });
      return parseUser(raw);
    },

    async updateProfile(payload: UpdateProfilePayload, signal?: AbortSignal): Promise<AuthUser> {
      const errors = validateProfile(payload);
      if (errors.displayName || errors.phoneNumber) {
        throw new AuthError('Dữ liệu hồ sơ không hợp lệ.', 400, 'contract');
      }
      const raw = await api.request('/api/profile', {
        method: 'PUT',
        data: {
          displayName: payload.displayName.trim(),
          phoneNumber: payload.phoneNumber && payload.phoneNumber.trim() ? payload.phoneNumber.trim() : null,
        },
        signal,
      });
      return parseUser(raw);
    },
  };
}
