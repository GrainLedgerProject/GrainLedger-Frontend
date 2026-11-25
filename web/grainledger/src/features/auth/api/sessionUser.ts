import type { SessionUserDto } from "@/api/auth";
import { normalizeUserRole } from "@/shared/types/roles";
import type { UserProfile } from "@/shared/types/session";

export function isPendingUserAccess(
  user: UserProfile | null | undefined,
): boolean {
  return Boolean(user && (!user.isActive || user.hasAssignedRole === false));
}

export function toUserProfile(user: SessionUserDto): UserProfile {
  return {
    ...user,
    role: normalizeUserRole(user.role),
    hasAssignedRole: Boolean(user.role && user.role.trim().length > 0),
    phoneNumber: user.phoneNumber || undefined,
    organizationId: user.organizationId || undefined,
    organizationName: user.organizationName || undefined,
    permissions: user.permissions || [],
  };
}
