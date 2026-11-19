import type { SessionUserDto } from "@/api/auth";
import { normalizeUserRole } from "@/shared/types/roles";
import type { UserProfile } from "@/shared/types/session";

export function toUserProfile(user: SessionUserDto): UserProfile {
  return {
    ...user,
    role: normalizeUserRole(user.role),
    phoneNumber: user.phoneNumber || undefined,
    organizationId: user.organizationId || undefined,
    organizationName: user.organizationName || undefined,
    permissions: user.permissions || [],
  };
}
