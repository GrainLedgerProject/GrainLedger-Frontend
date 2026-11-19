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

/** Follow hasMore so catalog selectors and limit tables do not silently stop at page 1. */
export async function collectPages<T>(
  load: (
    query: Required<PageQuery>,
  ) => Promise<{ items: T[]; hasMore: boolean }>,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const result = await load({ page, pageSize: 100 });
    items.push(...result.items);
    if (!result.hasMore) return items;
    if (!result.items.length)
      throw new Error("Invalid pagination response: hasMore without items.");
  }
}

/** Accept paged responses and the legacy list format used by field lookups. */
export function pageItems<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === "object" && "items" in response && Array.isArray(response.items)) {
    return response.items as T[];
  }
  return [];
}
