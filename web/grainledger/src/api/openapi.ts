import { apiFetch } from './client';
import { apiManifest } from './generated/manifest';
import type { ApiOperation, ApiOperations } from './generated/operations';
import type { ApiResponseOverrides } from './contracts';

export type { ApiOperation, ApiOperations } from './generated/operations';
export type ApiRequest<K extends ApiOperation> = ApiOperations[K]['request'];
export type ApiResponse<K extends ApiOperation> = K extends keyof ApiResponseOverrides
  ? ApiResponseOverrides[K] : ApiOperations[K]['response'];
export type ApiErrors<K extends ApiOperation> = ApiOperations[K]['errors'];

type RequestOptions<K extends ApiOperation> = ApiRequest<K> & {
  signal?: AbortSignal;
};
type RequestArguments<K extends ApiOperation> = object extends ApiRequest<K>
  ? [options?: RequestOptions<K>]
  : [options: RequestOptions<K>];

interface Parameter {
  name: string;
  required: boolean;
  explode?: boolean;
}
interface ManifestOperation {
  method: string;
  path: string;
  pathParams?: readonly Parameter[];
  query?: readonly Parameter[];
  headers?: readonly Parameter[];
  hasBody: boolean;
  bodyRequired: boolean;
  redirect: boolean;
}
interface RuntimeOptions {
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: unknown;
  signal?: AbortSignal;
}

function requiredValue(value: unknown, parameter: Parameter) {
  if (parameter.required && (value === undefined || value === null || value === '')) {
    throw new TypeError(`Missing required API parameter: ${parameter.name}`);
  }
}

/** Builds only paths from the checked-in specification; never accepts an arbitrary URL. */
export function buildApiRequest<K extends ApiOperation>(
  operation: K,
  ...args: RequestArguments<K>
): { url: string; init: RequestInit } {
  const entry = apiManifest[operation];
  const definition: ManifestOperation = entry;
  const options = (args[0] ?? {}) as RuntimeOptions;
  const urlPath = definition.path.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const value = options.path?.[name];
    requiredValue(value, { name, required: true });
    return encodeURIComponent(String(value));
  });
  const query = new URLSearchParams();
  for (const parameter of definition.query ?? []) {
    const value = options.query?.[parameter.name];
    requiredValue(value, parameter);
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (parameter.explode) value.forEach(item => query.append(parameter.name, String(item)));
      else query.set(parameter.name, value.join(','));
    } else query.set(parameter.name, String(value));
  }
  const headers = new Headers();
  for (const parameter of definition.headers ?? []) {
    const value = options.headers?.[parameter.name];
    requiredValue(value, parameter);
    if (value !== undefined && value !== null) headers.set(parameter.name, String(value));
  }
  if (definition.bodyRequired && options.body === undefined) {
    throw new TypeError(`Missing required API body: ${operation}`);
  }
  return {
    url: `${urlPath}${query.size ? `?${query}` : ''}`,
    init: {
      method: definition.method,
      headers,
      ...(definition.hasBody && options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    },
  };
}

/** All documented operations share authentication, refresh, and error handling. */
export function requestApi<K extends ApiOperation>(operation: K, ...args: RequestArguments<K>): Promise<ApiResponse<K>> {
  const { url, init } = buildApiRequest(operation, ...args);
  if (apiManifest[operation].redirect) {
    throw new TypeError('Use authEndpoints.loginGoogle/googleComplete for browser redirects.');
  }
  return apiFetch<ApiResponse<K>>(url, init);
}
