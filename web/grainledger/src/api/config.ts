const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

/** API paths already include /api; the base URL is the backend origin. */
export function getApiUrl(endpoint: string): string {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${apiBaseUrl}${path}`;
}
