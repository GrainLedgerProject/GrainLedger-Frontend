// Dashboard labels copied from web role definitions; no workspace routes added.
import type { UserRole } from '../../auth/contracts';
export { normalizeUserRole } from '../../auth/contracts';
export type { UserRole } from '../../auth/contracts';
export const ROLE_DEFINITIONS: Record<UserRole, { labelVi: string; labelEn: string }> = {
  "MILL_ADMIN": {
    "labelVi": "Quản trị nhà máy",
    "labelEn": "Mill Administrator"
  },
  "MILL_MANAGER": {
    "labelVi": "Quản lý nhà máy",
    "labelEn": "Mill Manager"
  },
  "MILL_OPERATOR": {
    "labelVi": "Nhân viên vận hành",
    "labelEn": "Mill Operator"
  },
  "CUSTOMER_PROCUREMENT_OFFICER": {
    "labelVi": "Nhân viên thu mua",
    "labelEn": "Procurement Officer"
  },
  "CUSTOMER_MANAGER": {
    "labelVi": "Quản lý khách hàng",
    "labelEn": "Customer Manager"
  },
  "CUSTOMER_EXPORT_OFFICER": {
    "labelVi": "Nhân viên xuất khẩu",
    "labelEn": "Export Officer"
  },
  "AUTHORIZED_STOCK_VIEWER": {
    "labelVi": "Người xem tồn kho",
    "labelEn": "Stock Viewer"
  }
};
