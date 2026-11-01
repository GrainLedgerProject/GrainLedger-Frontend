import type { AdminUserDto, OrganizationDto, UpdateAccessRequest } from './endpoints/admin';
import type { ApiResult } from './endpoints/transport';

export function requireResult<T>(result: ApiResult<T>): T | null {
  if (result.error || result.isMock) {
    if (/^HTTP 412\b/.test(result.error ?? '')) throw new Error('Hồ sơ đã thay đổi. Vui lòng tải lại dữ liệu trước khi lưu.');
    if (/^HTTP 403\b/.test(result.error ?? '')) throw new Error('Bạn chưa có quyền thực hiện thao tác này.');
    if (/^HTTP 401\b/.test(result.error ?? '')) throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
    throw new Error(result.error || 'Không thể kết nối máy chủ.');
  }
  return result.data;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseManagementList<T>(value: unknown, guard: (item: unknown) => item is T): T[] {
  const items: unknown = Array.isArray(value) ? value : isRecord(value) ? value.items : undefined;
  if (!Array.isArray(items) || !items.every(guard)) throw new Error('Danh sách từ máy chủ không đúng định dạng.');
  return items;
}

function optionalText(value: unknown): boolean { return value === undefined || value === null || typeof value === 'string'; }

export function isOrganization(value: unknown): value is OrganizationDto {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string'
    && (value.kind === 'Mill' || value.kind === 'Customer');
}

export function isAdminUser(value: unknown): value is AdminUserDto {
  return isRecord(value) && typeof value.id === 'string' && typeof value.email === 'string'
    && typeof value.isActive === 'boolean' && optionalText(value.role) && optionalText(value.organizationId)
    && optionalText(value.organizationName) && (value.displayName === undefined || typeof value.displayName === 'string')
    && (value.etag === undefined || typeof value.etag === 'string');
}

export function buildAccessUpdate(user: AdminUserDto, role: string, organizationId: string, isActive: boolean): { etag: string; request: UpdateAccessRequest } {
  if (!user.etag?.trim()) throw new Error('Hồ sơ chưa có phiên bản để cập nhật an toàn. Vui lòng tải lại danh sách.');
  return { etag: user.etag, request: { role: role || null, organizationId: organizationId || null, isActive } };
}

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  quantityKind?: string;
  unit?: string;
}

export function isCatalogItem(value: unknown): value is CatalogItem {
  return isRecord(value) && typeof value.id === 'string' && typeof value.code === 'string'
    && typeof value.name === 'string' && (value.quantityKind === undefined || typeof value.quantityKind === 'string')
    && (value.unit === undefined || typeof value.unit === 'string');
}

export type CatalogKind = 'commodities' | 'units' | 'substances' | 'markets' | 'varieties' | 'attributes';

export function catalogPayload(kind: CatalogKind, creating: boolean, code: string, name: string, extra: string): { name: string; code?: string; quantityKind?: string; unit?: string } {
  if (!name.trim() || (creating && !code.trim())) throw new Error('Vui lòng nhập mã và tên danh mục.');
  if (kind === 'units') return { code: code.trim(), name: name.trim(), quantityKind: extra.trim() || 'MASS' };
  if (kind === 'attributes') return { code: code.trim(), name: name.trim(), unit: extra.trim() || '%' };
  return creating ? { code: code.trim(), name: name.trim() } : { name: name.trim() };
}
