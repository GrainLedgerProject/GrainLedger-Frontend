// Contracts and endpoint definitions mirrored from web/grainledger/src/api/profile.ts.
import type { SessionUserDto } from './auth';
import type { ApiTransport } from './transport';

export interface UpdateProfileRequest {
  displayName: string;
  phoneNumber?: string | null;
}

export function createProfileEndpoints(apiFetch: ApiTransport) {
const profileEndpoints = {
  getProfile: () => apiFetch<SessionUserDto>('/api/profile'),
  updateProfile: (req: UpdateProfileRequest) =>
    apiFetch<SessionUserDto>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(req),
    }),
};

return { profileEndpoints };
}
