/** Existing mobile transport contract; no browser cookies or browser stores. */
export interface ApiResult<T> {
  data: T | null;
  error: string | null;
  isMock: boolean;
}

export type ApiTransport = <T>(endpoint: string, options?: RequestInit) => Promise<ApiResult<T>>;
