import { ApiError } from './errors';

export type ApiEnvironment = 'development' | 'staging' | 'production';
type ConfigurationInput = { isDevelopment: boolean; environment?: string; baseUrl?: string;
  developmentUrl?: string; stagingUrl?: string; productionUrl?: string };

export function normalizeOrigin(value: string, allowHttp = false) {
  try {
    const url = new URL(value.trim());
    if ((url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) || url.username || url.password ||
      url.search || url.hash || !['', '/'].includes(url.pathname)) throw new Error();
    return url.origin;
  } catch { throw new ApiError('The API server origin is missing or invalid. Configure a reachable backend origin without /api.', 0, 'configuration'); }
}

/** Explicit override wins; otherwise select only the requested environment. No cross-environment fallback. */
export function resolveApiConfiguration(input: ConfigurationInput) {
  const environment = input.environment?.trim() || (input.isDevelopment ? 'development' : 'production');
  try {
    if (!['development', 'staging', 'production'].includes(environment)) throw new ApiError('The API environment must be development, staging or production.', 0, 'configuration');
    const origins = { development: input.developmentUrl, staging: input.stagingUrl, production: input.productionUrl };
    const allowHttp = input.isDevelopment && environment === 'development';
    const origin = normalizeOrigin(input.baseUrl?.trim() || origins[environment as ApiEnvironment] || '', allowHttp);
    return { environment, origin, allowHttp, configurationError: undefined };
  } catch (error) {
    return { environment, origin: '', allowHttp: false, configurationError: error as ApiError };
  }
}

export function readApiConfiguration() {
  // Expo only inlines static dot-property references. Never put secrets in these public values.
  return resolveApiConfiguration({ isDevelopment: __DEV__,
    environment: process.env.EXPO_PUBLIC_APP_ENV,
    baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    developmentUrl: process.env.EXPO_PUBLIC_API_BASE_URL_DEVELOPMENT,
    stagingUrl: process.env.EXPO_PUBLIC_API_BASE_URL_STAGING,
    productionUrl: process.env.EXPO_PUBLIC_API_BASE_URL_PRODUCTION });
}
