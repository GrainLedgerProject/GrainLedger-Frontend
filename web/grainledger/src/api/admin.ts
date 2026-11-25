import { apiFetch } from "./client";

export interface OrganizationDto {
  id: string;
  name: string;
  kind: "Mill" | "Customer";
}

export interface AdminUserDto {
  id: string;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  role: string | null;
  organizationId: string | null;
  organizationName: string | null;
  isActive: boolean;
  etag: string;
}

export const adminEndpoints = {
  getRoles: () => apiFetch<AdminRoleDto[]>("/api/admin/roles"),

  getOrganizations: () =>
    apiFetch<OrganizationDto[]>("/api/admin/organizations"),
  createOrganization: (req: CreateOrganizationRequest) =>
    apiFetch<OrganizationDto>("/api/admin/organizations", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  getUsers: () => apiFetch<AdminUserDto[]>("/api/admin/users"),
  updateUserAccess: (
    id: string,
    ifMatchEtag: string,
    req: UpdateAccessRequest,
  ) =>
    apiFetch<unknown>(`/api/admin/users/${encodeURIComponent(id)}/access`, {
      method: "PUT",
      headers: {
        "If-Match": ifMatchEtag,
      },
      body: JSON.stringify(req),
    }),
};

export interface CreateOrganizationRequest {
  name: string;
  kind: OrganizationKind;
}

export type OrganizationKind = "Mill" | "Customer";

export interface AdminRoleDto {
  name: string;
  organizationKind: OrganizationKind;
}

export interface UpdateAccessRequest {
  role: null | string;
  organizationId: null | string;
  isActive: boolean;
}
