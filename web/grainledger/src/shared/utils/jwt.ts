import type { UserProfile } from "@/app/store/authStore";
import { normalizeUserRole } from "@/shared/types/roles";

/**
 * Safely decodes base64url-encoded payload of a standard JWT.
 * Returns null if token is null, malformed, or not a valid 3-part JWT.
 */
export function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
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

    const payload: unknown = JSON.parse(jsonPayload);
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload as Record<string, unknown> : null;
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
  if (!payload || typeof payload.exp !== "number") return true;

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

  const claim = (...keys: string[]) => keys.map((key) => payload[key]).find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  const id = claim("sub", "nameid", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier", "id");
  const rawRole = claim("role", "Role", "http://schemas.microsoft.com/ws/2008/06/identity/claims/role");
  if (!id || !rawRole) return null;

  const email = claim("email", "upn", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress") || "";

  const displayName = claim("name", "displayName", "unique_name", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name") || email || id;

  const role = normalizeUserRole(rawRole);

  const organizationId = claim("organizationId", "OrganizationId", "orgId");

  const organizationName = claim("organizationName", "OrganizationName", "orgName");

  const permissions = Array.isArray(payload.permissions)
    ? payload.permissions.filter((item): item is string => typeof item === "string")
    : Array.isArray(payload.permission)
      ? payload.permission.filter((item): item is string => typeof item === "string")
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
