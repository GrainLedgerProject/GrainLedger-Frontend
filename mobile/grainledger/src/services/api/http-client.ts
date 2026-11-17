import { create, AxiosHeaders } from 'axios';

import { normalizeOrigin } from './config';
import { ApiError, httpError, normalizeApiError } from './errors';

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
  signal?: AbortSignal;
  responseType?: 'json' | 'text' | 'blob';
};
type TransportOptions = { origin: string; allowHttp?: boolean; configurationError?: ApiError;
  timeoutMs?: number; fetcher?: typeof fetch };

/** Query behavior copied from web src/api/query.ts (empty values skipped; array keys repeated). */
function withQuery(path: string, values?: Record<string, unknown>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) value.forEach((item) => query.append(key, String(item)));
    else query.set(key, String(value));
  }
  const suffix = query.toString();
  return suffix ? `${path}${path.includes('?') ? '&' : '?'}${suffix}` : path;
}

export function createHttpClient(options: TransportOptions) {
  let origin = '';
  let configurationError = options.configurationError;
  try { if (!configurationError) origin = normalizeOrigin(options.origin, options.allowHttp); }
  catch (error) { configurationError = normalizeApiError(error); }
  const fetcher = options.fetcher ?? fetch;
  const instance = create({
    baseURL: origin, timeout: options.timeoutMs ?? 12_000,
    adapter: 'fetch', withCredentials: false, withXSRFToken: false,
    fetchOptions: { credentials: 'omit', redirect: 'error' },
    allowAbsoluteUrls: false, responseType: 'text', transformResponse: [(value: unknown) => value],
    validateStatus: () => true,
    // Enforce omission at the fetch boundary too, including runtimes without Request.credentials.
    env: { fetch: (input, init) => fetcher(input, { ...init, credentials: 'omit' }) },
  });

  async function request(path: string, init: ApiRequestOptions = {}, token?: string | null): Promise<unknown> {
    try {
      if (configurationError) throw configurationError;
      // Validate before bearer attachment. Reject absolute/protocol-relative, traversal and encoded path escapes.
      const pathname = path.split('?')[0];
      if (!path.startsWith('/api/') || /[\\#\s]/.test(path) || /%(?:2e|2f|5c)/i.test(pathname) || pathname.includes('..')) {
        throw new ApiError('Invalid API path.', 0, 'configuration');
      }
      const headers = new AxiosHeaders(init.headers);
      headers.delete('Cookie'); headers.delete('Authorization');
      headers.set('Accept', init.responseType === 'text' ? 'text/plain' : init.responseType === 'blob' ? '*/*' : 'application/json');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (typeof FormData !== 'undefined' && init.data instanceof FormData) headers.set('Content-Type', false);
      else if (init.data !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      const response = await instance.request<unknown>({ url: withQuery(path, init.query), method: init.method ?? 'GET',
        data: init.data, headers, signal: init.signal, responseType: init.responseType === 'blob' ? 'blob' : 'text' });
      let data = response.data;
      if (response.status < 200 || response.status >= 300) {
        if (data && typeof data === 'object' && 'text' in data && typeof data.text === 'function') data = await data.text();
        throw httpError(response.status, data);
      }
      if (response.status === 204 || response.status === 205 || data === '') return undefined;
      if (init.responseType === 'blob' || init.responseType === 'text') return data;
      if (!(String(response.headers['content-type'] ?? '').toLowerCase().includes('json')) || typeof data !== 'string') {
        throw new ApiError('The server returned a non-JSON response. Check the API origin and endpoint contract.', 0, 'contract');
      }
      try { return JSON.parse(data) as unknown; }
      catch { throw new ApiError('The server returned invalid JSON.', 0, 'contract'); }
    } catch (error) { throw normalizeApiError(error); }
  }
  return { origin, configurationError: configurationError?.message ?? null, request };
}

export type ApiClient = { request(path: string, options?: ApiRequestOptions): Promise<unknown> };
