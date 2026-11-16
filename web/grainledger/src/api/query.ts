/** Append query values, repeating array keys for endpoints that accept lists. */
export function withApiQuery(path: string, values?: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value))
      value.forEach((item) => query.append(key, String(item)));
    else query.set(key, String(value));
  }
  return query.size ? `${path}?${query}` : path;
}

export interface ApiPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
}
