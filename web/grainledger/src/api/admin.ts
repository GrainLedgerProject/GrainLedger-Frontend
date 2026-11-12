import type * as ApiSchemas from './generated/schemas';
export type { CreateOrganizationRequest, UpdateAccessRequest } from './generated/schemas';
import { apiFetch } from './client';

export interface OrganizationDto {
  id: string;
  name: string;
  kind: 'Mill' | 'Customer';
  createdAt?: string;
}

export interface AdminUserDto {
  id: string;
  email: string;
  displayName?: string;
  role?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  isActive: boolean;
  etag?: string;
  updatedAt?: string;
}

export const adminEndpoints = {
  getRoles: () => apiFetch<unknown>('/api/admin/roles'),

  getOrganizations: () => apiFetch<unknown>('/api/admin/organizations'),
  createOrganization: (req: ApiSchemas.CreateOrganizationRequest) =>
    apiFetch<unknown>('/api/admin/organizations', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  getUsers: () => apiFetch<unknown>('/api/admin/users'),
  updateUserAccess: (id: string, ifMatchEtag: string, req: ApiSchemas.UpdateAccessRequest) =>
    apiFetch<unknown>(`/api/admin/users/${encodeURIComponent(id)}/access`, {
      method: 'PUT',
      headers: {
        'If-Match': ifMatchEtag,
      },
      body: JSON.stringify(req),
    }),
};
