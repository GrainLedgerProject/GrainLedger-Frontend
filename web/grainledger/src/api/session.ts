import type { IssuedTokens } from "./auth";

export interface ApiSession {
  version: number;
  ownerKey: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  cookieSession?: boolean;
}

interface ApiSessionAdapter {
  read(): ApiSession;
  apply(tokens: IssuedTokens): void;
  expire(): void;
  setConnected(connected: boolean): void;
}

const anonymous: ApiSession = { version: 0, ownerKey: null, accessToken: null, refreshToken: null };

export let apiSession: ApiSessionAdapter = {
  read: () => anonymous,
  apply: () => {},
  expire: () => {},
  setConnected: () => {},
};

export function configureApiSession(adapter: ApiSessionAdapter) {
  apiSession = adapter;
}
