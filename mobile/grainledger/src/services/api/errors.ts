import { isAxiosError, isCancel } from 'axios';

/** Known fields from web src/api/client.ts; no assumed validation-error envelope. */
export interface ProblemDetails {
  type?: string | null;
  title?: string | null;
  status?: number | string | null;
  detail?: string | null;
  instance?: string | null;
}
export type ApiErrorCode = 'http' | 'network' | 'timeout' | 'cancelled' | 'configuration' | 'contract' |
  'auth' | 'expired' | 'inactive' | 'unknown';

/** Safe to expose to UI state: never retains Axios config, headers, request or raw body. */
export class ApiError extends Error {
  constructor(message: string, public status = 0, public code: ApiErrorCode = 'unknown', public problem?: ProblemDetails) {
    super(message);
    this.name = 'ApiError';
  }
  get retryable() { return this.code === 'network' || this.code === 'timeout' || this.status === 429 || this.status >= 500; }
}

export function readProblem(value: unknown): ProblemDetails | undefined {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return undefined; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const problem: ProblemDetails = {};
  for (const key of ['type', 'title', 'detail', 'instance'] as const) {
    if (source[key] === null || typeof source[key] === 'string') problem[key] = source[key];
  }
  if (source.status === null || typeof source.status === 'string' || typeof source.status === 'number') problem.status = source.status;
  return Object.keys(problem).length ? problem : undefined;
}

export function httpError(status: number, body: unknown) {
  const problem = readProblem(body);
  return new ApiError(problem?.detail || problem?.title || `The server rejected the request (${status}).`, status, 'http', problem);
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isCancel(error) || (error instanceof Error && error.name === 'AbortError')) {
    return new ApiError('The request was cancelled.', 0, 'cancelled');
  }
  if (isAxiosError(error)) {
    if (error.response) return httpError(error.response.status, error.response.data);
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') return new ApiError('The request timed out. Try again.', 0, 'timeout');
    return new ApiError('The server could not be reached. Check your connection and try again.', 0, 'network');
  }
  return new ApiError('The request could not be completed. Try again.', 0, 'unknown');
}
