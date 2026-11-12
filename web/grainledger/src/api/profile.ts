import type * as ApiSchemas from './generated/schemas';
export type { UpdateProfileRequest } from './generated/schemas';
import type { SessionUserDto } from './auth';
import { apiFetch } from './client';

export const profileEndpoints = {
  getProfile: () => apiFetch<SessionUserDto>('/api/profile'),
  updateProfile: (req: ApiSchemas.UpdateProfileRequest) =>
    apiFetch<SessionUserDto>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(req),
    }),
};
