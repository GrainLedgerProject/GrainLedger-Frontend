import type { UserProfile } from "@/app/store/authStore";
import { normalizeUserRole } from "@/shared/types/roles";

/**
 * Safely decodes base64url-encoded payload of a standard JWT.
 * Returns null if token is null, malformed, or not a valid 3-part JWT.
 */
export function decodeJwtPayload(token: string | null): Record<string, any> | null {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Checks if a token is a structurally valid 3-part JWT string.
 */
export function isJwtValidFormat(token: string | null): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

/**
 * Check if a JWT is expired or within bufferSeconds of expiring.
 * Returns true if token is missing or expired, false if valid.
 */
export function isJwtExpired(token: string | null, bufferSeconds = 15): boolean {
  if (!token) return true;

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;

  return Date.now() >= payload.exp * 1000 - bufferSeconds * 1000;
}

/**
 * Reconstructs a UserProfile from the claims in a real backend JWT token.
 * Handles standard OIDC claims, ASP.NET Core Identity claims, and custom claims.
 */
export function extractUserProfileFromJwt(token: string | null): UserProfile | null {
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const id =
    payload.sub ||
    payload.nameid ||
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
    payload.id ||
    `user-${Date.now()}`;

  const email =
    payload.email ||
    payload.upn ||
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ||
    "user@grainledger.local";

  const displayName =
    payload.name ||
    payload.displayName ||
    payload.unique_name ||
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
    email.split("@")[0] ||
    "Người dùng";

  const rawRole =
    payload.role ||
    payload.Role ||
    payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    "CUSTOMER_PROCUREMENT_OFFICER";

  const role = normalizeUserRole(rawRole);

  const organizationId =
    payload.organizationId ||
    payload.OrganizationId ||
    payload.orgId ||
    undefined;

  const organizationName =
    payload.organizationName ||
    payload.OrganizationName ||
    payload.orgName ||
    undefined;

  const permissions = Array.isArray(payload.permissions)
    ? payload.permissions
    : Array.isArray(payload.permission)
      ? payload.permission
      : [];

  return {
    id,
    email,
    displayName,
    role,
    organizationId,
    organizationName,
    isActive: true,
    permissions,
  };
}
