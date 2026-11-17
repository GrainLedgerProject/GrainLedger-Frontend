/** Source: web src/api/auth.ts and shared/types/roles.ts. No browser-cookie imports. */
import { ApiError as AuthError } from '../../services/api/errors';
export { AuthError };
export interface SessionUserDto {
  id: string; email: string; displayName: string; phoneNumber: string | null;
  role: string | null; organizationId: string | null; organizationName: string | null;
  isActive: boolean; permissions: string[];
}
export interface IssuedTokens {
  accessToken: string; refreshToken: string; tokenType: string;
  expiresIn: number | string; user: SessionUserDto;
}
export const userRoles = ['MILL_ADMIN', 'MILL_MANAGER', 'MILL_OPERATOR', 'CUSTOMER_PROCUREMENT_OFFICER',
  'CUSTOMER_MANAGER', 'CUSTOMER_EXPORT_OFFICER', 'AUTHORIZED_STOCK_VIEWER'] as const;
export type UserRole = typeof userRoles[number];
export type AuthUser = SessionUserDto & { normalizedRole: UserRole };
const aliases: Record<string, UserRole> = {
  ADMINISTRATOR: 'MILL_ADMIN', MILLMANAGER: 'MILL_MANAGER', MILLOPERATOR: 'MILL_OPERATOR',
  PURCHASINGSTAFF: 'CUSTOMER_PROCUREMENT_OFFICER', PROCUREMENT: 'CUSTOMER_PROCUREMENT_OFFICER',
  CUSTOMERMANAGER: 'CUSTOMER_MANAGER', EXPORTSTAFF: 'CUSTOMER_EXPORT_OFFICER', EXPORT: 'CUSTOMER_EXPORT_OFFICER',
  STOCKVIEWER: 'AUTHORIZED_STOCK_VIEWER',
};
export function normalizeUserRole(raw: string | null): UserRole {
  const key = raw?.toUpperCase() ?? '';
  return userRoles.find((role) => role === key) ?? aliases[key] ?? 'AUTHORIZED_STOCK_VIEWER';
}
export function hasRole(user: AuthUser | null, allowed: readonly UserRole[] = userRoles): boolean {
  return Boolean(user?.isActive && allowed.includes(user.normalizedRole));
}
export function hasAnyPermission(user: AuthUser | null, permissions: readonly string[]) {
  return Boolean(user?.isActive && permissions.some((permission) => user.permissions.includes(permission)));
}
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
export function parseUser(value: unknown): AuthUser {
  if (!record(value) || !['id', 'email', 'displayName'].every((key) => typeof value[key] === 'string') ||
    !value.id || !value.email ||
    !['phoneNumber', 'role', 'organizationId', 'organizationName'].every((key) => value[key] === null || typeof value[key] === 'string') ||
    typeof value.isActive !== 'boolean' || !Array.isArray(value.permissions) || !value.permissions.every((item) => typeof item === 'string')) {
    throw new AuthError('The server returned an unsupported user response.', 0, 'contract');
  }
  const user = value as unknown as SessionUserDto;
  if (!user.isActive) throw new AuthError('This account is inactive. Contact your administrator.', 403, 'inactive');
  return { ...user, normalizedRole: normalizeUserRole(user.role) };
}
export function accessExpiry(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => !part)) throw new Error();
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload: unknown = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    if (!record(payload) || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) throw new Error();
    const expiresAt = payload.exp * 1000;
    if (!Number.isFinite(expiresAt)) throw new Error();
    return expiresAt;
  } catch { throw new AuthError('The server did not return a supported JWT access token.', 0, 'contract'); }
}
export function parseTokens(value: unknown): IssuedTokens & { user: AuthUser; expiresAt: number } {
  if (!record(value)) throw new AuthError('The server returned an unsupported token response.', 0, 'contract');
  // The web adapter also accepts legacy PascalCase token keys; cookie-only responses never qualify.
  const accessToken = value.accessToken ?? value.AccessToken;
  const refreshToken = value.refreshToken ?? value.RefreshToken;
  if (typeof accessToken !== 'string' || !accessToken || typeof refreshToken !== 'string' || !refreshToken ||
    typeof value.tokenType !== 'string' || value.tokenType.toLowerCase() !== 'bearer' ||
    !(typeof value.expiresIn === 'number' || typeof value.expiresIn === 'string')) {
    throw new AuthError('This server did not issue the explicit bearer tokens required by mobile sign-in. A cookie-only session is not supported here.', 0, 'contract');
  }
  const expiresAt = accessExpiry(accessToken);
  if (expiresAt <= Date.now() + 15_000) throw new AuthError('The issued session has already expired. Check the device clock and sign in again.', 401, 'expired');
  return { accessToken, refreshToken, tokenType: value.tokenType, expiresIn: value.expiresIn,
    user: parseUser(value.user), expiresAt };
}
export function safeReturnPath(value: unknown): '/home' | '/stock' | '/settings/profile' {
  return value === '/stock' || value === '/settings/profile' ? value : '/home';
}
export function validateLogin(email: string, password: string) {
  return { email: !email.trim() ? 'Enter your email.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Enter a valid email.' : undefined,
    password: password.length < 8 ? 'Use at least 8 characters.' : undefined };
}
