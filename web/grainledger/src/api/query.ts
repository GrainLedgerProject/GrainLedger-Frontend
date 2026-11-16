/** Query parameters omitted from OpenAPI but confirmed by the backend handlers. */
export function withApiQuery(path: string, values?: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values ?? {})) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  return query.size ? `${path}?${query}` : path;
}
