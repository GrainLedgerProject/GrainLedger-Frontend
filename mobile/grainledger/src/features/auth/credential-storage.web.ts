import type { CredentialStorage } from './auth-client';

// Web preview uses only the controller's memory. Never downgrade tokens to localStorage/cookies.
export const persistentSignInAvailable = false;
export const credentialStorage: CredentialStorage = {
  read: async () => null,
  async write(value) { if (value !== null) throw new Error('Persistent sign-in is unavailable in the web preview.'); },
};
