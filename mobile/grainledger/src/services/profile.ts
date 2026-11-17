import { parseUser, type SessionUserDto } from '../features/auth/contracts';
import type { ApiClient } from './api/http-client';

/** Read-only example from web src/api/profile.ts. Profile editing remains a separate migration task. */
export function createProfileService(api: ApiClient) {
  return {
    async getProfile(signal?: AbortSignal): Promise<SessionUserDto> {
      return parseUser(await api.request('/api/profile', { signal }));
    },
  };
}
