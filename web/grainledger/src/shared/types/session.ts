import type { UserRole } from './roles';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  role: UserRole;
  hasAssignedRole?: boolean;
  organizationId?: string;
  organizationName?: string;
  organizationColor?: string;
  assignedFacilities?: string[];
  isActive: boolean;
  permissions: string[];
}
